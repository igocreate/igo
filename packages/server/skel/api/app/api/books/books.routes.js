
const { express } = require('@igojs/server');

const controller = require('./books.controller');

const router = express.Router();

router.get('/',       controller.index);
router.post('/',      controller.create);
router.get('/:id',    controller.show);
router.put('/:id',    controller.update);
router.delete('/:id', controller.destroy);

module.exports = router;
