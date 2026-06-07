import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../api/index.js';

export const useServiceStore = defineStore('service', () => {
  const services = ref([]);
  const loading = ref(false);
  const lastFetch = ref(0);
  const codeCache = ref({});
  const countdownTimers = ref({});

  const categories = computed(() => {
    const cats = new Set(services.value.map(s => s.category));
    return Array.from(cats);
  });

  const groupedServices = computed(() => {
    const groups = {};
    services.value.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  });

  async function fetchServices() {
    const now = Date.now();
    if (now - lastFetch.value < 60000 && services.value.length > 0) return;

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

  return {
    services,
    loading,
    categories,
    groupedServices,
    fetchServices,
    getCode,
    cacheCode,
    getCachedCode,
    startCountdown,
    stopCountdown,
    clearAllTimers,
    copyCode,
  };
});