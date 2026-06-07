<template>
  <div id="app">
    <transition name="fade" mode="out-in">
      <component :is="currentView" />
    </transition>
  </div>
</template>

<script setup>import { computed, onMounted } from 'vue';
import { useAuthStore } from './stores/auth';
import ConfigView from './views/Config.vue';
import LoginView from './views/Login.vue';
import MainView from './views/Main.vue';
import PasswordView from './views/Password.vue';
const auth = useAuthStore();
onMounted(() => {
  auth.initServerUrl();
});
const currentView = computed(() => {
 if (!auth.serverUrl)
 return ConfigView;
 if (!auth.token)
 return LoginView;
 if (auth.showPassword)
 return PasswordView;
 return MainView;
});
</script>

<style>
body {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>