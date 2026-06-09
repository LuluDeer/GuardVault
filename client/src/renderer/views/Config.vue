<template>
  <div class="config-wrap">
    <div class="config-card">
      <!-- 顶部：返回按钮 + 标题 -->
      <div class="header">
        <button class="back-btn" @click="goBack" title="返回登录页">←</button>
        <div class="title">服务端配置</div>
        <div style="width:32px"></div>
      </div>
      <div class="desc">请配置 TOTP 服务端地址</div>

      <!-- 局域网发现结果 -->
      <div class="discover-section">
        <div class="discover-header">
          <span class="discover-title">局域网内的服务端</span>
          <button class="link-btn small" :disabled="scanning" @click="runDiscover">
            {{ scanning ? '扫描中…' : '重新扫描' }}
          </button>
        </div>

        <div v-if="scanning && discovered.length === 0" class="discover-hint">
          正在扫描本机所在 /24 网段…
        </div>

        <div v-else-if="!scanning && discovered.length === 0" class="discover-hint warn">
          未发现可用的服务端。可手动输入地址，或检查网络是否在同一局域网内。
        </div>

        <ul v-else class="discover-list">
          <li
            v-for="s in discovered"
            :key="s.url"
            class="discover-item"
            :class="{ active: serverUrl === s.url }"
            @click="selectDiscovered(s)"
          >
            <div class="dot"></div>
            <div class="meta">
              <div class="url">{{ s.url }}</div>
              <div class="latency">延迟 {{ s.latencyMs }} ms</div>
            </div>
            <div v-if="serverUrl === s.url" class="badge">已选</div>
          </li>
        </ul>
      </div>

      <!-- 手动输入 -->
      <div class="form-group">
        <label>服务端地址（也可手动输入）</label>
        <input
          v-model="serverUrl"
          type="text"
          placeholder="http://192.168.1.10:3001"
          @keyup.enter="handleSave"
        />
      </div>

      <button :disabled="!serverUrl.trim() || loading" @click="handleSave">
        {{ loading ? '配置中…' : '保存配置' }}
      </button>

      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api';

const router = useRouter();
const auth = useAuthStore();

const serverUrl = ref('');
const loading = ref(false);
const error = ref('');
const scanning = ref(false);
const discovered = ref([]);

function goBack() {
  // 取消配置，回到登录页（不修改 serverUrl）
  router.replace('/login');
}

function selectDiscovered(s) {
  serverUrl.value = s.url;
  error.value = '';
}

async function runDiscover() {
  scanning.value = true;
  error.value = '';
  try {
    // 把当前已配的 serverUrl 也作为 hint 带上，防止跨网段
    const cfg = await api.getConfig();
    const extra = [];
    if (cfg?.serverUrl) {
      try {
        const u = new URL(cfg.serverUrl);
        extra.push(`${u.hostname}:${u.port || 3001}`);
      } catch {}
    }
    const r = await api.discoverServers({ port: 3001, timeoutMs: 1500, extraHosts: extra });
    if (r?.ok) {
      discovered.value = r.list || [];
    } else {
      discovered.value = [];
    }
  } catch (e) {
    discovered.value = [];
  } finally {
    scanning.value = false;
  }
}

async function handleSave() {
  const url = serverUrl.value.trim();
  if (!url) return;
  loading.value = true;
  error.value = '';
  try {
    // /health 直接返回 {status:'ok', time:'...'}，没用 ApiResponse 包装。
    // 兼容两种形态：{code:0, data:{status:'ok'}} 和 {status:'ok'}；只要网络没断、body 里有 status:'ok' 即可
    const probe = await api.request({ method: 'GET', url: '/health' });
    const ok = probe && (probe.status === 'ok' || (probe.code === 0 && probe.data?.status === 'ok'));
    if (!ok) {
      error.value = '无法连接到该地址，请检查服务端是否启动';
      return;
    }
    await auth.setServerUrl(url);
    router.replace('/login');
  } catch (e) {
    error.value = '无法连接到该地址，请检查网络和服务端';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  serverUrl.value = auth.serverUrl || '';
  // 自动触发一次扫描
  await runDiscover();
});
</script>

<style scoped>
.config-wrap {
  min-height: calc(100vh - 32px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.config-card {
  background: white;
  border-radius: 16px;
  padding: 32px 28px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.title {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  text-align: center;
  flex: 1;
}
.back-btn {
  background: none;
  border: none;
  font-size: 22px;
  color: #606266;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-btn:hover { background: #f0f0f0; }

.desc {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin-bottom: 18px;
}

.discover-section {
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 18px;
}
.discover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.discover-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.discover-hint {
  font-size: 12px;
  color: #909399;
  padding: 6px 4px;
}
.discover-hint.warn { color: #e6a23c; }

.discover-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}
.discover-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.discover-item:hover { background: #ecf5ff; }
.discover-item.active { background: #ecf5ff; outline: 1px solid #409eff; }
.discover-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #67c23a;
  box-shadow: 0 0 0 3px rgba(103,194,58,0.15);
  flex-shrink: 0;
}
.discover-item .meta { flex: 1; min-width: 0; }
.discover-item .url {
  font-size: 13px;
  color: #303133;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.discover-item .latency {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}
.badge {
  font-size: 11px;
  background: #409eff;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.form-group { margin-bottom: 16px; }
.form-group label {
  display: block;
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}
.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.form-group input:focus { border-color: #667eea; }

button {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
button:hover:not(:disabled) { opacity: 0.9; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.link-btn {
  background: none;
  color: #667eea;
  border: none;
  font-size: 12px;
  cursor: pointer;
  text-decoration: none;
  padding: 2px 6px;
  width: auto;
}
.link-btn.small { font-size: 12px; }
.link-btn:disabled { color: #c0c4cc; cursor: not-allowed; }

.error {
  background: #fee;
  color: #c33;
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 12px;
  font-size: 13px;
  text-align: center;
}
</style>
