

--

CREATE TABLE `books` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50),
  `title` VARCHAR(100),
  `creation_time` DATETIME,
  `available` TINYINT(0),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
