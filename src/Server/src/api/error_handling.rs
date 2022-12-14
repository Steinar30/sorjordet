
use crate::api::types::*;

use axum::{self, Error, response::{Response, IntoResponse}, http::StatusCode};

impl IntoResponse for SorjordetError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            SorjordetError::NotFound(x) => {
                (StatusCode::NOT_FOUND, x)
            }
            SorjordetError::InvalidInput(x) => {
                (StatusCode::UNPROCESSABLE_ENTITY, x)
            }
            SorjordetError::InternalError(x) => {
                (StatusCode::INTERNAL_SERVER_ERROR, x)
            }
            SorjordetError::DBError => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Noe gikk galt".to_string())
            }
            SorjordetError::AuthError => {
                (StatusCode::UNAUTHORIZED, "Du har ikke tilgang til dette".to_string())
            }
        };

        (status, error_message).into_response()
    }
}


impl From<Error> for SorjordetError {
    fn from(err: axum::Error) -> Self {
        SorjordetError::InternalError(err.to_string())
    }
}
impl From<sqlx::Error> for SorjordetError {
    fn from(_err: sqlx::Error) -> Self {
        SorjordetError::DBError
    }
}
