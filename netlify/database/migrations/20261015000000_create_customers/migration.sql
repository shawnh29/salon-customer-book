-- Customers table for the salon customer book.
-- Age is intentionally NOT stored: it is calculated from birth_year when displayed.
-- "Birth year is not in the future" depends on today's date, so it is enforced by
-- the API; the CHECK below only guards the absolute range.

CREATE TABLE customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL
                 CONSTRAINT customers_name_length
                 CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  english_name TEXT
                 CONSTRAINT customers_english_name_length
                 CHECK (english_name IS NULL OR char_length(english_name) <= 100),
  korean_name  TEXT
                 CONSTRAINT customers_korean_name_length
                 CHECK (korean_name IS NULL OR char_length(korean_name) <= 100),
  birth_year   SMALLINT NOT NULL
                 CONSTRAINT customers_birth_year_range
                 CHECK (birth_year BETWEEN 1900 AND 2100),
  notes        TEXT
                 CONSTRAINT customers_notes_length
                 CHECK (notes IS NULL OR char_length(notes) <= 5000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX customers_name_idx ON customers (lower(name));
