use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{query, query_as, FromRow, PgPool};
use ts_rs::TS;

use crate::{
    auth::{generate_jwt, verify_password, Claims},
    errors::SorjordetError,
};

use super::hash_password;

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct User {
    pub id: i32,
    pub name: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub email: String,
}

#[derive(Deserialize, TS)]
#[ts(export)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize, TS)]
#[ts(export)]
pub struct LoginResponse {
    pub result: bool,
    pub message: String,
    pub token: String,
}

impl User {
    pub fn new(username: &str, password: &str, email: &str) -> Result<Self, SorjordetError> {
        Ok(User {
            id: -1,
            name: username.to_string(),
            password: hash_password(password)?,
            email: email.to_string(),
        })
    }
}

/// Function for logging in users.
/// Requires method post and a LoginRequest body.
pub async fn login_user(
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<LoginRequest>,
) -> Result<impl IntoResponse, SorjordetError> {
    tracing::info!("Login request from {}", payload.username);

    let db_user = query_as!(
        User,
        "SELECT id, name, password, email
                FROM user_info WHERE name LIKE $1
            ",
        payload.username
    )
    .fetch_optional(&pool)
    .await?;

    match db_user {
        Some(u) => {
            verify_password(&payload.password, &u.password)?;

            let jwt = generate_jwt(&(Claims::new(u.name)))?;

            let json = Json(LoginResponse {
                result: true,
                message: "".to_string(),
                token: jwt,
            });

            tracing::info!("User {} logged in", payload.username);
            query!(
                "UPDATE user_info SET last_login = NOW() WHERE id = $1",
                u.id
            )
            .execute(&pool)
            .await?;

            Ok(json)
        }
        None => {
            tracing::info!("User {} not found", payload.username);
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            Err(SorjordetError::NotFound(
                "Failed to login, username or password is incorrect.".to_string(),
            ))
        }
    }
}
