
const express     = require('express');
const controller  = require('./books.controller');

const router = express.Router();

router.get('/',      controller.index);
router.post('/',     controller.create);
router.post('/bulk', controller.bulk);
router.get('/boom',  controller.boom);
router.get('/:id',   controller.show);

module.exports = router;
