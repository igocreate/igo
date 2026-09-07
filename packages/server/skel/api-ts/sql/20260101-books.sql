CREATE TABLE books (
  id          INT           NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255)  NOT NULL,
  author      VARCHAR(255)  NOT NULL,
  pages       INT           NOT NULL,
  published   TINYINT(1)    NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
