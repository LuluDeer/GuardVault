<template>
  <div class="main-wrap">
    <div class="header">
      <div class="user-info">
        <span class="username">{{ auth.username }}</span>
        <span class="status" :class="{ online: isOnline, offline: !isOnline }">
          {{ isOnline ? '在线' : '离线' }}
        </span>
      </div>
      <div class="menu">
        <button class="menu-btn" @click="showPasswordChange">修改密码</button>
        <button class="menu-btn logout" @click="handleLogout">退出</button>
      </div>
    </div>
    
    <div class="content">
      <div class="code-box" :class="{ expired: countdown <= 5 }">
        <div class="code">{{ totpCode || '------' }}</div>
        <div class="progress-bar">
          <div class="progress" :style="{ width: countdownPct + '%', background: progressColor }"></div>
        </div>
        <div class="countdown">{{ countdown }}秒后刷新</div>
      </div>
      
      <button class="copy-btn" :disabled="!totpCode || copying" @click="handleCopy">
        {{ copying ? '已复制!' : '复制验证码' }}
      </button>
    </div>
    
    <div class="footer">
      <span>关闭窗口将最小化到托盘</span>
    </div>
  </div>
</template>

<script setup>import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { getTotpCode } from '../api';
const auth = useAuthStore();
const totpCode = ref('');
const countdown = ref(30);
const isOnline = ref(true);
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
    isOnline.value = true;
    const result = await getTotpCode();
    
    if (result.code === 0) {
      totpCode.value = result.data.code;
      countdown.value = result.data.remainSeconds || 30;
    } else {
      if (result.code === 401) {
        auth.logout();
      }
      totpCode.value = '';
      isOnline.value = false;
    }
  } catch {
    totpCode.value = '';
    isOnline.value = false;
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
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

async function handleCopy() {
  if (!totpCode.value) return;
  try {
    await window.electronAPI.copyToClipboard(totpCode.value);
    copying.value = true;
    setTimeout(() => {
      copying.value = false;
    }, 2000);
  } catch {}
}

function handleLogout() {
  auth.logout();
}

function showPasswordChange() {
  auth.showPasswordChange();
}

onMounted(() => {
  fetchCode().then(() => {
    startTimer();
  });
});

onUnmounted(() => {
  stopTimer();
});
</script>

<style scoped>
.main-wrap {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.username {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.status.online {
  background: #e8f5e9;
  color: #67c23a;
}

.status.offline {
  background: #fef0f0;
  color: #f56c6c;
}

.menu {
  display: flex;
  gap: 8px;
}

.menu-btn {
  padding: 6px 12px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #f5f7fa;
  color: #606266;
  transition: background 0.2s;
}

.menu-btn:hover {
  background: #e4e7ed;
}

.menu-btn.logout {
  color: #f56c6c;
  background: #fef0f0;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.code-box {
  text-align: center;
  padding: 30px 40px;
  background: #fafafa;
  border-radius: 16px;
  width: 100%;
  max-width: 320px;
}

.code-box.expired {
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.code {
  font-size: 48px;
  font-weight: 700;
  letter-spacing: 12px;
  color: #303133;
  font-family: 'Courier New', monospace;
  margin-bottom: 20px;
}

.progress-bar {
  height: 8px;
  background: #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress {
  height: 100%;
  border-radius: 4px;
  transition: width 1s linear, background 0.3s;
}

.countdown {
  font-size: 13px;
  color: #909399;
}

.copy-btn {
  margin-top: 24px;
  width: 100%;
  max-width: 320px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.copy-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.footer {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: #909399;
  border-top: 1px solid #f0f0f0;
}
</style>