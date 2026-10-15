-- Name and year of birth become optional, and the separate English / Korean
-- name columns are removed (the single "name" column can hold either language).
-- The existing CHECK constraints on name and birth_year still apply to any value
-- that is present; NULL is allowed.

ALTER TABLE customers DROP COLUMN english_name;
ALTER TABLE customers DROP COLUMN korean_name;
ALTER TABLE customers ALTER COLUMN name DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN birth_year DROP NOT NULL;
