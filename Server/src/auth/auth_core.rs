use axum::{async_trait, extract::FromRequestParts, http::request::Parts};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};

use crate::errors::SorjordetError;

lazy_static! {
    static ref JWT_SECRET: String = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
}

const ISSUER: &str = "jwtauth/sorjordet.no";

#[derive(Serialize, Deserialize, Debug)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iss: String,
}

impl Claims {
    pub fn new(sub: String) -> Self {
        Claims {
            sub,
            exp: 10000000000,
            iss: ISSUER.to_string(),
        }
    }
}

pub fn generate_jwt(claims: &Claims) -> Result<String, SorjordetError> {
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET.as_bytes()),
    )
    .map_err(|_e| SorjordetError::InternalError("Kunne ikke generere JWT".to_string()))
}

/// defines how to extract the claims from the request
#[async_trait]
impl<B> FromRequestParts<B> for Claims
where
    B: Send + Sync,
{
    type Rejection = SorjordetError;

    async fn from_request_parts(parts: &mut Parts, b: &B) -> Result<Self, Self::Rejection> {
        // Extract the token from the authorization header
        let TypedHeader(Authorization(bearer)) =
            TypedHeader::<Authorization<Bearer>>::from_request_parts(parts, b)
                .await
                .map_err(|_| SorjordetError::AuthError)?;

        // Decode the user data
        let mut validation = Validation::new(Algorithm::HS256);
        validation.set_issuer(&[ISSUER]);

        let token_data = decode::<Claims>(
            bearer.token(),
            &DecodingKey::from_secret(JWT_SECRET.as_bytes()),
            &validation,
        )
        .map_err(|e| {
            tracing::error!("Authentication failed with error: {:?}", e);
            SorjordetError::AuthError
        })?;

        Ok(token_data.claims)
    }
}
