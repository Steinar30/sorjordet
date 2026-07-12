use axum::{
    self, Json, Router,
    extract::{self, State},
    response::IntoResponse,
    routing::{get, patch},
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, query, query_as, query_scalar};
use ts_rs::TS;

use crate::auth::Claims;
use crate::errors::SorjordetError;

#[derive(Serialize, Deserialize, TS, Clone)]
#[serde(rename_all = "snake_case")]
#[ts(export)]
pub enum FieldEventValueKind {
    Int,
    UnitInt,
    Text,
}

impl FieldEventValueKind {
    pub fn as_db_value(&self) -> &'static str {
        match self {
            FieldEventValueKind::Int => "int",
            FieldEventValueKind::UnitInt => "unit_int",
            FieldEventValueKind::Text => "text",
        }
    }
}

#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub struct FieldEventTypeField {
    pub id: i32,
    pub name: String,
    pub value_kind: FieldEventValueKind,
    pub unit: Option<String>,
}

#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub struct FieldEventType {
    pub id: i32,
    pub name: String,
    pub fields: Vec<FieldEventTypeField>,
}

#[derive(FromRow)]
struct FieldEventTypeRow {
    id: i32,
    name: String,
}

#[derive(FromRow)]
struct FieldEventTypeFieldRow {
    id: i32,
    field_event_type_id: i32,
    name: String,
    value_kind: String,
    unit: Option<String>,
}

impl TryFrom<FieldEventTypeFieldRow> for FieldEventTypeField {
    type Error = SorjordetError;

    fn try_from(row: FieldEventTypeFieldRow) -> Result<Self, Self::Error> {
        let value_kind = match row.value_kind.as_str() {
            "int" => FieldEventValueKind::Int,
            "unit_int" => FieldEventValueKind::UnitInt,
            "text" => FieldEventValueKind::Text,
            kind => {
                return Err(SorjordetError::InternalError(format!(
                    "Unsupported field event value kind: {kind}",
                )));
            }
        };

        Ok(FieldEventTypeField {
            id: row.id,
            name: row.name,
            value_kind,
            unit: row.unit,
        })
    }
}

async fn get_types(State(pool): State<PgPool>) -> Result<impl IntoResponse, SorjordetError> {
    let type_rows: Vec<FieldEventTypeRow> = query_as!(
        FieldEventTypeRow,
        "SELECT id, name FROM field_event_type ORDER BY name"
    )
    .fetch_all(&pool)
    .await?;

    let field_rows: Vec<FieldEventTypeFieldRow> = query_as!(
        FieldEventTypeFieldRow,
        "SELECT id, field_event_type_id, name, value_kind, unit
         FROM field_event_type_field
         ORDER BY id"
    )
    .fetch_all(&pool)
    .await?;

    let mut types: Vec<FieldEventType> = type_rows
        .into_iter()
        .map(|row| FieldEventType {
            id: row.id,
            name: row.name,
            fields: Vec::new(),
        })
        .collect();

    for row in field_rows {
        if let Some(event_type) = types.iter_mut().find(|t| t.id == row.field_event_type_id) {
            event_type.fields.push(row.try_into()?);
        }
    }

    Ok(Json(types))
}

async fn insert_type_fields(
    pool: &PgPool,
    type_id: i32,
    fields: &[FieldEventTypeField],
) -> Result<(), SorjordetError> {
    for field in fields {
        query!(
            "INSERT INTO field_event_type_field (field_event_type_id, name, value_kind, unit)
             VALUES ($1, $2, $3, $4)",
            type_id,
            field.name.trim(),
            field.value_kind.as_db_value(),
            field.unit.as_ref().map(|unit| unit.trim())
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

async fn post_type(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<FieldEventType>,
) -> Result<impl IntoResponse, SorjordetError> {
    let type_id = query_scalar!(
        "INSERT INTO field_event_type (name)
         VALUES ($1)
         RETURNING id",
        payload.name.trim()
    )
    .fetch_one(&pool)
    .await?;

    insert_type_fields(&pool, type_id, &payload.fields).await?;

    tracing::info!("new field_event_type inserted by {}", claims.sub);

    Ok(Json(type_id))
}

async fn patch_type(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(type_id): extract::Path<i32>,
    extract::Json(payload): extract::Json<FieldEventType>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query!(
        "UPDATE field_event_type
         SET name = $1
         WHERE id = $2",
        payload.name.trim(),
        type_id
    )
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(SorjordetError::NotFound(format!(
            "field_event_type with id {} not found",
            type_id
        )));
    }

    query!(
        "DELETE FROM field_event_type_field WHERE field_event_type_id = $1",
        type_id
    )
    .execute(&pool)
    .await?;
    insert_type_fields(&pool, type_id, &payload.fields).await?;

    tracing::info!("field_event_type {type_id} updated by {}", claims.sub);

    Ok(())
}

async fn delete_type(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(type_id): extract::Path<i32>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query!("DELETE FROM field_event_type WHERE id = $1", type_id)
        .execute(&pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(SorjordetError::NotFound(format!(
            "field_event_type with id {} not found",
            type_id
        )));
    }

    tracing::info!("field_event_type {type_id} deleted by {}", claims.sub);

    Ok(())
}

pub fn field_event_type_router() -> Router<PgPool> {
    Router::new()
        .route("/", get(get_types).post(post_type))
        .route("/{type_id}", patch(patch_type).delete(delete_type))
}
