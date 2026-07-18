use axum::{
    self, Json as AxumJson, Router,
    extract::{self, State},
    response::IntoResponse,
    routing::get,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, query, query_as, query_scalar, types::Json as SqlxJson};
use std::collections::{HashMap, HashSet};
use ts_rs::TS;

use crate::auth::Claims;
use crate::errors::SorjordetError;

#[derive(Serialize, Deserialize, TS, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
#[ts(export)]
pub enum FieldEventValue {
    Int { value: f64 },
    UnitInt { value: f64, unit: String },
    Text { value: String },
}

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub struct FieldEvent {
    pub id: i32,
    pub time: DateTime<Utc>,
    pub field_id: i32,
    pub type_id: i32,
    pub type_name: String,
    pub note: Option<String>,
    pub values: HashMap<String, FieldEventValue>,
}

#[derive(FromRow)]
struct FieldEventRow {
    id: i32,
    time: DateTime<Utc>,
    field_id: i32,
    type_id: i32,
    type_name: String,
    note: Option<String>,
    values: SqlxJson<HashMap<String, FieldEventValue>>,
}

impl From<FieldEventRow> for FieldEvent {
    fn from(row: FieldEventRow) -> Self {
        FieldEvent {
            id: row.id,
            time: row.time,
            field_id: row.field_id,
            type_id: row.type_id,
            type_name: row.type_name,
            note: row.note,
            values: row.values.0,
        }
    }
}

struct FieldEventTypeFieldRow {
    name: String,
    value_kind: String,
    unit: Option<String>,
}

async fn validate_event_values(pool: &PgPool, payload: &FieldEvent) -> Result<(), SorjordetError> {
    let type_exists = query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM field_event_type WHERE id = $1) as \"exists!\"",
        payload.type_id
    )
    .fetch_one(pool)
    .await?;

    if !type_exists {
        return Err(SorjordetError::InvalidInput(format!(
            "field_event_type with id {} not found",
            payload.type_id
        )));
    }

    let fields: Vec<FieldEventTypeFieldRow> = query_as!(
        FieldEventTypeFieldRow,
        "SELECT name, value_kind, unit
         FROM field_event_type_field
         WHERE field_event_type_id = $1",
        payload.type_id
    )
    .fetch_all(pool)
    .await?;

    let allowed_fields: HashSet<&str> = fields.iter().map(|field| field.name.as_str()).collect();
    if let Some(unknown_field) = payload
        .values
        .keys()
        .find(|field_name| !allowed_fields.contains(field_name.as_str()))
    {
        return Err(SorjordetError::InvalidInput(format!(
            "{} is not a field on this field event type",
            unknown_field
        )));
    }

    for field in fields {
        let Some(value) = payload.values.get(&field.name) else {
            continue;
        };

        let is_valid = match (&field.value_kind[..], value) {
            ("int", FieldEventValue::Int { .. }) => true,
            ("text", FieldEventValue::Text { .. }) => true,
            ("unit_int", FieldEventValue::UnitInt { unit, .. }) => {
                field.unit.as_deref().unwrap_or_default() == unit
            }
            _ => false,
        };

        if !is_valid {
            return Err(SorjordetError::InvalidInput(format!(
                "{} has the wrong value kind for this field event type",
                field.name
            )));
        }
    }

    Ok(())
}

async fn get_all_events(State(pool): State<PgPool>) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<FieldEvent> = query_as!(
        FieldEventRow,
        r#"SELECT e.id, e.time, e.field_id, t.id as type_id, t.name as type_name, e.note, e.values as "values: SqlxJson<HashMap<String, FieldEventValue>>"
         FROM field_event e
         JOIN field_event_type t ON t.id = e.field_event_type_id
         ORDER BY e.time DESC"#,
    )
    .fetch_all(&pool)
    .await?
    .into_iter()
    .map(FieldEvent::from)
    .collect();

    Ok(AxumJson(result))
}

async fn get_events(
    State(pool): State<PgPool>,
    extract::Path(field_id): extract::Path<i32>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<FieldEvent> = query_as!(
        FieldEventRow,
        r#"SELECT e.id, e.time, e.field_id, t.id as type_id, t.name as type_name, e.note, e.values as "values: SqlxJson<HashMap<String, FieldEventValue>>"
         FROM field_event e
         JOIN field_event_type t ON t.id = e.field_event_type_id
         WHERE e.field_id = $1
         ORDER BY e.time DESC"#,
        field_id
    )
    .fetch_all(&pool)
    .await?
    .into_iter()
    .map(FieldEvent::from)
    .collect();

    Ok(AxumJson(result))
}

async fn post_event(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<FieldEvent>,
) -> Result<impl IntoResponse, SorjordetError> {
    validate_event_values(&pool, &payload).await?;

    let result = query_scalar!(
        "INSERT INTO field_event (time, field_id, field_event_type_id, note, values)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            ",
        &payload.time,
        &payload.field_id,
        &payload.type_id,
        payload.note.as_deref(),
        SqlxJson(&payload.values) as _
    )
    .fetch_one(&pool)
    .await?;

    tracing::info!("new field_event inserted by {}", claims.sub);

    Ok(AxumJson(result))
}

async fn patch_event(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(event_id): extract::Path<i32>,
    extract::Json(payload): extract::Json<FieldEvent>,
) -> Result<impl IntoResponse, SorjordetError> {
    validate_event_values(&pool, &payload).await?;

    let result = query!(
        r#"UPDATE field_event
                SET time = $1, field_id = $2, field_event_type_id = $3, note = $4, values = $5
                WHERE id = $6
            "#,
        &payload.time,
        &payload.field_id,
        &payload.type_id,
        payload.note.as_deref(),
        SqlxJson(&payload.values) as _,
        &event_id
    )
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        tracing::info!("field_event {} not found", event_id);
        return Err(SorjordetError::NotFound(format!(
            "field_event with id {} not found",
            event_id
        )));
    }

    tracing::info!("field_event {event_id} updated by {}", claims.sub);

    Ok(())
}

async fn delete_event(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(event_id): extract::Path<i32>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query!("DELETE FROM field_event WHERE id = $1", event_id)
        .execute(&pool)
        .await?;

    if result.rows_affected() == 0 {
        tracing::info!("field_event {} not found", event_id);
        return Err(SorjordetError::NotFound(format!(
            "field_event with id {} not found",
            event_id
        )));
    }

    tracing::info!("field_event {event_id} deleted by {}", claims.sub);

    Ok(())
}

pub fn field_event_router() -> Router<PgPool> {
    Router::new()
        .route("/", get(get_all_events).post(post_event))
        .route("/field/{field_id}", get(get_events))
        .route(
            "/{event_id}",
            axum::routing::patch(patch_event).delete(delete_event),
        )
}

#[cfg(test)]
mod tests {
    use super::FieldEventValue;

    #[test]
    fn numeric_field_event_values_accept_decimals() {
        let unit_value: FieldEventValue = serde_json::from_value(serde_json::json!({
            "kind": "unit_int",
            "value": 12.75,
            "unit": "kg/daa"
        }))
        .expect("decimal field event value should deserialize");

        match unit_value {
            FieldEventValue::UnitInt { value, unit } => {
                assert_eq!(value, 12.75);
                assert_eq!(unit, "kg/daa");
            }
            _ => panic!("expected a numeric field event value with a unit"),
        }

        let plain_value: FieldEventValue = serde_json::from_value(serde_json::json!({
            "kind": "int",
            "value": 3.5
        }))
        .expect("plain decimal field event value should deserialize");

        match plain_value {
            FieldEventValue::Int { value } => assert_eq!(value, 3.5),
            _ => panic!("expected a numeric field event value"),
        }
    }
}
