use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, query_as, query_scalar, PgPool};
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
    let result: Vec<HarvestType> = query_as!(
        HarvestType,
        "SELECT id, name FROM harvest_type"
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(result))
}

async fn post_types(
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

pub fn harvest_type_router() -> Router<PgPool> {
    Router::new()
    .route("/", get(get_types).post(post_types))
}
