use axum::{self, Router, routing::{get, post}, extract::{State, self}, response::{IntoResponse}, Json};
use sqlx::{PgPool, query_as, query_scalar};


use crate::api::types::*;

async fn simple_login_post(
    State(_pool): State<PgPool>, 
    extract::Json(payload): extract::Json<LoginRequest>) 
    -> Result<impl IntoResponse, SorjordetError> {
    
    tracing::info!("Login request from {}", payload.username);
    

    Ok(Json(""))
}

async fn get_farm_fields(
    extract::Path(farm_id) : extract::Path<i32>,
    State(pool): State<PgPool>) 
    -> Result<impl IntoResponse, SorjordetError>  {

    let result =
        query_as!(FarmField,
            "SELECT id, name, map_polygon_string, farm_field_group_id, farm_id
                FROM farm_field WHERE farm_id = $1
            ", farm_id
        )
        .fetch_all(&pool)
        .await?;
    
    Ok(Json(result))
    
}

async fn post_farm_field(
    State(pool): State<PgPool>, 
    extract::Json(payload): extract::Json<FarmField>) 
    -> Result<impl IntoResponse, SorjordetError> {
    
    let result = 
        query_scalar!(
            "INSERT INTO farm_field (name, farm_id, farm_field_group_id, map_polygon_string)
                VALUES ($1,$2,$3,$4)
                RETURNING id
            ", &payload.name ,&payload.farm_id , payload.farm_field_group_id ,&payload.map_polygon_string
        )
        .fetch_one(&pool)
        .await?;


    Ok(Json(result))
}


pub async fn api_router(pg_pool: PgPool) -> Router {
    
    Router::new()
        .route("/farm_fields/:id", get(get_farm_fields).post(post_farm_field))
        .route("/login", post(simple_login_post))
        .with_state(pg_pool)
}

