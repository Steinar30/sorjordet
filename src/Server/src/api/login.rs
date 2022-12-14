use axum::{self, Router, routing::{get, post}, extract::{State, self}, response::{IntoResponse}, Json};
use sqlx::{PgPool, query_as, query_scalar};
use argon2::{
    password_hash::PasswordHash,
    Argon2, PasswordHasher
};
use rand::Rng;

use crate::api::types::*;

pub fn hash_password(password: &str) -> Result<String, SorjordetError> {
    let salt : [u8; 32] = rand::random();

    let config = Argon2::default();
    let hash = config.hash_password(password.as_bytes(), &salt).map_err(|_|SorjordetError::AuthError)?.to_string();
    
    Ok(hash)
}


impl User {
    pub fn create(user: LoginRequest) -> Result<Self, SorjordetError> {
    
        
        let mut newUser = 
            User {
                id: -1,
                name: user.username,

            };
    }
}

async fn register_user(
    State(_pool): State<PgPool>, 
    extract::Json(payload): extract::Json<LoginRequest>) -> Result<impl IntoResponse, SorjordetError> {
    
    tracing::info!("Login request from {}", payload.username);
    

    Ok(Json(""))
}

async fn simple_login_post(
    State(_pool): State<PgPool>, 
    extract::Json(payload): extract::Json<LoginRequest>) -> Result<impl IntoResponse, SorjordetError> {
    
    tracing::info!("Login request from {}", payload.username);
    

    Ok(Json(""))
}

