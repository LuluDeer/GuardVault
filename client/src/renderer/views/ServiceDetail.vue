<template>
  <div class="detail-page">
    <div class="back-btn" @click="$router.back()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      <span>返回</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="detail-content">
      <div class="service-header">
        <div class="header-icon">
          <span class="icon-letter">{{ service?.name?.charAt(0) }}</span>
        </div>
        <div class="header-info">
          <h2 class="service-name">{{ service?.name }}</h2>
          <span class="category-tag">{{ service?.category }}</span>
        </div>
      </div>

      <div class="code-card">
        <div class="code-display">
          <span v-if="code" class="code-text">{{ code }}</span>
          <span v-else class="code-loading">获取中...</span>
        </div>
        <div class="code-meta">
          <span class="countdown" :class="{ warning: remainSeconds <= 10 }">
            {{ remainSeconds }}秒后刷新
          </span>
          <span class="digits">{{ service?.digits }}位</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressWidth }"></div>
        </div>
        <button class="copy-btn" @click="handleCopy">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>复制</span>
        </button>
      </div>

      <div class="info-section">
        <h3>服务信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>账号/ARN</label>
            <span>{{ service?.identifier || '-' }}</span>
          </div>
          <div class="info-item">
            <label>服务地址</label>
            <span>{{ service?.url || '-' }}</span>
          </div>
          <div class="info-item">
            <label>周期</label>
            <span>{{ service?.period }}秒</span>
          </div>
          <div class="info-item">
            <label>算法</label>
            <span>{{ service?.algorithm }}</span>
          </div>
        </div>
        <div v-if="service?.remark" class="info-item full">
          <label>备注</label>
          <span>{{ service.remark }}</span>
        </div>
      </div>
    </div>

    <div v-if="showToast" class="toast">已复制到剪贴板</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api/index.js';

const route = useRoute();
const service = ref(null);
const code = ref('');
const remainSeconds = ref(30);
const loading = ref(true);
const showToast = ref(false);

let countdownTimer = null;

const progressWidth = computed(() => {
  return `${(remainSeconds.value / (service.value?.period || 30)) * 100}%`;
});

async function fetchService() {
  loading.value = true;
  try {
    const result = await api.getServiceDetail(route.params.id);
    if (result.code === 0) {
      service.value = result.data;
      await fetchCode();
    }
  } catch (err) {
    console.error('Failed to fetch service:', err);
  } finally {
    loading.value = false;
  }
}

async function fetchCode() {
  try {
    const result = await api.getServiceCode(route.params.id);
    if (result.code === 0) {
      code.value = result.data.code;
      remainSeconds.value = result.data.remainSeconds;
      startCountdown();
    }
  } catch (err) {
    console.error('Failed to fetch code:', err);
  }
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    remainSeconds.value -= 1;
    if (remainSeconds.value <= 0) {
      fetchCode();
    }
  }, 1000);
}

async function handleCopy() {
  if (!code.value) return;
  await api.copy(code.value);
  await api.reportCopy(route.params.id);
  showToast.value = true;
  setTimeout(() => { showToast.value = false; }, 2000);
}

onMounted(() => {
  fetchService();
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<style scoped>
.detail-page {
  padding: 20px;
  min-height: 100%;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 24px;
  transition: color 0.2s;
}

.back-btn:hover { color: #fff; }

.loading {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.service-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05));
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-letter {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.service-name {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.category-tag {
  font-size: 12px;
  color: rgba(255,255,255,0.7);
  background: rgba(255,255,255,0.1);
  padding: 2px 10px;
  border-radius: 10px;
  width: fit-content;
}

.code-card {
  background: rgba(0,0,0,0.2);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.code-display {
  width: 100%;
  text-align: center;
}

.code-text {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 8px;
}

.code-loading {
  font-size: 16px;
  color: rgba(255,255,255,0.5);
}

.code-meta {
  display: flex;
  gap: 16px;
}

.countdown {
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  padding: 4px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
}

.countdown.warning {
  color: #f56c6c;
  background: rgba(245,108,108,0.2);
}

.digits {
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  padding: 4px 12px;
  background: rgba(255,255,255,0.1);
  border-radius: 12px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #67c23a, #409eff);
  border-radius: 3px;
  transition: width 1s linear;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 32px;
  border: none;
  border-radius: 10px;
  background: rgba(103,194,58,0.3);
  color: #67c23a;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(103,194,58,0.4);
  transform: translateY(-2px);
}

.info-section {
  background: rgba(0,0,0,0.15);
  border-radius: 16px;
  padding: 20px;
}

.info-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
  margin: 0 0 16px 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item.full { grid-column: span 2; }

.info-item label {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
}

.info-item span {
  font-size: 14px;
  color: #fff;
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