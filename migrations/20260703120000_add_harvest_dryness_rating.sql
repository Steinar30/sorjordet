ALTER TABLE harvest_event
ADD COLUMN dryness_rating INT,
ADD CONSTRAINT harvest_event_dryness_rating_check
    CHECK (dryness_rating IS NULL OR dryness_rating BETWEEN 1 AND 5);