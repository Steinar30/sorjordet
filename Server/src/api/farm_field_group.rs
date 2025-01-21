use std::collections::HashMap;

use axum::{
    self,
    extract::{self, State},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use sqlx::{query, query_scalar, PgPool, Row};
use ts_rs::TS;

use crate::auth::Claims;
use crate::errors::SorjordetError;

use super::farm_field::FarmFieldMeta;

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct FarmFieldGroup {
    pub id: i32,
    pub name: String,
    pub farm_id: i32,
    pub fields: Vec<i32>,
    pub draw_color: String,
}

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct FarmFieldGroupMeta {
    pub id: i32,
    pub farm_id: i32,
    pub name: String,
    pub draw_color: String,
    pub fields: Vec<FarmFieldMeta>,
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
                ORDER BY g.name
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

async fn get_farm_field_groups_meta(
    State(pool): State<PgPool>,
) -> Result<impl IntoResponse, SorjordetError> {
    let mut groups: Vec<FarmFieldGroupMeta> = query(
        "SELECT fg.id as id, fg.name as name, fg.farm_id as farm_id, draw_color, f.id as field_id, f.name as field_name
                FROM farm_field_group fg
                LEFT JOIN farm_field f ON fg.id = f.farm_field_group_id
            ORDER BY fg.name, f.name
        ",
    )
    .fetch_all(&pool)
    .await?
    .into_iter()
    .fold(
        HashMap::<i32, FarmFieldGroupMeta>::new(),
        |mut acc, x| {
            let id : i32 = x.get("id");
            let farm_id : i32 = x.get("farm_id");
            let name: String = x.get("name");
            let draw_color: String = x.get("draw_color");
            let field_id : Option<i32> = x.try_get("field_id").unwrap_or_default();
            let field_name: Option<String> = x.try_get("field_name").unwrap_or_default();
            let group = acc.entry(id).or_insert(FarmFieldGroupMeta {
                id,
                farm_id,
                name: name.to_string(),
                draw_color: draw_color.to_string(),
                fields: vec![],
            });
            if let Some(field_id) = field_id {
                group.fields.push(FarmFieldMeta {
                    id: field_id,
                    name: field_name.unwrap_or_default(),
                    farm_id,
                });
            }
            acc
        },
    )
    .into_iter()
    .map(|(_, x)| x)
    .collect();

    groups.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(Json(groups))
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

    tracing::info!("new field_group inserted by {}", claims.sub);

    Ok(Json(result))
}

async fn patch_farm_field_group(
    claims: Claims,
    State(pool): State<PgPool>,
    extract::Json(payload): extract::Json<FarmFieldGroup>,
) -> Result<impl IntoResponse, SorjordetError> {
    if payload.id <= 0 {
        return Err(SorjordetError::NotFound(format!(
            "farm_field_group with id {} not found",
            payload.id
        )));
    }

    let result = query!(
        r#"UPDATE farm_field_group
            SET name = $1, draw_color = $2
            WHERE id = $3
        "#,
        &payload.name,
        &payload.draw_color,
        &payload.id
    )
    .execute(&pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(SorjordetError::NotFound(format!(
            "farm_field_group with id {} not found",
            payload.id
        )));
    }

    tracing::info!("farm_field_group {} updated by {}", payload.id, claims.sub);

    Ok(Json(payload))
}

pub fn farm_field_group_router() -> Router<PgPool> {
    Router::new()
        .route("/meta", get(get_farm_field_groups_meta))
        .route(
            "/",
            get(get_farm_field_groups)
                .post(post_farm_field_group)
                .patch(patch_farm_field_group),
        )
}
