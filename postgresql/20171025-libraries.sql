
--

CREATE TABLE "libraries" (
  "id"              SERIAL,
  "title"           VARCHAR(100),
  "books_ids_json"  VARCHAR(100),
  "created_at"      TIMESTAMP,
  PRIMARY KEY ("id")
);

ALTER TABLE "books" ADD COLUMN "library_id" INT NULL;
