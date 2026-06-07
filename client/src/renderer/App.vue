<template>
  <div id="app" :class="{ 'dark-mode': darkMode }">
    <router-view />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from './api/index.js';

const darkMode = ref(true);

onMounted(async () => {
  try {
    const config = await api.getConfig();
    darkMode.value = config?.darkMode ?? true;
  } catch {}
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
}

#app.dark-mode {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #fff;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.3);
}
</style>