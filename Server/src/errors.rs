use axum::{
    self,
    http::StatusCode,
    response::{IntoResponse, Response},
};

pub enum SorjordetError {
    AuthError,
    DBError,
    NotFound(String),
    InvalidInput(String),
    InternalError(String),
}

impl IntoResponse for SorjordetError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            SorjordetError::NotFound(x) => (StatusCode::NOT_FOUND, x),
            SorjordetError::InvalidInput(x) => (StatusCode::UNPROCESSABLE_ENTITY, x),
            SorjordetError::InternalError(x) => (StatusCode::INTERNAL_SERVER_ERROR, x),
            SorjordetError::DBError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Noe gikk galt".to_string(),
            ),
            SorjordetError::AuthError => (
                StatusCode::UNAUTHORIZED,
                "Du har ikke tilgang til dette".to_string(),
            ),
        };

        (status, error_message).into_response()
    }
}

impl From<axum::Error> for SorjordetError {
    fn from(err: axum::Error) -> Self {
        SorjordetError::InternalError(err.to_string())
    }
}
impl From<sqlx::Error> for SorjordetError {
    fn from(err: sqlx::Error) -> Self {
        tracing::error!("DBError: {:?}", err);
        SorjordetError::DBError
    }
}
