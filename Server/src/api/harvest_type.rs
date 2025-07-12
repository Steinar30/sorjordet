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

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct HarvestType {
    pub id: i32,
    pub name: String,
}

async fn get_types(State(pool): State<PgPool>) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<HarvestType> = query_as!(HarvestType, "SELECT id, name FROM harvest_type")
        .fetch_all(&pool)
        .await?;

    Ok(Json(result))
}

async fn post_type(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<HarvestType>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_scalar!(
        "INSERT INTO harvest_type (name)
                VALUES ($1)
                RETURNING id
            ",
        &payload.name
    )
    .fetch_one(&pool)
    .await?;

    tracing::info!("new harvest_type inserted by {}", claims.sub);

    Ok(Json(result))
}

async fn patch_type(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(type_id): extract::Path<i32>,
    extract::Json(payload): extract::Json<HarvestType>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query!(
        "UPDATE harvest_type
                SET name = $1
                WHERE id = $2
            ",
        &payload.name,
        &type_id
    )
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        tracing::info!("harvest_type {} not found", type_id);
        return Err(SorjordetError::NotFound(format!(
            "harvest_type with id {} not found",
            type_id
        )));
    }

    tracing::info!("harvest_type {type_id} updated by {}", claims.sub);

    Ok(())
}

pub fn harvest_type_router() -> Router<PgPool> {
    Router::new()
        .route("/{type_id}", patch(patch_type))
        .route("/", get(get_types).post(post_type))
}
