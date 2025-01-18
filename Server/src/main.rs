pub mod api;
pub mod auth;
pub mod errors;

use api::api_router;
use axum::Router;
use lazy_static::lazy_static;
use sqlx::postgres::{PgConnectOptions, PgPool, PgPoolOptions};
use sqlx::ConnectOptions;
use std::env::var;
use tower_http::compression::CompressionLayer;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::timeout::TimeoutLayer;
use tracing::level_filters::LevelFilter;
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
        .with(
            tracing_subscriber::EnvFilter::from_env("RUST_LOG")
                .add_directive(LevelFilter::DEBUG.into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cors = CorsLayer::new().allow_origin(Any);

    let port: u16 = var("PORT")
        .map(|x| x.parse::<u16>().unwrap())
        .unwrap_or(8000);

    let db_connection_str = var("DATABASE_URL").expect("DATABASE_URL must be set");

    let options: PgConnectOptions = db_connection_str
        .parse::<PgConnectOptions>()
        .unwrap()
        .log_slow_statements(
            tracing::log::LevelFilter::Warn,
            std::time::Duration::from_secs(1),
        )
        .log_statements(tracing::log::LevelFilter::Trace);

    println!("Connecting to database: {}", options.get_host());

    let pool: PgPool = PgPoolOptions::new()
        .max_connections(5)
        .idle_timeout(Duration::from_secs(10))
        .acquire_timeout(Duration::from_secs(3))
        .connect_with(options)
        .await
        .expect("can't connect to database");

    let app = Router::new()
        .fallback_service(
            ServeDir::new("dist").not_found_service(ServeFile::new("dist/index.html")),
        )
        .nest("/api/", api_router(pool).await)
        .layer(cors)
        .layer(TimeoutLayer::new(core::time::Duration::new(2, 0)))
        .layer(CompressionLayer::new().br(true).gzip(true))
        .layer(TraceLayer::new_for_http());

    println!("Starting server on 0.0.0.0:{}", &port);

    // run it with hyper
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::debug!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
