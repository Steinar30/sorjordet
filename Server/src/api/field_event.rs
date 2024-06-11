use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{query_as, query_scalar, FromRow, PgPool};
use ts_rs::TS;

use crate::auth::Claims;
use crate::errors::SorjordetError;

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct FieldEvent {
    pub id: i32,
    pub time: DateTime<Utc>,
    pub field_id: i32,
    pub event_name: String,
    pub description: Option<String>,
}

async fn get_events(
    State(pool): State<PgPool>,
    extract::Path(field_id): extract::Path<i32>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<FieldEvent> = query_as!(
        FieldEvent,
        "SELECT id, time, field_id, event_name, description 
                FROM field_event
                WHERE field_id = $1
            ",
        field_id
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(result))
}

async fn post_events(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<FieldEvent>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_scalar!(
        "INSERT INTO field_event (time, field_id, event_name, description)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            ",
        &payload.time,
        &payload.field_id,
        &payload.event_name,
        &payload.description.unwrap_or_default()
    )
    .fetch_one(&pool)
    .await?;

    log::info!("new field_event inserted by {}", claims.sub);

    Ok(Json(result))
}

pub fn field_event_router() -> Router<PgPool> {
    Router::new().route("/", get(get_events).post(post_events))
}
