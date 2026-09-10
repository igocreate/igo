import { express } from '@igojs/server';

import { requireSession } from '../../shared/authentication';
import * as controller from './books.controller';

const router = express.Router();

router.get('/', controller.index);
router.post('/', controller.create);
router.get('/:id', controller.show);
router.put('/:id', controller.update);
router.delete('/:id', requireSession, controller.destroy);

export default router;
