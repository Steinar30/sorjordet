BEGIN;

INSERT INTO user_info (name, password, email, created_on)
VALUES (
  'dev',
  '$argon2id$v=19$m=19456,t=2,p=1$Gk9O40osA9KNxs9zwgQDjg$L0QhEFnett6wbg1vzUVwrCxpRZoRrfUVCc6h2EAPhSc',
  'dev@sorjordet.local',
  NOW()
)
ON CONFLICT (name) DO UPDATE
SET password = EXCLUDED.password,
    email = EXCLUDED.email;

INSERT INTO farm (name, farm_coordinates)
VALUES ('Sørjordet Dev Farm', '1721600,10692300')
ON CONFLICT (name) DO UPDATE
SET farm_coordinates = EXCLUDED.farm_coordinates;

INSERT INTO farm_field_group (name, farm_id, draw_color)
SELECT 'Nordjordet', f.id, 'rgba(76, 175, 80, 0.55)'
FROM farm f
WHERE f.name = 'Sørjordet Dev Farm'
ON CONFLICT (name) DO UPDATE
SET farm_id = EXCLUDED.farm_id,
    draw_color = EXCLUDED.draw_color;

INSERT INTO farm_field_group (name, farm_id, draw_color)
SELECT 'Sørjordet', f.id, 'rgba(33, 150, 243, 0.55)'
FROM farm f
WHERE f.name = 'Sørjordet Dev Farm'
ON CONFLICT (name) DO UPDATE
SET farm_id = EXCLUDED.farm_id,
    draw_color = EXCLUDED.draw_color;

INSERT INTO farm_field (name, map_polygon_string, farm_field_group_id, farm_id)
SELECT
  'Dev Nord 1',
  '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[1721400,10692200],[1721400,10692420],[1721660,10692420],[1721660,10692200],[1721400,10692200]]]}}',
  g.id,
  f.id
FROM farm f
JOIN farm_field_group g ON g.name = 'Nordjordet'
WHERE f.name = 'Sørjordet Dev Farm'
ON CONFLICT (name) DO UPDATE
SET map_polygon_string = EXCLUDED.map_polygon_string,
    farm_field_group_id = EXCLUDED.farm_field_group_id,
    farm_id = EXCLUDED.farm_id;

INSERT INTO farm_field (name, map_polygon_string, farm_field_group_id, farm_id)
SELECT
  'Dev Sør 1',
  '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[1721700,10692280],[1721700,10692500],[1721960,10692500],[1721960,10692280],[1721700,10692280]]]}}',
  g.id,
  f.id
FROM farm f
JOIN farm_field_group g ON g.name = 'Sørjordet'
WHERE f.name = 'Sørjordet Dev Farm'
ON CONFLICT (name) DO UPDATE
SET map_polygon_string = EXCLUDED.map_polygon_string,
    farm_field_group_id = EXCLUDED.farm_field_group_id,
    farm_id = EXCLUDED.farm_id;

INSERT INTO harvest_type (name)
SELECT 'Rundballer'
WHERE NOT EXISTS (SELECT 1 FROM harvest_type WHERE name = 'Rundballer');

INSERT INTO harvest_type (name)
SELECT 'Småballer'
WHERE NOT EXISTS (SELECT 1 FROM harvest_type WHERE name = 'Småballer');

INSERT INTO harvest_event (time, field_id, value, harvest_type_id, dryness_rating)
SELECT TIMESTAMPTZ '2026-06-22 12:00:00+02', ff.id, 34, ht.id, 3
FROM farm_field ff
JOIN harvest_type ht ON ht.name = 'Rundballer'
WHERE ff.name = 'Dev Nord 1'
  AND NOT EXISTS (
    SELECT 1 FROM harvest_event e
    WHERE e.time = TIMESTAMPTZ '2026-06-22 12:00:00+02'
      AND e.field_id = ff.id
      AND e.harvest_type_id = ht.id
  );

INSERT INTO harvest_event (time, field_id, value, harvest_type_id, dryness_rating)
SELECT TIMESTAMPTZ '2026-07-02 15:30:00+02', ff.id, 27, ht.id, 4
FROM farm_field ff
JOIN harvest_type ht ON ht.name = 'Rundballer'
WHERE ff.name = 'Dev Sør 1'
  AND NOT EXISTS (
    SELECT 1 FROM harvest_event e
    WHERE e.time = TIMESTAMPTZ '2026-07-02 15:30:00+02'
      AND e.field_id = ff.id
      AND e.harvest_type_id = ht.id
  );

INSERT INTO harvest_event (time, field_id, value, harvest_type_id, dryness_rating)
SELECT TIMESTAMPTZ '2025-08-12 10:15:00+02', ff.id, 120, ht.id, NULL
FROM farm_field ff
JOIN harvest_type ht ON ht.name = 'Småballer'
WHERE ff.name = 'Dev Nord 1'
  AND NOT EXISTS (
    SELECT 1 FROM harvest_event e
    WHERE e.time = TIMESTAMPTZ '2025-08-12 10:15:00+02'
      AND e.field_id = ff.id
      AND e.harvest_type_id = ht.id
  );

INSERT INTO field_event_type (name)
VALUES ('Gjødsling'), ('Slått')
ON CONFLICT (name) DO NOTHING;

INSERT INTO field_event_type_field (field_event_type_id, name, value_kind, unit)
SELECT t.id, 'amount', 'unit_int', 'kg/daa'
FROM field_event_type t
WHERE t.name = 'Gjødsling'
ON CONFLICT (field_event_type_id, name) DO UPDATE
SET value_kind = EXCLUDED.value_kind,
    unit = EXCLUDED.unit;

INSERT INTO field_event_type_field (field_event_type_id, name, value_kind, unit)
SELECT t.id, 'height', 'unit_int', 'cm'
FROM field_event_type t
WHERE t.name = 'Slått'
ON CONFLICT (field_event_type_id, name) DO UPDATE
SET value_kind = EXCLUDED.value_kind,
    unit = EXCLUDED.unit;

INSERT INTO field_event (time, field_id, event_name, description, field_event_type_id, note, values)
SELECT
  TIMESTAMPTZ '2026-05-15 09:00:00+02',
  ff.id,
  t.name,
  'Dummy spring fertilizer entry',
  t.id,
  'Dummy spring fertilizer entry',
  '{"amount":{"kind":"unit_int","value":22,"unit":"kg/daa"}}'::jsonb
FROM farm_field ff
JOIN field_event_type t ON t.name = 'Gjødsling'
WHERE ff.name = 'Dev Nord 1'
  AND NOT EXISTS (
    SELECT 1 FROM field_event e
    WHERE e.time = TIMESTAMPTZ '2026-05-15 09:00:00+02'
      AND e.field_id = ff.id
      AND e.field_event_type_id = t.id
  );

INSERT INTO field_event (time, field_id, event_name, description, field_event_type_id, note, values)
SELECT
  TIMESTAMPTZ '2026-06-20 08:30:00+02',
  ff.id,
  t.name,
  'Dummy first cut entry',
  t.id,
  'Dummy first cut entry',
  '{"height":{"kind":"unit_int","value":48,"unit":"cm"}}'::jsonb
FROM farm_field ff
JOIN field_event_type t ON t.name = 'Slått'
WHERE ff.name = 'Dev Sør 1'
  AND NOT EXISTS (
    SELECT 1 FROM field_event e
    WHERE e.time = TIMESTAMPTZ '2026-06-20 08:30:00+02'
      AND e.field_id = ff.id
      AND e.field_event_type_id = t.id
  );

COMMIT;
