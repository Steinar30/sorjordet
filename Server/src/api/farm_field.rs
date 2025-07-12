use axum::{
    self, Json, Router,
    extract::{self, State},
    response::IntoResponse,
    routing::{delete, get},
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, query};
use sqlx::{PgPool, query_as, query_scalar};
use ts_rs::TS;

use crate::auth::Claims;
use crate::errors::SorjordetError;

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct FarmField {
    pub id: i32,
    pub name: String,
    pub map_polygon_string: String,
    pub farm_id: i32,
    pub farm_field_group_id: Option<i32>,
}

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct FarmFieldMeta {
    pub id: i32,
    pub name: String,
    pub farm_id: i32,
}

async fn get_all_farm_fields(
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<FarmField> = query_as!(
        FarmField,
        "SELECT id, name, map_polygon_string, farm_field_group_id, farm_id
                FROM farm_field
            ORDER BY name
        "
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(result))
}

async fn get_farm_fields_meta(
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_as!(
        FarmFieldMeta,
        "SELECT id, name, farm_id FROM farm_field ORDER BY name"
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(result))
}

async fn get_farm_field_by_id(
    extract::Path(field_id): extract::Path<i32>,
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: FarmField = query_as!(
        FarmField,
        "SELECT id, name, map_polygon_string, farm_field_group_id, farm_id
                FROM farm_field WHERE farm_id = $1
            ",
        field_id
    )
    .fetch_one(&pool)
    .await?;

    Ok(Json(result))
}

async fn get_farm_field_by_group_id(
    extract::Path(group_id): extract::Path<i32>,
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<FarmField> = query_as!(
        FarmField,
        "SELECT id, name, map_polygon_string, farm_field_group_id, farm_id
                        FROM farm_field
                        WHERE farm_field_group_id = $1
                    ",
        group_id
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(result))
}

async fn post_farm_field(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<FarmField>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_scalar!(
        "INSERT INTO farm_field (name, farm_id, farm_field_group_id, map_polygon_string)
                VALUES ($1,$2,$3,$4)
                RETURNING id
            ",
        &payload.name,
        &payload.farm_id,
        payload.farm_field_group_id,
        &payload.map_polygon_string
    )
    .fetch_one(&pool)
    .await?;

    tracing::info!("new field inserted by {}", claims.sub);

    Ok(Json(result))
}

async fn patch_farm_field(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(field_id): extract::Path<i32>,
    extract::Json(payload): extract::Json<FarmField>,
) -> Result<impl IntoResponse, SorjordetError> {
    if payload.name == "" {
        return Err(SorjordetError::InvalidInput(
            "name must not be empty".to_string(),
        ));
    }
    let result = query!(
        "UPDATE farm_field
                SET name = $1, farm_field_group_id = $2, map_polygon_string = $3
                WHERE id = $4
            ",
        &payload.name,
        payload.farm_field_group_id,
        &payload.map_polygon_string,
        &field_id
    )
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        tracing::info!("field {} not found", field_id);
        return Err(SorjordetError::NotFound(format!(
            "field with id {} not found",
            field_id
        )));
    }

    tracing::info!("field {} updated by {}", field_id, claims.sub);

    Ok(())
}

async fn delete_farm_field(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(field_id): extract::Path<i32>,
) -> Result<impl IntoResponse, SorjordetError> {
    query!("DELETE FROM farm_field WHERE id = $1", field_id)
        .execute(&pool)
        .await?;

    tracing::info!("field {} inserted  by {}", field_id, claims.sub);

    Ok(())
}

pub fn farm_field_router() -> Router<PgPool> {
    Router::new()
        .route(
            "/{field_id}",
            delete(delete_farm_field)
                .get(get_farm_field_by_id)
                .patch(patch_farm_field),
        )
        .route("/group/{group_id}", get(get_farm_field_by_group_id))
        .route("/all", get(get_all_farm_fields))
        .route("/", get(get_farm_fields_meta).post(post_farm_field))
}
