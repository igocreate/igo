
const dto = require('./books.dto');

exports.index = (req, res) => {
  res.json({ page: req.query.page, typeofPage: typeof req.query.page, status: req.query.status });
};
exports.index.query = dto.ListBooks;

exports.create = (req, res) => {
  res.status(201).json(dto.serialize({ id: 1, ...req.body }));
};
exports.create.body = dto.CreateBook;

exports.show = (req, res) => {
  res.json(dto.serialize({ id: Number(req.params.id), title: 'Dune', pages: 412 }));
};

exports.boom = () => {
  throw new Error('boom in api');
};

// no schema: the boot-time warning must report it
exports.bulk = (req, res) => {
  res.json({ ok: true });
};
