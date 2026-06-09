<template>
  <div id="app" :class="{ 'dark-mode': darkMode }">
    <div class="titlebar">
      <div class="titlebar-drag"></div>
      <div class="titlebar-buttons">
        <button class="tb-btn" title="最小化" @click="winMinimize">
          <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1"/></svg>
        </button>
        <button class="tb-btn" title="最大化" @click="winToggleMaximize">
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/></svg>
        </button>
        <button class="tb-btn close" title="关闭" @click="winClose">
          <svg width="12" height="12" viewBox="0 0 12 12"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1"/></svg>
        </button>
      </div>
    </div>
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from './api/index.js';
import { useAuthStore } from './stores/auth';

const darkMode = ref(true);

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }
}

const winMinimize = () => window.electronAPI?.minimize?.();
const winClose = () => window.electronAPI?.closeWindow?.();
const winToggleMaximize = () => window.electronAPI?.toggleMaximize?.();

onMounted(async () => {
  console.log('App mounted, hiding loading screen...');
  hideLoadingScreen();

  const auth = useAuthStore();

  try {
    console.log('Starting bootstrap...');
    await auth.bootstrap();
    console.log('Bootstrap done, getting config...');
    const config = await api.getConfig();
    darkMode.value = config?.darkMode ?? true;
    console.log('Config loaded:', config);
  } catch (error) {
    console.error('初始化失败:', error);
  }
});
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

#app {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding-top: 32px; /* 给标题栏让位 */
}

#app.dark-mode {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #fff;
}

/* ===== 自定义标题栏 ===== */
.titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  z-index: 9999;
  display: flex;
  background: rgba(0, 0, 0, 0.25);
  -webkit-app-region: drag;
  user-select: none;
}
.titlebar-drag { flex: 1; height: 100%; }
.titlebar-buttons { display: flex; -webkit-app-region: no-drag; }
.tb-btn {
  width: 46px;
  height: 32px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.tb-btn:hover { background: rgba(255, 255, 255, 0.12); }
.tb-btn.close:hover { background: #e81123; }

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>