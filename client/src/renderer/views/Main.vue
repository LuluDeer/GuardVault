<template>
  <div class="main-wrap">
    <div class="header">
      <div class="user-info">
        <span class="username">{{ auth.user?.username }}</span>
        <span class="status" :class="auth.online ? 'online' : 'offline'">
          {{ auth.online ? t('common.online') : t('common.offline') }}
        </span>
      </div>
      <div class="menu">
        <button class="menu-btn" @click="auth.showPassword = true">{{ t('main.changePassword') }}</button>
        <button class="menu-btn logout" @click="handleLogout">{{ t('main.logout') }}</button>
      </div>
    </div>

    <div class="content">
      <div class="code-box" :class="{ expired: countdown <= 5 }">
        <div class="code">{{ totpCode || t('main.codePlaceholder') }}</div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: countdownPct + '%', background: progressColor }"></div>
        </div>
        <div class="countdown">{{ t('main.countdownRefresh', { seconds: countdown }) }}</div>
      </div>

      <button class="copy-btn" :disabled="!totpCode || copying" @click="handleCopy">
        {{ copying ? t('main.copied') : t('main.copyCode') }}
      </button>
    </div>

    <div class="footer">
      <span>{{ t('main.closeToTray') }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useI18n } from '../i18n';
import api from '../api';

const auth = useAuthStore();
const { t } = useI18n();
const totpCode = ref('');
const countdown = ref(30);
const copying = ref(false);
let timer = null;

const countdownPct = computed(() => (countdown.value / 30) * 100);
const progressColor = computed(() => {
  if (countdown.value > 15) return '#67c23a';
  if (countdown.value > 8) return '#e6a23c';
  return '#f56c6c';
});

async function fetchCode() {
  try {
    const result = await api.getTotpCode();
    if (result.code === 0) {
      totpCode.value = result.data.code;
      countdown.value = result.data.remainSeconds || 30;
    } else {
      totpCode.value = '';
    }
  } catch {
    totpCode.value = '';
  }
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      fetchCode();
    }
  }, 1000);
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null; }
}

// 窗口从后台回到前台时立即重拉一次（后台时 setInterval 会被节流/暂停，
// 倒计时数值可能与实际 TOTP 不一致）
function handleForeground() {
  if (document.visibilityState === 'visible') fetchCode();
}

async function handleCopy() {
  if (!totpCode.value) return;
  api.copy(totpCode.value);
  copying.value = true;
  setTimeout(() => { copying.value = false; }, 2000);
}

function handleLogout() {
  auth.logout();
}

onMounted(() => {
  fetchCode().then(startTimer);
  window.addEventListener('focus', handleForeground);
  document.addEventListener('visibilitychange', handleForeground);
});

onUnmounted(() => {
  stopTimer();
  window.removeEventListener('focus', handleForeground);
  document.removeEventListener('visibilitychange', handleForeground);
});
</script>

<style scoped>
.main-wrap {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  min-height: calc(100vh - 36px - 32px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.user-info { display: flex; align-items: center; gap: 12px; }
.username { font-size: 14px; font-weight: 600; color: #303133; }

.status { font-size: 12px; padding: 2px 8px; border-radius: 10px; }
.status.online { background: #e8f5e9; color: #67c23a; }
.status.offline { background: #fef0f0; color: #f56c6c; }

.menu { display: flex; gap: 8px; }
.menu-btn {
  padding: 6px 12px; font-size: 12px; border: none; border-radius: 4px;
  cursor: pointer; background: #f5f7fa; color: #606266; transition: background 0.2s;
}
.menu-btn:hover { background: #e4e7ed; }
.menu-btn.logout { color: #f56c6c; background: #fef0f0; }

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.code-box { text-align: center; margin-bottom: 30px; }
.code {
  font-size: 64px;
  font-weight: 700;
  letter-spacing: 8px;
  color: #303133;
  font-family: 'Courier New', monospace;
  margin-bottom: 16px;
}
.code-box.expired .code { color: #f56c6c; }
.progress-bar {
  width: 240px; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;
  margin: 0 auto 8px;
}
.progress { height: 100%; transition: width 1s linear, background 0.3s; }
.countdown { font-size: 13px; color: #909399; }

.copy-btn {
  padding: 12px 40px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.copy-btn:hover:not(:disabled) { opacity: 0.9; }
.copy-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.footer {
  text-align: center;
  padding: 12px;
  font-size: 12px;
  color: #909399;
  border-top: 1px solid #f0f0f0;
}
</style>
