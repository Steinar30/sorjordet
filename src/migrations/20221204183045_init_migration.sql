-- Add migration script here
CREATE TABLE IF NOT EXISTS user_info (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    email VARCHAR(256) UNIQUE NOT NULL,
    created_on TIMESTAMP NOT NULL,
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farm (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL UNIQUE,
    farm_coordinates VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS farm_field_group (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL UNIQUE,
    farm_id INT NOT NULL,
    CONSTRAINT fk_farm
        FOREIGN KEY(farm_id)
            REFERENCES farm(id)
);

CREATE TABLE IF NOT EXISTS farm_field (
    id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL UNIQUE,
    map_polygon_string VARCHAR NOT NULL,
    farm_field_group_id INT,
    farm_id INT NOT NULL,
    CONSTRAINT fk_farm
        FOREIGN KEY(farm_id)
            REFERENCES farm(id),
    CONSTRAINT fk_farm_field_group
        FOREIGN KEY(farm_field_group_id)
            REFERENCES farm_field_group(id)
);

