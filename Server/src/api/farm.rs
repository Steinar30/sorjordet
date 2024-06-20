use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use sqlx::{query_as, query_scalar, PgPool};
use ts_rs::TS;

use crate::auth::Claims;
use crate::errors::SorjordetError;

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct Farm {
    pub id: i32,
    pub name: String,
    pub farm_coordinates: String,
}

async fn get_farms(State(pool): State<PgPool>) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<Farm> = query_as!(
        Farm,
        "SELECT id, name, farm_coordinates
                FROM farm
            "
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(result))
}

async fn post_farm(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<Farm>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_scalar!(
        "INSERT INTO farm (name, farm_coordinates)
                VALUES ($1,$2)
                RETURNING id
            ",
        &payload.name,
        &payload.farm_coordinates
    )
    .fetch_one(&pool)
    .await?;

    tracing::info!("new farm inserted by {}", claims.sub);

    Ok(Json(result))
}

pub fn farm_router() -> Router<PgPool> {
    Router::new()
    .route("/", get(get_farms).post(post_farm))
}
