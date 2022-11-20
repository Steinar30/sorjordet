use std::{env::var};
use actix_web::{middleware::Logger, web, App, HttpServer};
use actix_web_lab::web::spa;
use tracing::info;


#[actix_web::main]
async fn main() -> std::io::Result<()> {

    env_logger::init_from_env(env_logger::Env::new().default_filter_or("debug"));

    let port = var("PORT").unwrap_or_else(|_| "8000".to_string()).parse::<u16>().unwrap();
    
    let bind = ("0.0.0.0", port);
    info!("staring server at http://{}:{}", &bind.0, &bind.1);
    
    HttpServer::new(|| {
        App::new()
        .wrap(Logger::default().log_target("@"))
        .route(
            "/api/fields",
                web::to(|| async {
                    "/api/fields"
                }),
        )
        .service(
            spa()
                .index_file("./dist/index.html")
                .static_resources_mount("/")
                .static_resources_location("./dist")
                .finish(),
        )
    })
    .workers(1)
    .bind(bind)?
    .run()
    .await
}
