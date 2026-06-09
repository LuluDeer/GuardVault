// 全局事件总线：用于服务间解耦广播（如用户授权变更）。
// 客户端通过 SSE 订阅用户级事件，主进程收到后转发给渲染器。
import { EventEmitter } from 'node:events';

// 单例：每用户一个监听者集合；最多 32 个 listener 避免内存泄漏
const bus = new EventEmitter();
bus.setMaxListeners(0);

/**
 * 触发某用户的授权撤销事件。
 * @param {number} userId 被撤销授权的用户 ID
 * @param {Array<{accountId:number, accountName?:string}>} accounts 被撤销的服务列表
 */
export function emitGrantRevoked(userId, accounts) {
  bus.emit(`user:${userId}:grant-revoked`, { type: 'revoked', userId, accounts });
}

/**
 * 触发某用户的授权新增事件。
 */
export function emitGrantGranted(userId, accounts) {
  bus.emit(`user:${userId}:grant-granted`, { type: 'granted', userId, accounts });
}

/**
 * 订阅某用户的所有授权变更事件（撤销 + 新增）。
 * @returns {Function} 取消订阅函数
 */
export function subscribeUserGrants(userId, listener) {
  const evRevoked = `user:${userId}:grant-revoked`;
  const evGranted = `user:${userId}:grant-granted`;
  bus.on(evRevoked, listener);
  bus.on(evGranted, listener);
  return () => {
    bus.off(evRevoked, listener);
    bus.off(evGranted, listener);
  };
}
