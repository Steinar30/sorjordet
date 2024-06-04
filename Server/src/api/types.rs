use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct User {
    pub id: i32,
    pub name: String,
    #[serde(skip_serializing)]
    pub password: String,
    pub email: String,
}

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct Farm {
    pub id: i32,
    pub name: String,
    pub farm_coordinates: String,
}

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct FarmField {
    pub id: i32,
    pub name: String,
    pub map_polygon_string: String,
    pub farm_id: i32,
    pub farm_field_group_id: Option<i32>,
}

#[derive(Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct FarmFieldGroup {
    pub id: i32,
    pub name: String,
    pub farm_id: i32,
    pub fields: Vec<i32>,
    pub draw_color: String
}

#[derive(Deserialize, TS)]
#[ts(export)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize, TS)]
#[ts(export)]
pub struct LoginResponse {
    pub result: bool,
    pub message: String,
    pub token: String,
}

pub enum SorjordetError {
    AuthError,
    DBError,
    NotFound(String),
    InvalidInput(String),
    InternalError(String),
}
