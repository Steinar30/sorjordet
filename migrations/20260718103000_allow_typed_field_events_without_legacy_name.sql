-- Field event names now come from field_event_type through
-- field_event.field_event_type_id. New API writes therefore do not populate
-- the legacy event_name column.
ALTER TABLE field_event
ALTER COLUMN event_name DROP NOT NULL;
