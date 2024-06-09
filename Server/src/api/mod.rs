pub mod db_queries;
mod farm;
mod farm_field;
mod farm_field_group;
pub mod routes;

use crate::auth::{login_user, register_user};
use axum::{
    routing::post,
    Router,
};
use farm::farm_router;
use farm_field::farm_field_router;
use farm_field_group::farm_field_group_router;
use sqlx::PgPool;

pub async fn api_router(pg_pool: PgPool) -> Router {
    Router::new()
        .nest("/farm_fields", farm_field_router())
        .nest("/farm_field_groups", farm_field_group_router())
        .nest("/farm", farm_router())
        .nest(
            "/auth",
            Router::new()
                .route("/login", post(login_user))
                .route("/register", post(register_user)),
        )
        .with_state(pg_pool)
}
