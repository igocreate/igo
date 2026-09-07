
import { express } from '@igojs/server';

import * as controller from './books.controller';

const router = express.Router();

router.get('/',       controller.index);
router.post('/',      controller.create);
router.get('/:id',    controller.show);
router.put('/:id',    controller.update);
router.delete('/:id', controller.destroy);

export default router;
