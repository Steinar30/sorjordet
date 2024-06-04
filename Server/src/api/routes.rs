use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use sqlx::{query_scalar, PgPool};

use crate::api::db_queries::*;
use crate::api::types::*;

use super::{auth::Claims, login};

async fn get_farm_fields(State(pool): State<PgPool>) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_all_farm_fields(&pool).await?;

    Ok(Json(result))
}

async fn get_farm_field_by_id(
    extract::Path(field_id): extract::Path<i32>,
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: FarmField = query_by_id_farm_field(field_id, &pool).await?;

    Ok(Json(result))
}


async fn get_farm_field_by_group_id(
    extract::Path(group_id): extract::Path<i32>,
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<FarmField> = query_farm_fields_in_group(group_id, &pool).await?;

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

async fn get_farm_field_groups(
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_all_farm_field_groups(&pool).await?;

    Ok(Json(result))
}

async fn post_farm_field_group(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<FarmFieldGroup>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_scalar!(
        "INSERT INTO farm_field_group (name, farm_id, draw_color)
                VALUES ($1,$2, $3)
                RETURNING id
            ",
        &payload.name,
        &payload.farm_id,
        &payload.draw_color
    )
    .fetch_one(&pool)
    .await?;

    log::info!("new field_group inserted by {}", claims.sub);

    Ok(Json(result))
}

async fn get_farms(State(pool): State<PgPool>) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_all_farms(&pool).await?;

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

    log::info!("new farm inserted by {}", claims.sub);

    Ok(Json(result))
}

pub async fn api_router(pg_pool: PgPool) -> Router {
    Router::new()
        .route("/farm_fields/:field_id", get(get_farm_field_by_id))
        .route("/farm_fields/group/:group_id", get(get_farm_field_by_group_id))
        .route(
            "/farm_field_groups",
            post(post_farm_field_group).get(get_farm_field_groups),
        )
        .route("/farm_fields", get(get_farm_fields).post(post_farm_field))
        .route("/farm", get(get_farms).post(post_farm))
        .nest(
            "/auth",
            Router::new()
                .route("/login", post(login::login_user))
                .route("/register", post(login::register_user)),
        )
        .with_state(pg_pool)
}
