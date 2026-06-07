import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('user_token') || '');
  const username = ref(localStorage.getItem('user_username') || '');
  const serverUrl = ref('http://localhost:3000');
  const showPassword = ref(false);

  async function initServerUrl() {
    try {
      const result = await window.electronAPI.getServerUrl();
      if (result) serverUrl.value = result;
    } catch {
      // keep default
    }
  }

  function setServerUrl(url) {
    serverUrl.value = url;
    window.electronAPI.setServerUrl(url);
  }

  function login(tokenValue, usernameValue) {
    token.value = tokenValue;
    username.value = usernameValue;
    localStorage.setItem('user_token', tokenValue);
    localStorage.setItem('user_username', usernameValue);
  }

  function logout() {
    token.value = '';
    username.value = '';
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_username');
  }

  function showPasswordChange() {
    showPassword.value = true;
  }

  function hidePasswordChange() {
    showPassword.value = false;
  }

  return {
    token,
    username,
    serverUrl,
    showPassword,
    initServerUrl,
    setServerUrl,
    login,
    logout,
    showPasswordChange,
    hidePasswordChange
  };
});