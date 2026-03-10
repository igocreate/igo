
//
module.exports.index = (req, res) => {
  res.render('welcome/index', { count: 42 });
};
