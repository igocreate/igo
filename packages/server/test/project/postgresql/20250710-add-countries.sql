CREATE TABLE "countries" ("id" SERIAL, "name" VARCHAR(100), PRIMARY KEY ("id"));
ALTER TABLE "cities" ADD COLUMN "country_id" INT NULL;