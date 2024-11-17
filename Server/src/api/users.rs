use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::{get, patch},
    Json, Router,
};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use sqlx::{query, query_as, query_scalar, FromRow, PgPool};
use ts_rs::TS;

use crate::{
    auth::{hash_password, Claims, User},
    errors::SorjordetError,
};
lazy_static! {
    static ref PW_SECRET: String = std::env::var("PW_SECRET").expect("PW_SECRET must be set");
}

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct UserInfo {
    pub id: i32,
    pub name: String,
    pub email: String,
}

/// Function for registering new users.
pub async fn create_user(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<User>,
) -> Result<impl IntoResponse, SorjordetError> {
    if payload.id != -1 {
        return Err(SorjordetError::InvalidInput(
            "User already exists".to_string(),
        ));
    }
    let hashed = hash_password(&payload.password)?;
    let now = chrono::Utc::now().naive_utc();

    let result = query_scalar!(
        "INSERT INTO user_info (name,password,email,created_on)
                VALUES ($1,$2,$3,$4)
                RETURNING id
            ",
        &payload.name,
        &hashed,
        &payload.email,
        now
    )
    .fetch_one(&pool)
    .await?;

    tracing::info!("Created new user. Inserted by {}", claims.sub);

    let user = UserInfo {
        id: result,
        name: payload.name,
        email: payload.email,
    };

    Ok(Json(user))
}

async fn get_users(
    claims: Claims,
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<UserInfo> = query_as!(UserInfo, "SELECT id, name, email FROM user_info")
        .fetch_all(&pool)
        .await?;

    tracing::info!("Get all users by {}", claims.sub);

    Ok(Json(result))
}

async fn patch_user(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(user_id): extract::Path<i32>,
    extract::Json(payload): extract::Json<UserInfo>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query!(
        "UPDATE user_info
                SET name = $1, email = $2
                WHERE id = $3
            ",
        &payload.name,
        &payload.email,
        user_id
    )
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(SorjordetError::NotFound(format!(
            "user with id {} not found",
            user_id
        )));
    }

    tracing::info!("user {} updated by {}", user_id, claims.sub);

    Ok(())
}

pub fn users_router() -> Router<PgPool> {
    Router::new()
        .route("/:user_id", patch(patch_user))
        .route("/", get(get_users).post(create_user))
}
