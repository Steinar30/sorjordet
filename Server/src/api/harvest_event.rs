use std::collections::HashMap;

use axum::{
    self, Json, Router,
    extract::{self, Query, State},
    response::IntoResponse,
    routing::{get, post},
};
use chrono::{DateTime, Datelike, Days, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, query, query_as, query_scalar};
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

#[derive(Serialize, TS)]
#[ts(export)]
pub struct HarvestTimeseries {
    date: String,
    total: i64,
}

impl From<&HarvestTimeseriesRaw> for HarvestTimeseries {
    fn from(row: &HarvestTimeseriesRaw) -> Self {
        HarvestTimeseries {
            total: row.value.unwrap_or(0),
            date: format!("{}-{}", row.time_month.year(), row.time_month.month()),
        }
    }
}

#[derive(Serialize, TS)]
#[ts(export)]
pub struct HarvestAggregated {
    type_id: i32,
    type_name: String,
    harvests: Vec<HarvestTimeseries>,
}

impl From<HarvestTimeseriesRaw> for HarvestAggregated {
    fn from(row: HarvestTimeseriesRaw) -> Self {
        HarvestAggregated {
            harvests: vec![HarvestTimeseries::from(&row)],
            type_id: row.id,
            type_name: row.name,
        }
    }
}

#[derive(Deserialize, FromRow, Serialize, TS)]
#[ts(export)]
pub struct GroupHarvestAgg {
    group_id: i32,
    group_name: String,
    group_color: String,
    value: i64,
}

#[derive(Deserialize, FromRow)]
struct HarvestTimeseriesRaw {
    id: i32,
    name: String,
    value: Option<i64>,
    time_month: DateTime<Utc>,
}

#[derive(Deserialize, Default)]
pub struct HarvestAggParams {
    from: Option<DateTime<Utc>>,
    to: Option<DateTime<Utc>>,
}

impl HarvestAggParams {
    fn get_from_to(self: &Self) -> (DateTime<Utc>, DateTime<Utc>) {
        let to = self
            .to
            .unwrap_or(chrono::Utc::now().checked_add_days(Days::new(1)).unwrap());
        let from = self.from.unwrap_or(to - chrono::Months::new(5 * 12));
        (from, to)
    }
}

async fn get_aggregated_harvests(
    State(pool): State<PgPool>,
    harvest_params: Query<HarvestAggParams>,
) -> Result<impl IntoResponse, SorjordetError> {
    let (from, to) = harvest_params.get_from_to();

    let timeseries: Vec<HarvestTimeseriesRaw> = query_as!(
        HarvestTimeseriesRaw,
        r#"
        SELECT t.id, t.name, SUM(value) as value, DATE_TRUNC('month', time) as "time_month!" FROM
        harvest_event e JOIN harvest_type t ON  t.id=e.harvest_type_id
        WHERE time BETWEEN $1 AND $2
        GROUP BY t.id, 4
        ORDER BY 4
    "#,
        from,
        to
    )
    .fetch_all(&pool)
    .await?;

    let results: Vec<HarvestAggregated> = timeseries
        .into_iter()
        .fold(HashMap::<i32, HarvestAggregated>::new(), |mut m, row| {
            if let Some(x) = m.get_mut(&row.id) {
                x.harvests.push(HarvestTimeseries::from(&row));
            } else {
                m.insert(row.id, HarvestAggregated::from(row));
            }
            m
        })
        .into_values()
        .collect();

    Ok(Json(results))
}

async fn get_agged_group_harvests(
    State(pool): State<PgPool>,
    harvest_params: Query<HarvestAggParams>,
) -> Result<impl IntoResponse, SorjordetError> {
    let (from, to) = harvest_params.get_from_to();

    let timeseries: Vec<GroupHarvestAgg> = query_as!(
        GroupHarvestAgg,
        r#"
        SELECT coalesce(SUM(value), 0) as "value!", g.id as group_id, g.name as group_name, g.draw_color as group_color FROM
        harvest_event e JOIN farm_field f ON  f.id = e.field_id
        JOIN farm_field_group g ON g.id = f.farm_field_group_id
        WHERE time BETWEEN $1 AND $2
        GROUP BY g.id
        ORDER BY 4
    "#,
        from,
        to
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(timeseries))
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

    Ok(Json(payload))
}

async fn delete_event(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Path(event_id): extract::Path<i32>,
) -> Result<impl IntoResponse, SorjordetError> {
    query!("DELETE FROM harvest_event WHERE id = $1", event_id)
        .execute(&pool)
        .await?;

    tracing::info!("harvest_event {} deleted by {}", event_id, claims.sub);

    Ok(())
}

#[derive(Deserialize, Serialize, TS)]
#[ts(export)]
struct HarvestParams {
    year: i32,
    page: i32,
    page_size: i32,
    field_id: Option<i32>,
    group_id: Option<i32>,
}

#[derive(Deserialize, Serialize, TS)]
#[ts(export)]
struct HarvestPagination {
    params: HarvestParams,
    events: Vec<HarvestEvent>,
}

async fn paginated_events(
    State(pool): State<PgPool>,
    extract::Query(params): extract::Query<HarvestParams>,
) -> Result<impl IntoResponse, SorjordetError> {
    let page_offset = (params.page - 1) * params.page_size;
    let result: Vec<HarvestEvent> = query_as!(
        HarvestEvent,
        "SELECT e.id, value, time, field_id, h.name as type_name, h.id as type_id
                FROM harvest_event AS e 
                    JOIN harvest_type AS h ON e.harvest_type_id = h.id
                    JOIN farm_field f ON f.id = e.field_id
                    JOIN farm_field_group fg ON f.farm_field_group_id = fg.id
                WHERE CAST(EXTRACT(year from time) as integer) = $1 
                    AND ($4 = -1 OR f.id = $4)
                    AND ($5 = -1 OR fg.id = $5)
                ORDER BY time DESC
                LIMIT $2 OFFSET $3
            ",
        params.year,
        params.page_size as i64,
        page_offset as i64,
        params.field_id.unwrap_or(-1),
        params.group_id.unwrap_or(-1)
    )
    .fetch_all(&pool)
    .await?;

    let paginated = HarvestPagination {
        params,
        events: result,
    };

    Ok(Json(paginated))
}

pub fn harvest_event_router() -> Router<PgPool> {
    Router::new()
        .route("/aggregated_group_harvests", get(get_agged_group_harvests))
        .route("/aggregated_harvests", get(get_aggregated_harvests))
        .route(
            "/{id}",
            get(get_events).patch(patch_event).delete(delete_event),
        )
        .route("/", post(post_event).get(paginated_events))
}
