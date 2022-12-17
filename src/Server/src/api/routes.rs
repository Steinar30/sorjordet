use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use sqlx::{query_as, query_scalar, PgPool};

use crate::api::types::*;

use super::{auth::Claims, login};

async fn get_farm_fields(State(pool): State<PgPool>) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_as!(
        FarmField,
        "SELECT id, name, map_polygon_string, farm_field_group_id, farm_id
                FROM farm_field
            "
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(result))
}

async fn get_farm_field_by_id(
    extract::Path(farm_id): extract::Path<i32>,
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: FarmField = query_as!(
        FarmField,
        "SELECT id, name, map_polygon_string, farm_field_group_id, farm_id
                FROM farm_field WHERE farm_id = $1
            ",
        farm_id
    )
    .fetch_one(&pool)
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

    tracing::info!("new field inserted by {}", claims.username);

    Ok(Json(result))
}


pub async fn api_router(pg_pool: PgPool) -> Router {
    Router::new()
        .route("/farm_fields/:id", get(get_farm_field_by_id))
        .route("/farm_field_groups", post(post_farm_field_group))
        .route("/farm_fields", get(get_farm_fields).post(post_farm_field))
        .nest(
            "/auth",
            Router::new()
                .route("/login", post(login::login_user))
                .route("/register", post(login::register_user)),
        )
        .with_state(pg_pool)
}
