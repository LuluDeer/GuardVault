<template>
  <div class="services-page">
    <div class="page-header">
      <div class="user-info">
        <span class="hi">{{ t('services.hi') }}</span>
        <span class="username">{{ auth.user?.username || t('services.notLoggedIn') }}</span>
        <span class="status" :class="auth.online ? 'online' : 'offline'">
          {{ auth.online ? t('common.online') : t('common.offline') }}
        </span>
      </div>
      <div class="header-actions">
        <button v-if="isAdmin" class="ghost-btn primary" @click="$router.push('/dept')">{{ t('services.deptManagement') }}</button>
        <button class="ghost-btn" @click="$router.push('/password')">{{ t('services.changePassword') }}</button>
        <button class="ghost-btn danger" @click="handleLogout">{{ t('services.logout') }}</button>
      </div>
    </div>

    <div class="search-bar">
      <input v-model="searchQuery" type="text" :placeholder="t('services.searchPlaceholder')" class="search-input" @keyup.enter="handleSearch" />
      <button class="refresh-btn" @click="handleRefresh" :disabled="loading">
        <svg v-if="!loading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
          <path d="M16 21h5v-5"/>
        </svg>
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="services.length === 0" class="empty">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
      <p>{{ t('services.empty') }}</p>
    </div>

    <div v-else class="service-list">
      <div v-for="(items, category) in groupedServices" :key="category" class="category-group">
        <div class="category-header">
          <span class="category-name">{{ category }}</span>
          <span class="category-count">{{ items.length }}</span>
        </div>
        <div class="category-items">
          <div
            v-for="(service, index) in items"
            :key="service.id"
            class="service-card"
            :class="{ 'is-favorite': isFavorite(service.id), 'is-revoked': serviceStore.isRevoked(service.id) }"
            @click="handleClick(service)"
            @mouseenter="handleHover(service.id)"
          >
            <div class="service-icon">
              <span class="icon-letter">{{ service.name.charAt(0) }}</span>
            </div>
            <div class="service-info">
              <div class="service-name">{{ service.name }}</div>
              <div class="service-identifier">{{ service.identifier || t('services.noAccountInfo') }}</div>
            </div>
            <div class="service-code">
              <div v-if="serviceStore.isRevoked(service.id)" class="code-placeholder revoked">
                {{ t('services.revoked') }}
              </div>
              <div v-else-if="codeMap[service.id]" class="code-display" :class="{ 'is-loading': inflightIds.has(service.id) }" @click.stop="handleCopy(service)" :title="t('main.copyCode')">
                <span class="code-text">{{ codeMap[service.id] }}</span>
                <span class="countdown" :class="{ warning: (countdownMap[service.id] ?? 30) <= 10 }">
                  {{ countdownMap[service.id] ?? 30 }}s
                </span>
              </div>
              <div v-else class="code-placeholder">{{ t('services.clickToGet') }}</div>
            </div>
            <div v-if="!serviceStore.isRevoked(service.id)" class="service-action">
              <button
                class="fav-btn"
                :class="{ active: isFavorite(service.id) }"
                :title="isFavorite(service.id) ? t('services.unfavorite') : t('services.favoriteToShortcut')"
                @click.stop="handleToggleFav(service)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" :fill="isFavorite(service.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
              <button class="copy-btn" @click.stop="handleCopy(service)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
            <div v-if="shortcutIndex(service.id) >= 0" class="shortcut-badge fav-key">
              Ctrl+{{ shortcutIndex(service.id) + 1 }}
            </div>
            <button
              v-if="serviceStore.isRevoked(service.id)"
              class="remove-btn"
              :title="t('services.removeFromList')"
              @click.stop="handleRemove(service)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showToast" class="toast">
      {{ toastMessage }}
    </div>

    <!-- 自定义中文确认弹窗（避免 Electron 原生 confirm 显示英文 OK） -->
    <div v-if="showLogoutModal" class="modal-mask" @click.self="cancelLogout">
      <div class="modal-box">
        <div class="modal-title">{{ t('services.logout') }}</div>
        <div class="modal-body">{{ t('services.logoutConfirm') }}</div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="cancelLogout">{{ t('services.logoutCancel') }}</button>
          <button class="modal-btn confirm" @click="confirmLogout">{{ t('services.logoutConfirmBtn') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useServiceStore } from '../stores/service.js';
import { useAuthStore } from '../stores/auth.js';
import { useI18n } from '../i18n';
import api from '../api/index.js';

const router = useRouter();
const serviceStore = useServiceStore();
const auth = useAuthStore();
const { t } = useI18n();
const isAdmin = computed(() => ['dept_admin', 'super_admin'].includes(auth.user?.role));

const searchQuery = ref('');
const codeMap = ref({});
const countdownMap = ref({});
// 正在请求中的 id 集合：避免同一 id 短时间内重复发请求
const inflightIds = ref(new Set());
const showToast = ref(false);
const toastMessage = ref('');
const showLogoutModal = ref(false);

// --- 自动退出（5 分钟无操作） ---
const AUTO_LOGOUT_MS = 5 * 60 * 1000;
let lastActivityAt = Date.now();
let autoLogoutTimer = null;
function touchActivity() {
  lastActivityAt = Date.now();
}
function startAutoLogoutWatcher() {
  // 每 30s 检查一次，比 setTimeout 链式调用更稳（避免后台 tab 降频）
  autoLogoutTimer = setInterval(() => {
    if (Date.now() - lastActivityAt < AUTO_LOGOUT_MS) return;
    if (showLogoutModal.value) return; // 弹窗已开就不重复
    // 静默退出（不再二次确认）
    performLogout({ silent: true, reason: 'idle' });
  }, 30 * 1000);
}
function stopAutoLogoutWatcher() {
  if (autoLogoutTimer) { clearInterval(autoLogoutTimer); autoLogoutTimer = null; }
}

const services = computed(() => {
  if (!searchQuery.value) return serviceStore.services;
  const query = searchQuery.value.toLowerCase();
  return serviceStore.services.filter(s =>
    s.name.toLowerCase().includes(query) ||
    s.identifier?.toLowerCase().includes(query) ||
    s.category.toLowerCase().includes(query)
  );
});

const groupedServices = computed(() => {
  const groups = {};
  services.value.forEach(s => {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  });
  return groups;
});

const loading = computed(() => serviceStore.loading);

let countdownTimers = {};
let unsubscribeGrant = null;

async function handleSearch() {
  await serviceStore.fetchServices();
}

async function handleRefresh() {
  serviceStore.lastFetch = 0;
  await serviceStore.fetchServices();
}

async function handleClick(service) {
  if (serviceStore.isRevoked(service.id)) return; // 已撤销：禁止进入详情
  if (!codeMap.value[service.id]) {
    await loadCode(service.id);
  }
  router.push(`/service/${service.id}`);
}

async function handleHover(id) {
  if (!codeMap.value[id]) {
    await loadCode(id);
  }
}

// 加载（或刷新）某个服务的验证码。
// 1) 同一 id 短时间内多次调用会被去重；
// 2) 缓存命中必须起倒计时（避免"倒计时不刷新"的 bug）；
// 3) 倒计时归零会自动重拉（避免"密钥不刷新"的 bug）；
// 4) 网络失败会在 2s 后重试一次。
async function loadCode(id) {
  // 未登录时不请求验证码
  if (!auth.user) {
    if (countdownTimers[id]) {
      clearInterval(countdownTimers[id]);
      delete countdownTimers[id];
    }
    delete codeMap.value[id];
    delete countdownMap.value[id];
    return;
  }
  
  if (inflightIds.value.has(id)) return;
  inflightIds.value.add(id);
  try {
    // 命中缓存：直接显示并起倒计时
    const cached = serviceStore.getCachedCodeInfo(id);
    if (cached) {
      codeMap.value[id] = cached.code;
      startCountdown(id, cached.remainSeconds);
      return;
    }

    const result = await serviceStore.getCode(id);
    if (!result) {
      // 网络问题：短暂退避后重试一次（但放过撤销场景，避免无效请求）
      if (!serviceStore.isRevoked(id)) {
        setTimeout(() => {
          inflightIds.value.delete(id);
          loadCode(id);
        }, 2000);
      }
      return;
    }
    codeMap.value[id] = result.code;
    countdownMap.value[id] = result.remainSeconds;
    serviceStore.cacheCode(id, result.code, result.remainSeconds);
    startCountdown(id, result.remainSeconds);
  } finally {
    inflightIds.value.delete(id);
  }
}

// 回前台时：本地缓存可能已过期，统一重拉所有已显示的码
async function refreshAllVisibleCodes() {
  if (document.visibilityState !== 'visible') return;
  // 强刷一次服务列表：可能管理员刚刚撤销了某条授权
  try { await serviceStore.fetchServices({ force: true }) } catch {}
  const ids = Object.keys(codeMap.value);
  for (const id of ids) {
    // 强制绕过缓存重拉
    if (countdownTimers[id]) { clearInterval(countdownTimers[id]); delete countdownTimers[id]; }
    const result = await serviceStore.getCode(Number(id));
    if (result) {
      codeMap.value[id] = result.code;
      countdownMap.value[id] = result.remainSeconds;
      serviceStore.cacheCode(Number(id), result.code, result.remainSeconds);
      startCountdown(Number(id), result.remainSeconds);
    }
  }
}

// 用户自助移除（撤销/失效后）
function handleRemove(service) {
  if (countdownTimers[service.id]) clearInterval(countdownTimers[service.id]);
  delete codeMap.value[service.id];
  delete countdownMap.value[service.id];
  serviceStore.removeService(service.id);
  toastMessage.value = `已移除 ${service.name}`;
  showToast.value = true;
  setTimeout(() => { showToast.value = false; }, 1500);
}

// 启动/重启一个倒计时。归零时自动重拉下一段码，而不是清空显示。
function startCountdown(id, seconds) {
  if (countdownTimers[id]) { clearInterval(countdownTimers[id]); delete countdownTimers[id]; }
  // 服务已撤销就别起定时器了
  if (serviceStore.isRevoked(id)) {
    delete codeMap.value[id];
    delete countdownMap.value[id];
    return;
  }
  let remain = Math.max(1, seconds | 0);
  countdownMap.value[id] = remain;
  countdownTimers[id] = setInterval(() => {
    remain -= 1;
    countdownMap.value[id] = remain;
    if (remain <= 0) {
      clearInterval(countdownTimers[id]);
      delete countdownTimers[id];
      // 不再 delete codeMap —— 由 loadCode 决定新值
      // 避免多个倒计时同时归零时互相覆盖，加 50ms 抖动
      setTimeout(() => loadCode(id), 50);
    }
  }, 1000);
}

// 退出登录：清本地状态 → 通知主进程 → 跳登录页
async function performLogout({ silent = false, reason = 'manual' } = {}) {
  // 清理本地定时器与缓存
  Object.values(countdownTimers).forEach(t => clearInterval(t));
  countdownTimers = {};
  codeMap.value = {};
  countdownMap.value = {};
  inflightIds.value.clear();
  serviceStore.clearAllTimers();
  stopAutoLogoutWatcher();
  try { await auth.logout(); } catch {}
  if (reason === 'idle') {
    // 跳登录页并提示（toast 由 Login 接管会更稳，这里只导航）
    router.replace('/login');
    return;
  }
  router.replace('/login');
  if (!silent) {
    toastMessage.value = '已退出登录';
    showToast.value = true;
    setTimeout(() => { showToast.value = false; }, 1500);
  }
}

function handleLogout() {
  // 触发弹窗（不走原生 confirm，避免英文 OK）
  showLogoutModal.value = true;
}
function cancelLogout() {
  showLogoutModal.value = false;
}
function confirmLogout() {
  showLogoutModal.value = false;
  performLogout({ silent: false, reason: 'manual' });
}

// 首次进入时自动加载所有可见服务的验证码（错峰 30ms 防止突发）
function loadAllCodes() {
  const ids = serviceStore.services.map(s => s.id);
  ids.forEach((id, idx) => setTimeout(() => loadCode(id), idx * 30));
}

async function handleCopy(service) {
  const success = await serviceStore.copyCode(service.id);
  if (success) {
    toastMessage.value = `已复制 ${service.name} 的验证码`;
    showToast.value = true;
    setTimeout(() => { showToast.value = false; }, 2000);
    try { await api.notify('已复制验证码', `${service.name}`); } catch {}
  }
}

function handleKeydown(e) {
  // 任何键盘事件都视为活动（搜索框输入 / 收藏快捷键等）
  touchActivity();
  // Esc 关闭弹窗
  if (e.key === 'Escape' && showLogoutModal.value) {
    cancelLogout();
    return;
  }
  if (e.ctrlKey && !e.shiftKey && !e.altKey) {
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= 9) {
      // 优先匹配收藏快捷键映射（按 sort 升序的前 9 个）
      const favs = serviceStore.favoriteServices;
      if (favs.length >= num) {
        handleCopy(favs[num - 1]);
        return;
      }
      // 未配收藏时回落到服务列表顺序
      const allServices = serviceStore.services;
      if (allServices[num - 1]) {
        handleCopy(allServices[num - 1]);
      }
    }
  }
  if (e.key === 'Escape') {
    api.closeWindow();
  }
}

function isFavorite(id) {
  return serviceStore.isFavorite(id);
}

// 返回该服务在收藏序列中的位置（0-based），未收藏返回 -1
function shortcutIndex(id) {
  const favs = serviceStore.favoriteServices;
  const idx = favs.findIndex(s => s.id === id);
  return idx >= 0 && idx < 9 ? idx : -1;
}

async function handleToggleFav(service) {
  if (isFavorite(service.id)) {
    const ok = await serviceStore.removeFavorite(service.id);
    if (ok) {
      toastMessage.value = `已取消收藏 ${service.name}`;
      showToast.value = true;
      setTimeout(() => { showToast.value = false; }, 1500);
    }
  } else {
    const ok = await serviceStore.addFavorite(service.id);
    if (ok) {
      toastMessage.value = `已收藏 ${service.name}（按 Ctrl+${shortcutIndex(service.id) + 1} 快速复制）`;
      showToast.value = true;
      setTimeout(() => { showToast.value = false; }, 2000);
    }
  }
}

onMounted(async () => {
  await serviceStore.fetchServices();
  await serviceStore.fetchFavorites();
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('focus', refreshAllVisibleCodes);
  document.addEventListener('visibilitychange', refreshAllVisibleCodes);
  // 任意点击都视为活动（搜索、刷新、复制、收藏、进入详情、修改密码等点击类操作均覆盖）
  window.addEventListener('pointerdown', touchActivity, { passive: true });
  // 启动 5 分钟无操作自动退出
  startAutoLogoutWatcher();
  // 路由进入时刷新服务列表（处理从部门管理创建服务后返回的场景）
  router.beforeEach((to, from) => {
    if (to.path === '/services' && from.path === '/dept') {
      serviceStore.lastFetch = 0;
      serviceStore.fetchServices().then(() => {
        codeMap.value = {};
        countdownMap.value = {};
        loadAllCodes();
      });
    }
  });
  // 授权变更实时推送：撤销立即清码、禁用操作按钮；新增仅解除禁用
  unsubscribeGrant = api.onGrantChanged((payload) => {
    serviceStore.handleGrantChanged(payload);
    if (!payload) return;
    const ids = (payload.accounts || []).map(a => Number(a.accountId)).filter(Boolean);
    if (payload.type === 'revoked') {
      // 本地：清掉对应 id 的码与倒计时（避免后台定时器空转）
      for (const id of ids) {
        if (countdownTimers[id]) { clearInterval(countdownTimers[id]); delete countdownTimers[id]; }
        delete codeMap.value[id];
        delete countdownMap.value[id];
        inflightIds.value.delete(id);
      }
      toastMessage.value = '服务权限已撤销';
      showToast.value = true;
      setTimeout(() => { showToast.value = false; }, 2000);
    } else if (payload.type === 'granted') {
      // 重新授权：尝试为该 id 重新拉码（如果用户在列表上）
      for (const id of ids) {
        if (serviceStore.services.some(s => s.id === id)) {
          loadCode(id);
        }
      }
    }
  });
  // 进入页面：自动加载所有可见服务的码（缓存命中即显示，未命中错峰 30ms 拉取）
  loadAllCodes();
});

onUnmounted(() => {
  Object.values(countdownTimers).forEach(clearInterval);
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('pointerdown', touchActivity);
  window.removeEventListener('focus', refreshAllVisibleCodes);
  document.removeEventListener('visibilitychange', refreshAllVisibleCodes);
  if (unsubscribeGrant) unsubscribeGrant();
  stopAutoLogoutWatcher();
});

watch(searchQuery, () => {
  // 停止所有后台倒计时定时器，避免定时器空转继续发网络请求
  Object.values(countdownTimers).forEach(clearInterval);
  countdownTimers = {};
  codeMap.value = {};
  countdownMap.value = {};
});
</script>

<style scoped>
.services-page {
  padding: 16px;
  min-height: 100%;
  max-height: 100vh;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 4px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 14px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255,255,255,0.85);
  font-size: 13px;
  min-width: 0;
}
.user-info .hi { color: rgba(255,255,255,0.5); }
.user-info .username {
  font-weight: 600;
  color: #fff;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-info .status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}
.user-info .status.online { background: rgba(103,194,58,0.18); color: #67c23a; }
.user-info .status.offline { background: rgba(245,108,108,0.18); color: #f56c6c; }

.header-actions { display: flex; gap: 8px; flex-shrink: 0; }
.ghost-btn {
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.85);
  cursor: pointer;
  transition: all 0.18s;
}
.ghost-btn:hover { background: rgba(255,255,255,0.14); }
.ghost-btn.danger { color: #f56c6c; border-color: rgba(245,108,108,0.3); }
.ghost-btn.danger:hover { background: rgba(245,108,108,0.18); }

.code-display {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 6px;
  transition: background 0.15s, transform 0.1s;
  user-select: none;
}
.code-display:hover { background: rgba(103,194,58,0.15); }
.code-display:active { transform: scale(0.97); }
.code-display.is-loading { opacity: 0.6; }

.modal-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-box {
  background: #1f2230;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  min-width: 320px;
  max-width: 80vw;
  padding: 20px 22px 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.9);
  animation: zoomIn 0.15s ease;
}
@keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #fff; }
.modal-body { font-size: 13px; color: rgba(255,255,255,0.75); margin-bottom: 18px; line-height: 1.5; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.modal-btn {
  padding: 6px 18px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.85);
  cursor: pointer;
  transition: all 0.15s;
}
.modal-btn:hover { background: rgba(255,255,255,0.14); }
.modal-btn.cancel:hover { background: rgba(255,255,255,0.14); }
.modal-btn.confirm { background: #f56c6c; border-color: #f56c6c; color: #fff; }
.modal-btn.confirm:hover { background: #f78989; }

.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  background: rgba(0,0,0,0.2);
  color: #fff;
  font-size: 14px;
  outline: none;
}

.search-input::placeholder { color: rgba(255,255,255,0.5); }

.refresh-btn {
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-btn:hover:not(:disabled) { background: rgba(255,255,255,0.2); }

.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: rgba(255,255,255,0.7);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: rgba(255,255,255,0.6);
}

.empty-icon { opacity: 0.5; margin-bottom: 16px; }

.service-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

.category-name {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-count {
  font-size: 11px;
  background: rgba(255,255,255,0.15);
  padding: 2px 8px;
  border-radius: 10px;
  color: rgba(255,255,255,0.7);
}

.category-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.service-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(0,0,0,0.15);
  border-radius: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

.service-card:hover {
  background: rgba(0,0,0,0.25);
  transform: translateX(4px);
}

.service-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-letter {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.service-info {
  flex: 1;
  min-width: 0;
}

.service-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.service-identifier {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.service-code {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.code-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-text {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2px;
}

.countdown {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  padding: 2px 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}

.countdown.warning { color: #f56c6c; background: rgba(245,108,108,0.2); }

.code-placeholder {
  font-size: 12px;
  color: rgba(255,255,255,0.3);
}

.service-action {
  flex-shrink: 0;
  display: flex;
  gap: 6px;
  align-items: center;
}

.fav-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.fav-btn:hover {
  background: rgba(241,196,15,0.2);
  color: #f1c40f;
}

.fav-btn.active {
  background: rgba(241,196,15,0.25);
  color: #f1c40f;
}

.service-card.is-favorite {
  background: rgba(241,196,15,0.08);
  border-left: 3px solid #f1c40f;
}

.shortcut-badge.fav-key {
  font-size: 9px;
  background: rgba(241,196,15,0.25);
  color: #f1c40f;
  width: auto;
  padding: 0 5px;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s, background 0.15s;
  z-index: 5;
}

.service-card.is-revoked { opacity: 0.6; cursor: default; }
.service-card.is-revoked:hover { background: rgba(0,0,0,0.15); transform: none; }
.service-card.is-revoked .remove-btn { opacity: 1; }
.remove-btn:hover { background: #f56c6c; color: #fff; }

.code-placeholder.revoked {
  color: #f56c6c;
  font-size: 12px;
  font-weight: 600;
}

.copy-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: rgba(103,194,58,0.3);
  color: #67c23a;
}

.shortcut-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 18px;
  height: 18px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: #fff;
  padding: 12px 24px;
  border-radius: 20px;
  font-size: 13px;
  animation: toastIn 0.3s ease;
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>