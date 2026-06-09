import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as favoriteController from '../../controllers/user.favorite.controller.js';
import { withPreHandler } from '../_shared.js';

const userAuth = withPreHandler([authenticate, authorize('user', 'dept_admin', 'super_admin')]);

export default async function favoriteRoutes(fastify) {
  fastify.get(
    '/api/user/favorite/list',
    userAuth('User-Favorite', '当前用户的收藏服务列表'),
    favoriteController.list,
  );

  fastify.post(
    '/api/user/favorite/add',
    userAuth('User-Favorite', '收藏一个服务（需先有授权）'),
    favoriteController.add,
  );

  fastify.post(
    '/api/user/favorite/remove',
    userAuth('User-Favorite', '取消收藏'),
    favoriteController.remove,
  );

  fastify.post(
    '/api/user/favorite/reorder',
    userAuth('User-Favorite', '重排收藏顺序（用于快捷键槽位）', {
      schema: {
        body: {
          type: 'object',
          required: ['orderedAccountIds'],
          properties: {
            orderedAccountIds: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'integer' } },
          },
        },
      },
    }),
    favoriteController.reorder,
  );
}
