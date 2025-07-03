

--

CREATE TABLE `books` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `code`          VARCHAR(50),
  `title`         VARCHAR(100),
  `details_json`  TEXT,
  `tags_array`    VARCHAR(512),
  `is_available`  TINYINT(0),
  `library_id`    INT,
  `created_at`    DATETIME,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
