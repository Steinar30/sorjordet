mod farm;
mod farm_field;
mod farm_field_group;
mod field_event;
mod harvest_event;
mod harvest_type;
mod users;

use crate::auth::login_user;
use axum::{routing::post, Router};
use farm::farm_router;
use farm_field::farm_field_router;
use farm_field_group::farm_field_group_router;
use field_event::field_event_router;
use harvest_event::harvest_event_router;
use harvest_type::harvest_type_router;
use sqlx::PgPool;

async fn fallback() -> impl axum::response::IntoResponse {
    (axum::http::StatusCode::NOT_FOUND, "Not Found")
}

pub async fn api_router(pg_pool: PgPool) -> Router {
    Router::new()
        .nest("/field_event", field_event_router())
        .nest("/harvest_type", harvest_type_router())
        .nest("/harvest_event", harvest_event_router())
        .nest("/farm_fields", farm_field_router())
        .nest("/farm_field_groups", farm_field_group_router())
        .nest("/farm", farm_router())
        .nest("/users", users::users_router())
        .nest("/auth", Router::new().route("/login", post(login_user)))
        .with_state(pg_pool)
        .fallback(fallback)
}
