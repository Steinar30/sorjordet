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
pub struct HarvestEvent {
    pub id: i32,
    pub value: i32,
    pub time: DateTime<Utc>,
    pub field_id: i32,
    pub type_name: String,
    pub type_id: i32,
}

async fn get_events(
    State(pool): State<PgPool>,
    extract::Path(field_id): extract::Path<i32>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<HarvestEvent> = query_as!(
        HarvestEvent,
        "SELECT e.id, value, time, field_id, h.name as type_name, h.id as type_id
                FROM harvest_event AS e JOIN harvest_type AS h ON e.harvest_type_id = h.id
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
    extract::Json(payload): extract::Json<HarvestEvent>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_scalar!(
        "INSERT INTO harvest_event (value, time, field_id, harvest_type_id)
                VALUES ($1,$2, $3, $4)
                RETURNING id
            ",
        &payload.value,
        &payload.time,
        &payload.field_id,
        &payload.type_id
    )
    .fetch_one(&pool)
    .await?;

    log::info!("new harvest_event inserted by {}", claims.sub);

    Ok(Json(result))
}

pub fn harvest_event_router() -> Router<PgPool> {
    Router::new().route("/", get(get_events).post(post_events))
}
