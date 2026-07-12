ALTER TABLE field_event
ADD COLUMN IF NOT EXISTS note VARCHAR(512);

UPDATE field_event
SET note = coalesce(
        note,
        values #>> '{note,value}',
        values #>> '{notes,value}',
        values #>> '{description,value}',
        description
    ),
    values = values - 'note' - 'notes' - 'description'
WHERE note IS NULL
   OR values ?| ARRAY['note', 'notes', 'description'];

DELETE FROM field_event_type_field
WHERE lower(name) IN ('note', 'notes', 'description');
