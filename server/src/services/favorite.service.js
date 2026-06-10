// 用户收藏服务（决定客户端 Ctrl+1~9 快捷键顺序）
import { prisma } from '../utils/prisma.js';

/**
 * 获取当前用户已收藏的服务 id 列表（按 sort 升序）
 * 用于客户端显示"已收藏"角标与快捷键映射
 */
export async function listFavorites(userId) {
  const rows = await prisma.accountFavorite.findMany({
    where: { userId },
    orderBy: { sort: 'asc' },
    select: { accountId: true, sort: true, pinnedAt: true },
  });
  return rows;
}

/**
 * 收藏一个服务
 * - 若已收藏则忽略（不更新 pinnedAt）
 * - sort 自动追加到末尾
 */
export async function addFavorite(userId, accountId, role) {
  // 超管拥有所有服务访问权，无需检查授权记录
  if (role !== 'super_admin') {
    const grant = await prisma.accountGrant.findUnique({
      where: { userId_accountId: { userId, accountId } },
    });
    if (!grant) throw new Error('无此服务访问权限');
  }

  // 找到当前最大 sort
  const max = await prisma.accountFavorite.aggregate({
    where: { userId },
    _max: { sort: true },
  });
  const nextSort = (max._max.sort ?? 0) + 1;

  return prisma.accountFavorite.upsert({
    where: { userId_accountId: { userId, accountId } },
    create: { userId, accountId, sort: nextSort },
    update: {}, // 已存在则不变
  });
}

/**
 * 取消收藏
 */
export async function removeFavorite(userId, accountId) {
  return prisma.accountFavorite.deleteMany({
    where: { userId, accountId },
  });
}

/**
 * 重新排序：批量更新 sort 字段
 * @param {number} userId
 * @param {number[]} orderedAccountIds  按 Ctrl+1~N 顺序排列的 accountId 列表
 */
export async function reorderFavorites(userId, orderedAccountIds) {
  if (!Array.isArray(orderedAccountIds) || orderedAccountIds.length === 0) {
    return { count: 0 };
  }
  // 事务：每行单独 update（避免 N+1 一次性 SQL 难写）
  return prisma.$transaction(
    orderedAccountIds.map((accountId, idx) =>
      prisma.accountFavorite.update({
        where: { userId_accountId: { userId, accountId } },
        data: { sort: idx + 1 },
      })
    )
  );
}
