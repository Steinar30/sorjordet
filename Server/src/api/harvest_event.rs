use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::{get, patch, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{query, query_as, query_scalar, FromRow, PgPool};
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

#[derive(Deserialize, FromRow)]
struct HarvestAgg {
    type_id: i32,
    type_name: String,
    year: Option<i32>,
    month: Option<i32>,
    total: Option<i64>,
}

#[derive(Serialize, TS)]
#[ts(export)]
pub struct HarvestTimeseries {
    date: String,
    total: i64,
}

#[derive(Serialize, TS)]
#[ts(export)]
pub struct HarvestAggregated {
    type_id: i32,
    type_name: String,
    harvests: Vec<HarvestTimeseries>,
}

async fn get_aggregated_harvests(
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result: Vec<HarvestAgg> = query_as!(
        HarvestAgg,
        "WITH date_series AS (
        SELECT 
            generate_series(
            date_trunc('month', MIN(e.time)), 
            date_trunc('month', MAX(e.time)), 
            '1 month'::interval
            )::date AS month_start
        FROM 
            harvest_event AS e
        )
        SELECT 
        ht.id AS type_id, 
        ht.name AS type_name, 
        CAST(EXTRACT(YEAR FROM ds.month_start) AS INTEGER) AS year, 
        CAST(EXTRACT(MONTH FROM ds.month_start) AS INTEGER) AS month,
        COALESCE(SUM(e.value), 0) AS total
        FROM 
        harvest_type AS ht
        CROSS JOIN 
        date_series AS ds
        LEFT JOIN 
        harvest_event AS e 
            ON e.harvest_type_id = ht.id 
            AND date_trunc('month', e.time) = ds.month_start
        GROUP BY 
        ht.id, ht.name, ds.month_start
        ORDER BY 
        ds.month_start DESC, ht.id
"
    )
    .fetch_all(&pool)
    .await?;

    let mut result: Vec<HarvestAggregated> = result.into_iter().fold(Vec::new(), |mut acc, agg| {
        let matching = acc.iter_mut().find(|x| x.type_id == agg.type_id);
        if let Some(sametype) = matching {
            sametype.harvests.push(HarvestTimeseries {
                date: format!("{}-{}", agg.year.unwrap(), agg.month.unwrap()),
                total: agg.total.unwrap(),
            });
        } else {
            acc.push(HarvestAggregated {
                type_id: agg.type_id,
                type_name: agg.type_name,
                harvests: vec![HarvestTimeseries {
                    date: format!("{}-{}", agg.year.unwrap(), agg.month.unwrap()),
                    total: agg.total.unwrap(),
                }],
            });
        }
        acc
    });

    for event in result.iter_mut() {
        event.harvests.sort_by(|a, b| a.date.cmp(&b.date));
    }

    Ok(Json(result))
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

    tracing::info!("New harvest_event created by {}", claims.sub);

    Ok(Json(result))
}

async fn patch_event(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(event_id): extract::Path<i32>,
    extract::Json(payload): extract::Json<HarvestEvent>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query!(
        "UPDATE harvest_event
                SET value = $1, time = $2, harvest_type_id = $3
                WHERE id = $4
            ",
        &payload.value,
        &payload.time,
        &payload.type_id,
        &event_id
    )
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(SorjordetError::NotFound(format!(
            "harvest_event with id {} not found",
            event_id
        )));
    }

    tracing::info!("harvest_event {event_id} updated by {}", claims.sub);

    Ok(())
}

pub fn harvest_event_router() -> Router<PgPool> {
    Router::new()
        .route("/aggregated_harvests", get(get_aggregated_harvests))
        .route("/:field_id", get(get_events))
        .route("/:event_id", patch(patch_event))
        .route("/", post(post_event))
}
