

--

CREATE TABLE "books" (
  "id"            SERIAL,
  "code"          VARCHAR(50),
  "title"         VARCHAR(100),
  "details_json"  TEXT,
  "tags_array"    VARCHAR(512),
  "is_available"  BOOLEAN,
  "unique_code"   VARCHAR(50) UNIQUE,
  "created_at"    TIMESTAMP
);
