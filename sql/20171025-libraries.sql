
--

CREATE TABLE `libraries` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `title`           VARCHAR(100),
  `books_ids_json`  VARCHAR(100),
  `created_at`      DATETIME,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `books` ADD COLUMN `library_id` INT NULL;

