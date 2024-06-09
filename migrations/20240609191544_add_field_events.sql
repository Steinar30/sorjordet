-- Add migration script here
CREATE TABLE IF NOT EXISTS field_event (
    id SERIAL PRIMARY KEY,
    time TIMESTAMP NOT NULL,
    field_id INT NOT NULL,
    event_name VARCHAR(128) NOT NULL,
    description VARCHAR(512),
    CONSTRAINT fk_field FOREIGN KEY (field_id) REFERENCES farm_field(id)
);

CREATE TABLE IF NOT EXISTS harvest_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS harvest_event (
    id SERIAL PRIMARY KEY,
    time TIMESTAMP NOT NULL,
    field_id INT NOT NULL,
    value INT NOT NULL,
    harvest_type_id INT NOT NULL,
    CONSTRAINT fk_field FOREIGN KEY (field_id) REFERENCES farm_field(id),
    CONSTRAINT fk_harvest_type FOREIGN KEY (harvest_type_id) REFERENCES harvest_type(id)
);

