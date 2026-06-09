import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/index.js';

export const useServiceStore = defineStore('service', () => {
  const services = ref([]);
  const loading = ref(false);
  const lastFetch = ref(0);
  const codeCache = ref({});
  const countdownTimers = ref({});
  // 收藏：Map<accountId, { sort, pinnedAt }>
  const favorites = ref(new Map());
  const lastFavoriteFetch = ref(0);
  // 已被撤销授权的账号（收到 SSE 推送时记录；UI 据此禁用对应条目）
  const revokedIds = ref(new Set());

  const categories = computed(() => {
    const cats = new Set(services.value.map(s => s.category));
    return Array.from(cats);
  });

  // 收藏的 ID 集合（O(1) 查找）
  const favoriteIds = computed(() => new Set(favorites.value.keys()));

  // 已收藏的服务列表（按 sort 升序）
  const favoriteServices = computed(() => {
    const ids = Array.from(favorites.value.keys());
    return ids
      .map(id => services.value.find(s => s.id === id))
      .filter(Boolean);
  });

  // 是否已收藏某个服务
  function isFavorite(id) {
    return favorites.value.has(id);
  }

  const groupedServices = computed(() => {
    const groups = {};
    services.value.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  });

  async function fetchServices(opts = {}) {
    const now = Date.now();
    if (!opts.force && now - lastFetch.value < 60000 && services.value.length > 0) return;

    loading.value = true;
    try {
      const result = await api.getServiceList();
      if (result.code === 0) {
        services.value = result.data || [];
        lastFetch.value = now;
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchFavorites() {
    const now = Date.now();
    // 30 秒内不重复拉取
    if (now - lastFavoriteFetch.value < 30000 && favorites.value.size > 0) return;
    try {
      const result = await api.listFavorites();
      if (result.code === 0 && Array.isArray(result.data)) {
        const map = new Map();
        for (const f of result.data) {
          map.set(f.accountId, { sort: f.sort, pinnedAt: f.pinnedAt });
        }
        favorites.value = map;
        lastFavoriteFetch.value = now;
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  }

  // 添加收藏（乐观更新 + 失败回滚）
  async function addFavorite(id) {
    const before = new Map(favorites.value);
    // 乐观：暂时放到末尾
    const nextSort = Math.max(0, ...Array.from(favorites.value.values()).map(v => v.sort)) + 1;
    favorites.value.set(id, { sort: nextSort, pinnedAt: new Date().toISOString() });
    try {
      const result = await api.addFavorite(id);
      if (result.code !== 0) {
        favorites.value = before;
        return false;
      }
      // 成功后重新拉取一次以获取准确 sort
      lastFavoriteFetch.value = 0;
      await fetchFavorites();
      return true;
    } catch {
      favorites.value = before;
      return false;
    }
  }

  // 取消收藏
  async function removeFavorite(id) {
    const before = new Map(favorites.value);
    favorites.value.delete(id);
    try {
      const result = await api.removeFavorite(id);
      if (result.code !== 0) {
        favorites.value = before;
        return false;
      }
      return true;
    } catch {
      favorites.value = before;
      return false;
    }
  }

  // 重排（orderedAccountIds 按用户期望顺序）
  async function reorderFavorites(orderedAccountIds) {
    const before = new Map(favorites.value);
    const map = new Map();
    orderedAccountIds.forEach((id, idx) => {
      if (before.has(id)) {
        map.set(id, { ...before.get(id), sort: idx + 1 });
      }
    });
    favorites.value = map;
    try {
      const result = await api.reorderFavorites(orderedAccountIds);
      if (result.code !== 0) {
        favorites.value = before;
        return false;
      }
      return true;
    } catch {
      favorites.value = before;
      return false;
    }
  }

  async function getCode(id) {
    try {
      const result = await api.getServiceCode(id);
      if (result.code === 0) {
        return result.data;
      }
    } catch (err) {
      console.error('Failed to get code:', err);
    }
    return null;
  }

  function cacheCode(id, code, remainSeconds) {
    codeCache.value[id] = { code, expireAt: Date.now() + remainSeconds * 1000 };
  }

  function getCachedCode(id) {
    const cached = codeCache.value[id];
    if (cached && Date.now() < cached.expireAt) {
      return cached.code;
    }
    return null;
  }

  // 返回缓存码 + 剩余秒数（用于组件层起倒计时）。
  // 缓存内含 expireAt 绝对时间戳，避免本地时钟漂移导致倒计时不准。
  function getCachedCodeInfo(id) {
    const cached = codeCache.value[id];
    if (!cached) return null;
    const remainMs = cached.expireAt - Date.now();
    if (remainMs <= 0) return null;
    return {
      code: cached.code,
      remainSeconds: Math.max(1, Math.ceil(remainMs / 1000)),
    };
  }

  function startCountdown(id, remainSeconds) {
    if (countdownTimers.value[id]) {
      clearInterval(countdownTimers.value[id]);
    }
    const timer = setInterval(() => {
      remainSeconds -= 1;
      if (remainSeconds <= 0) {
        clearInterval(timer);
        delete countdownTimers.value[id];
      }
    }, 1000);
    countdownTimers.value[id] = timer;
    return remainSeconds;
  }

  function stopCountdown(id) {
    if (countdownTimers.value[id]) {
      clearInterval(countdownTimers.value[id]);
      delete countdownTimers.value[id];
    }
  }

  function clearAllTimers() {
    Object.values(countdownTimers.value).forEach(clearInterval);
    countdownTimers.value = {};
  }

  async function copyCode(id) {
    const service = services.value.find(s => s.id === id);
    if (!service) return false;

    const cached = getCachedCode(id);
    let code = cached;

    if (!code) {
      const result = await getCode(id);
      if (!result) return false;
      code = result.code;
      cacheCode(id, code, result.remainSeconds);
    }

    await api.copy(code);
    await api.reportCopy(id);
    return true;
  }

  // 本地移除某个服务（用户已被撤销授权时使用，仅清理本地缓存与 TOTP 缓存）
  function removeService(id) {
    services.value = services.value.filter(s => s.id !== id);
    delete codeCache.value[id];
    if (countdownTimers.value[id]) {
      clearInterval(countdownTimers.value[id]);
      delete countdownTimers.value[id];
    }
    if (favorites.value.has(id)) favorites.value.delete(id);
    revokedIds.value.delete(id);
  }

  // SSE 事件处理：管理员在后台撤销/新增授权时由主进程推送
  function handleGrantChanged(payload) {
    if (!payload) return;
    const ids = (payload.accounts || []).map(a => Number(a.accountId)).filter(Boolean);
    if (payload.type === 'revoked') {
      for (const id of ids) {
        revokedIds.value.add(id);
        // 立即清空当前码与倒计时，避免用户继续用过期码
        delete codeCache.value[id];
        if (countdownTimers.value[id]) {
          clearInterval(countdownTimers.value[id]);
          delete countdownTimers.value[id];
        }
      }
    } else if (payload.type === 'granted') {
      for (const id of ids) revokedIds.value.delete(id);
    }
  }

  function isRevoked(id) {
    return revokedIds.value.has(Number(id));
  }

  return {
    services,
    loading,
    categories,
    groupedServices,
    favorites,
    favoriteIds,
    favoriteServices,
    isFavorite,
    fetchServices,
    fetchFavorites,
    addFavorite,
    removeFavorite,
    reorderFavorites,
    getCode,
    cacheCode,
    getCachedCode,
    getCachedCodeInfo,
    startCountdown,
    stopCountdown,
    clearAllTimers,
    copyCode,
    removeService,
    handleGrantChanged,
    isRevoked,
  };
});