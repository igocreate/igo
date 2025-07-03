
--

CREATE TABLE `cities` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `name`            VARCHAR(100),
  `created_at`      DATETIME,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `libraries` ADD COLUMN `city_id` INT NULL;

