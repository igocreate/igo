import { express } from '@igojs/server';

import { requireAuth } from '../../shared/authentication';
import * as controller from './books.controller';

const router = express.Router();

router.get('/', controller.index);
router.post('/', controller.create);
router.get('/:id', controller.show);
router.put('/:id', controller.update);
router.delete('/:id', requireAuth, controller.destroy);

export default router;
