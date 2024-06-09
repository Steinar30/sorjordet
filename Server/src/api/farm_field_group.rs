use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use sqlx::{query, query_scalar, PgPool};

use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;

use crate::auth::Claims;
use crate::errors::SorjordetError;

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct FarmFieldGroup {
    pub id: i32,
    pub name: String,
    pub farm_id: i32,
    pub fields: Vec<i32>,
    pub draw_color: String,
}

async fn get_farm_field_groups(
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let groups = query!(
        r#"SELECT g.id, g.name, g.farm_id, g.draw_color, 
                    ARRAY_AGG(f.id) 
                    filter (WHERE f.id IS NOT NULL) as fields
                FROM farm_field_group AS g
                    LEFT JOIN farm_field AS f ON g.id = f.farm_field_group_id 
                GROUP BY g.id
                "#
    )
    .fetch_all(&pool)
    .await?;

    let result: Vec<FarmFieldGroup> = groups
        .iter()
        .map(|x| FarmFieldGroup {
            id: x.id,
            name: x.name.to_string(),
            draw_color: x.draw_color.to_string(),
            farm_id: x.farm_id,
            fields: x.fields.to_owned().unwrap_or_default(),
        })
        .collect();

    Ok(Json(result))
}

async fn post_farm_field_group(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<FarmFieldGroup>,
) -> Result<impl IntoResponse, SorjordetError> {
    let result = query_scalar!(
        "INSERT INTO farm_field_group (name, farm_id, draw_color)
                VALUES ($1,$2, $3)
                RETURNING id
            ",
        &payload.name,
        &payload.farm_id,
        &payload.draw_color
    )
    .fetch_one(&pool)
    .await?;

    log::info!("new field_group inserted by {}", claims.sub);

    Ok(Json(result))
}

pub fn farm_field_group_router() -> Router<PgPool> {
    Router::new().route("/", get(get_farm_field_groups).post(post_farm_field_group))
}
