<template>
  <div class="services-page">
    <div class="search-bar">
      <input v-model="searchQuery" type="text" placeholder="搜索服务..." class="search-input" @keyup.enter="handleSearch" />
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
      <span>加载中...</span>
    </div>

    <div v-else-if="services.length === 0" class="empty">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
      <p>暂无服务，请联系管理员授权</p>
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
            :class="{ 'is-favorite': isFavorite(service.id) }"
            @click="handleClick(service)"
            @mouseenter="handleHover(service.id)"
          >
            <div class="service-icon">
              <span class="icon-letter">{{ service.name.charAt(0) }}</span>
            </div>
            <div class="service-info">
              <div class="service-name">{{ service.name }}</div>
              <div class="service-identifier">{{ service.identifier || '无账号信息' }}</div>
            </div>
            <div class="service-code">
              <div v-if="codeMap[service.id]" class="code-display">
                <span class="code-text">{{ codeMap[service.id] }}</span>
                <span class="countdown" :class="{ warning: countdownMap[service.id] <= 10 }">
                  {{ countdownMap[service.id] || 30 }}s
                </span>
              </div>
              <div v-else class="code-placeholder">点击获取</div>
            </div>
            <div class="service-action">
              <button
                class="fav-btn"
                :class="{ active: isFavorite(service.id) }"
                :title="isFavorite(service.id) ? '取消收藏' : '收藏到快捷键'"
                @click.stop="handleToggleFav(service)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" :fill="isFavorite(service.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
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
          </div>
        </div>
      </div>
    </div>

    <div v-if="showToast" class="toast">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useServiceStore } from '../stores/service.js';
import api from '../api/index.js';

const router = useRouter();
const serviceStore = useServiceStore();

const searchQuery = ref('');
const codeMap = ref({});
const countdownMap = ref({});
const showToast = ref(false);
const toastMessage = ref('');

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

async function handleSearch() {
  await serviceStore.fetchServices();
}

async function handleRefresh() {
  serviceStore.lastFetch = 0;
  await serviceStore.fetchServices();
}

async function handleClick(service) {
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

async function loadCode(id) {
  const cached = serviceStore.getCachedCode(id);
  if (cached) {
    codeMap.value[id] = cached;
    return;
  }

  const result = await serviceStore.getCode(id);
  if (result) {
    codeMap.value[id] = result.code;
    countdownMap.value[id] = result.remainSeconds;
    serviceStore.cacheCode(id, result.code, result.remainSeconds);
    startCountdown(id, result.remainSeconds);
  }
}

function startCountdown(id, seconds) {
  if (countdownTimers[id]) clearInterval(countdownTimers[id]);
  countdownTimers[id] = setInterval(() => {
    seconds -= 1;
    countdownMap.value[id] = seconds;
    if (seconds <= 0) {
      clearInterval(countdownTimers[id]);
      delete countdownTimers[id];
      delete codeMap.value[id];
      delete countdownMap.value[id];
    }
  }, 1000);
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
});

onUnmounted(() => {
  Object.values(countdownTimers).forEach(clearInterval);
  window.removeEventListener('keydown', handleKeydown);
});

watch(searchQuery, () => {
  codeMap.value = {};
  countdownMap.value = {};
});
</script>

<style scoped>
.services-page {
  padding: 16px;
  min-height: 100%;
}

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
  width: 28px;
  height: 28px;
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