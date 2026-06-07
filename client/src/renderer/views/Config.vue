<template>
  <div class="config-wrap">
    <div class="config-card">
      <div class="title">服务端配置</div>
      <div class="desc">请配置 TOTP 服务端地址</div>
      
      <div class="form-group">
        <label>服务端地址</label>
        <input 
          v-model="serverUrl" 
          type="text" 
          placeholder="http://localhost:3000"
          @keyup.enter="handleSave"
        />
      </div>
      
      <button :disabled="!serverUrl.trim()" @click="handleSave">
        {{ loading ? '配置中...' : '保存配置' }}
      </button>
      
      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const auth = useAuthStore();
const serverUrl = ref('');
const loading = ref(false);
const error = ref('');

onMounted(() => {
  serverUrl.value = auth.serverUrl || '';
});

async function handleSave() {
  if (!serverUrl.value.trim()) return;
  loading.value = true;
  error.value = '';
  try {
    // 先测连通
    const probe = await api.request({ method: 'GET', url: '/health' });
    if (probe?.status !== 'ok') {
      error.value = '无法连接到该地址，请检查服务端是否启动';
      return;
    }
    await auth.setServerUrl(serverUrl.value.trim());
  } catch (e) {
    error.value = '无法连接到该地址，请检查网络和服务端';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.config-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.config-card {
  background: white;
  border-radius: 16px;
  padding: 40px 30px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  text-align: center;
  margin-bottom: 8px;
}

.desc {
  font-size: 14px;
  color: #909399;
  text-align: center;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

button {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  margin-top: 16px;
  padding: 12px;
  background: #fef0f0;
  color: #f56c6c;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
}
</style>