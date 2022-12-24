use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordVerifier, SaltString},
    Argon2, PasswordHasher,
};
use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    Json,
};
use lazy_static::lazy_static;
use sqlx::{query_as, query_scalar, PgPool};
lazy_static! {
    static ref PW_SECRET: String = std::env::var("PW_SECRET").expect("PW_SECRET must be set");
}

use crate::api::{auth::{generate_jwt, Claims}, types::*};


pub fn hash_password(password: &str) -> Result<String, SorjordetError> {
    let salt = SaltString::generate(&mut OsRng);

    let config = Argon2::new_with_secret(
        PW_SECRET.as_bytes(),
        argon2::Algorithm::Argon2id,
        argon2::Version::default(),
        argon2::Params::default(),
    )
    .map_err(|_| SorjordetError::InternalError("Noe gikk galt.".to_string()))?;

    let hash = config
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| SorjordetError::AuthError)?
        .to_string();

    Ok(hash)
}

pub fn verify_password(password: &str, password_hash: &str) -> Result<(), SorjordetError> {
    let parsed_hash = PasswordHash::new(password_hash).map_err(|_| SorjordetError::AuthError)?;

    let config = Argon2::new_with_secret(
        PW_SECRET.as_bytes(),
        argon2::Algorithm::Argon2id,
        argon2::Version::default(),
        argon2::Params::default(),
    )
    .map_err(|_| SorjordetError::InternalError("Noe gikk galt.".to_string()))?;

    config
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| SorjordetError::AuthError)
}

impl User {
    pub fn new(user: LoginRequest) -> Result<Self, SorjordetError> {
        let salt = SaltString::generate(&mut OsRng);
        Ok(User {
            id: -1,
            name: user.username,
            password: hash_password(&user.password)?,
            email: salt.to_string(),
        })
    }
}

/// Function for registering new users.
/// Requires authentication, and takes a body of form loginrequest.
pub async fn register_user(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<LoginRequest>,
) -> Result<impl IntoResponse, SorjordetError> {
    let mut user = User::new(payload)?;

    let now = chrono::Utc::now().naive_utc();

    let result = query_scalar!(
        "INSERT INTO user_info (name,password,email,created_on)
                VALUES ($1,$2,$3,$4)
                RETURNING id
            ",
        &user.name,
        &user.password,
        &user.email,
        now
    )
    .fetch_one(&pool)
    .await?;

    user.id = result;

    log::info!("Created new user. Inserted by {}", claims.sub);

    Ok(Json(user))
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

            let jwt = generate_jwt(&(
                Claims::new(u.name)
            ))?;

            let json = Json(LoginResponse {
                result: true,
                message: "".to_string(),
                token: jwt,
            });

            Ok(json)
        }
        None => Err(SorjordetError::NotFound(
            "Kunne ikke logge inn, brukernavn eller passord er feil.".to_string(),
        )),
    }
}
