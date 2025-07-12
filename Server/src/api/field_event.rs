use axum::{
    self, Json, Router,
    extract::{self, State},
    response::IntoResponse,
    routing::{get, post},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, query, query_as, query_scalar};
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
                ORDER BY time DESC
            ",
        field_id
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(result))
}

async fn post_event(
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

    tracing::info!("new field_event inserted by {}", claims.sub);

    Ok(Json(result))
}

async fn patch_event(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(event_id): extract::Path<i32>,
    extract::Json(payload): extract::Json<FieldEvent>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query!(
        "UPDATE field_event
                SET time = $1, field_id = $2, event_name = $3, description = $4
                WHERE id = $5
            ",
        &payload.time,
        &payload.field_id,
        &payload.event_name,
        &payload.description.unwrap_or_default(),
        &event_id
    )
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        tracing::info!("field_event {} not found", event_id);
        return Err(SorjordetError::NotFound(format!(
            "field_event with id {} not found",
            event_id
        )));
    }

    tracing::info!("field_event {event_id} updated by {}", claims.sub);

    Ok(())
}

pub fn field_event_router() -> Router<PgPool> {
    Router::new()
        .route("/{field_id}", get(get_events).patch(patch_event))
        .route("/", post(post_event))
}
