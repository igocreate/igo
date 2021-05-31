

--

CREATE TABLE "books" (
  "id"            SERIAL,
  "code"          VARCHAR(50),
  "title"         VARCHAR(100),
  "details_json"  TEXT,
  "tags_array"    VARCHAR(512),
  "is_available"  SMALLINT,
  "created_at"    TIMESTAMP
);
