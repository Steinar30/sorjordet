use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{query_as, query_scalar, PgPool};
use sqlx::FromRow;
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
    pub farm_field_group_id: Option<i32>,
}

async fn get_farm_fields_meta(State(pool): State<PgPool>) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_as!(
        FarmFieldMeta,
        "SELECT id, name, farm_field_group_id, farm_id
                FROM farm_field
            "
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

    log::info!("new field inserted by {}", claims.sub);

    Ok(Json(result))
}

pub fn farm_field_router() -> Router<PgPool> {
    Router::new()
        .route("/:field_id", get(get_farm_field_by_id))
        .route("/group/:group_id", get(get_farm_field_by_group_id))
        .route("/", get(get_farm_fields_meta).post(post_farm_field))
}
