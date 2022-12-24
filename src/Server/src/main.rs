pub mod api;

use axum::Router;
use axum_extra::routing::SpaRouter;
use lazy_static::lazy_static;
use sqlx::postgres::{PgPool, PgPoolOptions};
use tower_http::compression::CompressionLayer;
use tower_http::timeout::TimeoutLayer;
use std::env::var;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use std::{net::SocketAddr, time::Duration};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

lazy_static! {
    static ref JWT_SECRET: String = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "logging=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cors = CorsLayer::new().allow_origin(Any);

    let port: u16 = var("PORT")
        .map(|x| x.parse::<u16>().unwrap())
        .unwrap_or(8000);

    let db_connection_str = var("DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://postgres:Demo123123@host.docker.internal:54321/sorjordet".to_string()
    });

    let pool: PgPool = PgPoolOptions::new()
        .max_connections(5)
        .idle_timeout(Duration::from_secs(10))
        .acquire_timeout(Duration::from_secs(3))
        .connect(&db_connection_str)
        .await
        .expect("can't connect to database");

    let spa = SpaRouter::new("/assets", "./dist/assets").index_file("../index.html");

    // build our application with some routes
    let app = Router::new()
        .nest("/api/", api::routes::api_router(pool).await)
        .merge(spa)
        .layer(cors)
        .layer(TimeoutLayer::new(core::time::Duration::new(2,0)))
        .layer(CompressionLayer::new().br(true).gzip(true))
        .layer(TraceLayer::new_for_http());

    println!("Starting server on 0.0.0.0:{}", &port);

    // run it with hyper
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::debug!("listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
