CREATE TABLE IF NOT EXISTS field_event_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS field_event_type_field (
    id SERIAL PRIMARY KEY,
    field_event_type_id INT NOT NULL,
    name VARCHAR(128) NOT NULL,
    value_kind VARCHAR(32) NOT NULL,
    unit VARCHAR(32),
    CONSTRAINT fk_field_event_type
        FOREIGN KEY (field_event_type_id)
            REFERENCES field_event_type(id)
            ON DELETE CASCADE,
    CONSTRAINT field_event_type_field_kind_check
        CHECK (value_kind IN ('int', 'unit_int', 'text')),
    CONSTRAINT field_event_type_field_unique_name
        UNIQUE (field_event_type_id, name)
);

INSERT INTO field_event_type (name)
SELECT DISTINCT event_name
FROM field_event
WHERE event_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

ALTER TABLE field_event
ADD COLUMN IF NOT EXISTS field_event_type_id INT,
ADD COLUMN IF NOT EXISTS values JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS note VARCHAR(512);

UPDATE field_event e
SET field_event_type_id = t.id,
    note = CASE
        WHEN e.description IS NOT NULL AND length(trim(e.description)) > 0 THEN e.description
        ELSE e.note
    END,
    values = coalesce(e.values, '{}'::jsonb) - 'note' - 'notes' - 'description'
FROM field_event_type t
WHERE t.name = e.event_name
  AND e.field_event_type_id IS NULL;

UPDATE field_event
SET note = coalesce(
        note,
        values #>> '{note,value}',
        values #>> '{notes,value}',
        values #>> '{description,value}'
    ),
    values = values - 'note' - 'notes' - 'description'
WHERE values ?| ARRAY['note', 'notes', 'description'];

ALTER TABLE field_event
ALTER COLUMN field_event_type_id SET NOT NULL;

ALTER TABLE field_event
DROP CONSTRAINT IF EXISTS fk_field_event_type;

ALTER TABLE field_event
ADD CONSTRAINT fk_field_event_type
    FOREIGN KEY (field_event_type_id)
        REFERENCES field_event_type(id);
