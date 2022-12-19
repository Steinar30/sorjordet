use sqlx::{query_as, PgPool};

use crate::api::types::*;

pub async fn query_all_farms(pool: &PgPool) -> Result<Vec<Farm>, sqlx::Error> {
    query_as!(
        Farm,
        "SELECT id, name, farm_coordinates
                FROM farm
            "
    )
    .fetch_all(pool)
    .await
}

pub async fn query_all_farm_fields(pool: &PgPool) -> Result<Vec<FarmField>, sqlx::Error> {
    query_as!(
        FarmField,
        "SELECT id, name, map_polygon_string, farm_field_group_id, farm_id
                FROM farm_field
            "
    )
    .fetch_all(pool)
    .await
}

pub async fn query_by_id_farm_field(
    field_id: i32,
    pool: &PgPool,
) -> Result<FarmField, sqlx::Error> {
    query_as!(
        FarmField,
        "SELECT id, name, map_polygon_string, farm_field_group_id, farm_id
                FROM farm_field WHERE farm_id = $1
            ",
        field_id
    )
    .fetch_one(pool)
    .await
}

pub async fn query_farm_fields_in_group(
    group_id: i32,
    pool: &PgPool,
) -> Result<Vec<FarmField>, sqlx::Error> {
    query_as!(
        FarmField,
        "SELECT id, name, map_polygon_string, farm_field_group_id, farm_id
                FROM farm_field
                WHERE farm_field_group_id = $1
            ",
        group_id
    )
    .fetch_all(pool)
    .await
}

pub async fn query_all_farm_field_groups(
    pool: &PgPool,
) -> Result<Vec<FarmFieldGroup>, sqlx::Error> {
    query_as!(
        FarmFieldGroup,
        r#"SELECT g.id, g.name, g.farm_id, g.draw_color, 
                ARRAY_AGG(f.id) 
                filter (WHERE f.id IS NOT NULL) as "fields!" 
            FROM farm_field_group AS g
                LEFT JOIN farm_field AS f ON g.id = f.farm_field_group_id 
            GROUP BY g.id
            "#
    )
    .fetch_all(pool)
    .await
}
