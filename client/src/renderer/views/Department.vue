<template>
  <div class="dept-page">
    <div class="page-header">
      <div class="user-info">
        <button class="back-btn" @click="$router.push('/services')" title="返回服务列表">‹</button>
        <span class="title">部门管理</span>
        <span v-if="dept" class="dept-tag">{{ dept.name }}（{{ dept.code }}）</span>
      </div>
      <div class="header-actions">
        <button class="ghost-btn" @click="fetchAll" :disabled="loading">刷新</button>
        <button class="ghost-btn" @click="$router.push('/services')">返回服务</button>
        <button class="ghost-btn danger" @click="handleLogout">退出登录</button>
      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div><span>加载中...</span></div>

    <div v-else-if="!canManage" class="empty">
      <p>仅部门管理员或超级管理员可使用该功能</p>
    </div>

    <div v-else class="dept-body">
      <div class="toolbar">
        <input v-model="keyword" type="text" placeholder="按用户名搜索..." class="search-input" @keyup.enter="fetchMembers" />
        <select v-model="roleFilter" class="select" @change="fetchMembers">
          <option value="">全部角色</option>
          <option value="user">普通用户</option>
          <option value="dept_admin">部门管理员</option>
        </select>
        <button class="primary-btn" @click="openCreateMember">+ 创建用户</button>
        <button class="primary-btn ghost" @click="openCreateService">+ 代创建服务</button>
      </div>

      <div v-if="members.length === 0" class="empty small">
        <p>本部门暂无成员</p>
      </div>
      <table v-else class="member-table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>角色</th>
            <th>状态</th>
            <th>已授权服务</th>
            <th class="th-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.id" :class="{ disabled: m.status === 0 }">
            <td class="username-cell">
              <div class="u-name">{{ m.username }}</div>
              <div class="u-sub">#{{ m.id }}</div>
            </td>
            <td>
              <span class="role-tag" :class="`role-${m.role}`">{{ roleLabel(m.role) }}</span>
            </td>
            <td>
              <span :class="['status-tag', m.status === 1 ? 'on' : 'off']">
                {{ m.status === 1 ? '启用' : '禁用' }}
              </span>
            </td>
            <td>
              <button class="link-btn" :disabled="!canOperateMember(m)" @click="openGrantFor(m)">
                授权管理 ({{ grantedCount(m.id) }})
              </button>
            </td>
            <td class="td-actions">
              <button class="link-btn" :disabled="!canOperateMember(m)" @click="openResetPwdFor(m)">改密</button>
              <button class="link-btn" :disabled="!canOperateMember(m)" @click="toggleMemberStatus(m)">
                {{ m.status === 1 ? '禁用' : '启用' }}
              </button>
              <button v-if="m.role === 'user' && isSuperAdmin" class="link-btn warn" @click="handleAppoint(m)">任命管理员</button>
              <button v-else-if="m.role === 'dept_admin' && isSuperAdmin" class="link-btn" @click="handleRevoke(m)">撤销管理员</button>

            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 重置密码弹窗 -->
    <div v-if="resetPwdTarget" class="modal-mask" @click.self="resetPwdTarget = null">
      <div class="modal-box">
        <div class="modal-title">重置密码 — {{ resetPwdTarget.username }}</div>
        <div class="modal-body">
          <div class="form-row">
            <label>新密码 *</label>
            <input v-model="resetPwdValue" type="text" placeholder="至少 6 位" class="text-input" />
          </div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="resetPwdTarget = null">取消</button>
          <button class="modal-btn confirm" :disabled="saving" @click="submitResetPwd">保存</button>
        </div>
      </div>
    </div>

    <!-- 授权管理弹窗 -->
    <div v-if="grantTarget" class="modal-mask" @click.self="grantTarget = null">
      <div class="modal wide">
        <div class="modal-header">授权管理 — {{ grantTarget.username }}</div>
        <div class="modal-body">
          <div class="grant-toolbar">
            <input v-model="grantKeyword" type="text" placeholder="搜索服务..." class="search-input" />
          </div>
          <table class="member-table small">
            <thead>
              <tr>
                <th>服务名</th>
                <th>所属部门</th>
                <th>已授权</th>
                <th class="th-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filteredServices" :key="s.id">
                <td>
                  <div class="u-name">{{ s.name }}</div>
                  <div class="u-sub">{{ s.identifier || '—' }}</div>
                </td>
                <td>{{ s.deptId ? s.deptName : '共享' }}</td>
                <td>
                  <span :class="['status-tag', isGranted(s.id) ? 'on' : 'off']">
                    {{ isGranted(s.id) ? '已授权' : '未授权' }}
                  </span>
                </td>
                <td class="td-actions">
                  <button v-if="!isGranted(s.id)" class="link-btn warn" @click="handleGrant(s)">授权</button>
                  <button v-else class="link-btn" @click="handleRevokeGrant(s)">撤销</button>
                </td>
              </tr>
              <tr v-if="filteredServices.length === 0">
                <td colspan="4" class="empty-cell">无匹配服务</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="ghost-btn" @click="grantTarget = null">关闭</button>
        </div>
      </div>
    </div>

    <!-- 创建用户弹窗 -->
    <div v-if="createMember" class="modal-mask" @click.self="createMember = false">
      <div class="modal">
        <div class="modal-header">创建用户{{ dept ? ` — ${dept.name}` : '' }}</div>
        <div class="modal-body">
          <div class="form-row">
            <label>用户名 *</label>
            <input v-model="memberForm.username" type="text" placeholder="3-32 位字母数字下划线" class="text-input" />
          </div>
          <div class="form-row">
            <label>初始密码 *</label>
            <input v-model="memberForm.password" type="text" placeholder="至少 6 位" class="text-input" />
          </div>
          <div class="form-row">
            <label>角色</label>
            <select v-model="memberForm.role" class="select" :disabled="isPureDeptAdmin">
              <option value="user">普通用户</option>
              <option v-if="!isPureDeptAdmin" value="dept_admin">部门管理员</option>
            </select>
            <div v-if="isPureDeptAdmin" class="form-tip">部门管理员只能创建普通用户</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="ghost-btn" @click="createMember = false">取消</button>
          <button class="primary-btn" :disabled="saving" @click="submitCreateMember">创建</button>
        </div>
      </div>
    </div>

    <!-- 代创建服务弹窗 -->
    <div v-if="createService" class="modal-mask" @click.self="createService = false">
      <div class="modal">
        <div class="modal-header">代创建服务</div>
        <div class="modal-body">
          <div class="form-row">
            <label>服务名 *</label>
            <input v-model="serviceForm.name" type="text" placeholder="如：Jenkins" class="text-input" />
          </div>
          <div class="form-row">
            <label>分类</label>
            <input v-model="serviceForm.category" type="text" placeholder="如：开发工具" class="text-input" />
          </div>
          <div class="form-row">
            <label>账号</label>
            <input v-model="serviceForm.identifier" type="text" placeholder="如：admin@company.com" class="text-input" />
          </div>
          <div class="form-row">
            <label>URL</label>
            <input v-model="serviceForm.url" type="text" placeholder="https://..." class="text-input" />
          </div>
          <div class="form-row">
            <label>TOTP 密钥（Base32，留空则自动生成）</label>
            <input v-model="serviceForm.secret" type="text" placeholder="JBSWY3DPEHPK3PXP..." class="text-input" />
          </div>
          <div class="form-row inline">
            <div>
              <label>位数</label>
              <select v-model.number="serviceForm.digits" class="select">
                <option :value="6">6</option>
                <option :value="8">8</option>
              </select>
            </div>
            <div>
              <label>周期(秒)</label>
              <select v-model.number="serviceForm.period" class="select">
                <option :value="30">30</option>
                <option :value="60">60</option>
              </select>
            </div>
            <div>
              <label>算法</label>
              <select v-model="serviceForm.algorithm" class="select">
                <option value="SHA1">SHA1</option>
                <option value="SHA256">SHA256</option>
                <option value="SHA512">SHA512</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="ghost-btn" @click="createService = false">取消</button>
          <button class="primary-btn" :disabled="saving" @click="submitCreateService">创建</button>
        </div>
      </div>
    </div>

    <div v-if="showToast" class="toast">{{ toastMessage }}</div>

    <!-- 自定义确认弹窗 -->
    <div v-if="confirmDialog.visible" class="modal-mask" @click.self="onConfirmCancel">
      <div class="modal-box">
        <div class="modal-title">{{ confirmDialog.title }}</div>
        <div class="modal-body">{{ confirmDialog.body }}</div>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="onConfirmCancel">取消</button>
          <button class="modal-btn confirm" @click="onConfirmOk">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api/index.js';

const router = useRouter();
const auth = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const dept = ref(null);
const members = ref([]);
const services = ref([]);
const grantsByUser = ref({}); // userId -> [{accountId, ...}]

const keyword = ref('');
const roleFilter = ref('');
const grantKeyword = ref('');

const resetPwdTarget = ref(null);
const resetPwdValue = ref('');
const grantTarget = ref(null);
const createMember = ref(false);
const memberForm = ref({ username: '', password: '', role: 'user' });
const createService = ref(false);
const serviceForm = ref({
  name: '',
  category: '',
  identifier: '',
  url: '',
  secret: '',
  digits: 6,
  period: 30,
  algorithm: 'SHA1',
});

const showToast = ref(false);
const toastMessage = ref('');

// ---------- 自定义确认弹窗 ----------
const confirmDialog = ref({ visible: false, title: '', body: '', resolve: null });
function showConfirm(title, body) {
  return new Promise(resolve => {
    confirmDialog.value = { visible: true, title, body, resolve };
  });
}
function onConfirmOk() {
  confirmDialog.value.visible = false;
  confirmDialog.value.resolve?.(true);
}
function onConfirmCancel() {
  confirmDialog.value.visible = false;
  confirmDialog.value.resolve?.(false);
}

const canManage = computed(() => ['dept_admin', 'super_admin'].includes(auth.user?.role));

// 部门管理员视角：只能创建 user；超管可选 user / dept_admin
const isPureDeptAdmin = computed(() => auth.user?.role === 'dept_admin');
// 任命/撤销部门管理员：仅超管
const isSuperAdmin = computed(() => auth.user?.role === 'super_admin');

// 当前操作者能否对该成员执行"管理类"操作（启停 / 改密 / 授权 / 删）
// super_admin: 任何非自己的成员
// dept_admin: 只能管自己部门的 user（部门管理员之间不能互操）
// 其他: 拒绝
function canOperateMember(m) {
  if (!m || !auth.user) return false;
  if (m.id === auth.user.id) return false;
  if (auth.user.role === 'super_admin') return true;
  if (auth.user.role === 'dept_admin') {
    // dept_admin 只能操作普通用户，不能操作其他 dept_admin
    return m.role === 'user';
  }
  return false;
}

const filteredServices = computed(() => {
  const kw = grantKeyword.value.trim().toLowerCase();
  if (!kw) return services.value;
  return services.value.filter(s =>
    (s.name || '').toLowerCase().includes(kw) ||
    (s.identifier || '').toLowerCase().includes(kw)
  );
});

function roleLabel(r) {
  if (r === 'dept_admin') return '部门管理员';
  if (r === 'super_admin') return '超级管理员';
  return '普通用户';
}

function grantedCount(userId) {
  return (grantsByUser.value[userId] || []).length;
}

function isGranted(serviceId) {
  if (!grantTarget.value) return false;
  return (grantsByUser.value[grantTarget.value.id] || []).some(g => g.accountId === serviceId);
}

function toast(msg) {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => { showToast.value = false; }, 2000);
}

async function fetchAll() {
  if (!canManage.value) return;
  loading.value = true;
  try {
    const info = await api.getMyDeptInfo();
    if (info.code !== 0) throw new Error(info.message || '获取部门信息失败');
    // dept_admin: info.data.dept; super_admin: info.data.depts（多）
    if (info.data.scope === 'self' || info.data.dept) {
      dept.value = info.data.dept;
    } else {
      // super_admin：取第一个部门作为操作上下文
      dept.value = (info.data.depts || [])[0] || null;
    }
    await fetchMembers();
    await fetchServices();
  } catch (e) {
    toast(e.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function fetchMembers() {
  if (!dept.value) return;
  try {
    const r = await api.listDeptMembers({ deptId: dept.value.id, role: roleFilter.value || undefined });
    if (r.code !== 0) throw new Error(r.message || '获取成员失败');
    members.value = r.data.members || [];
    // 拉每个成员的授权
    grantsByUser.value = {};
    await Promise.all(members.value.map(async m => {
      try {
        const sr = await api.request({ method: 'GET', url: `/api/user/dept/grants/${m.id}` }).catch(() => null);
        // 若后端无该接口则忽略，授权时再拉
        if (sr && sr.code === 0) grantsByUser.value[m.id] = sr.data.list || [];
      } catch {}
    }));
  } catch (e) {
    toast(e.message || '加载成员失败');
  }
}

async function fetchServices() {
  try {
    const r = await api.listGrantableServices({ deptId: dept.value?.id });
    if (r.code !== 0) throw new Error(r.message || '获取服务列表失败');
    services.value = r.data.list || [];
  } catch (e) {
    toast(e.message || '加载服务失败');
  }
}

async function handleAppoint(m) {
  if (!await showConfirm('任命管理员', `确定将「${m.username}」任命为部门管理员吗？`)) return;
  try {
    const r = await api.appointDeptAdmin(m.id);
    if (r.code !== 0) throw new Error(r.message || '任命失败');
    toast('已任命');
    await fetchMembers();
  } catch (e) {
    toast(e.message || '任命失败');
  }
}

async function handleRevoke(m) {
  if (!await showConfirm('撤销管理员', `确定撤销「${m.username}」的部门管理员身份吗？`)) return;
  try {
    const r = await api.revokeDeptAdmin(m.id);
    if (r.code !== 0) throw new Error(r.message || '撤销失败');
    toast('已撤销');
    await fetchMembers();
  } catch (e) {
    toast(e.message || '撤销失败');
  }
}

async function handlePromote(m) {
  if (!canOperateMember(m)) { toast('无权操作该成员'); return; }
  if (!await showConfirm('提升角色', `确定将「${m.username}」提升为部门管理员吗？`)) return;
  try {
    const r = await api.updateDeptMember(m.id, { role: 'dept_admin' });
    if (r.code !== 0) throw new Error(r.message || '操作失败');
    toast('已提升为部门管理员');
    await fetchMembers();
  } catch (e) {
    toast(e.message || '操作失败');
  }
}

async function handleDemote(m) {
  if (m.deptId !== auth.user.deptId) { toast('无权操作其他部门成员'); return; }
  if (!await showConfirm('降级角色', `确定将「${m.username}」降级为普通用户吗？`)) return;
  try {
    const r = await api.updateDeptMember(m.id, { role: 'user' });
    if (r.code !== 0) throw new Error(r.message || '操作失败');
    toast('已降级为普通用户');
    await fetchMembers();
  } catch (e) {
    toast(e.message || '操作失败');
  }
}

function openResetPwdFor(m) {
  if (!canOperateMember(m)) {
    toast('部门管理员之间不能互相操作');
    return;
  }
  resetPwdTarget.value = m;
  resetPwdValue.value = '';
}

async function submitResetPwd() {
  if (!resetPwdTarget.value || !canOperateMember(resetPwdTarget.value)) {
    toast('部门管理员之间不能互相操作');
    resetPwdTarget.value = null;
    return;
  }
  if (!resetPwdValue.value || resetPwdValue.value.length < 6) {
    toast('密码至少 6 位');
    return;
  }
  saving.value = true;
  try {
    const r = await api.updateDeptMember(resetPwdTarget.value.id, { password: resetPwdValue.value });
    if (r.code !== 0) throw new Error(r.message || '重置失败');
    toast('密码已重置');
    resetPwdTarget.value = null;
  } catch (e) {
    toast(e.message || '重置失败');
  } finally {
    saving.value = false;
  }
}

async function toggleMemberStatus(m) {
  if (!canOperateMember(m)) {
    toast('部门管理员之间不能互相操作');
    return;
  }
  const next = m.status === 1 ? 0 : 1;
  const label = next === 1 ? '启用' : '禁用';
  if (!await showConfirm(`${label}用户`, `确定${label}「${m.username}」吗？`)) return;
  try {
    const r = await api.updateDeptMember(m.id, { status: next });
    if (r.code !== 0) throw new Error(r.message || '操作失败');
    toast(`已${label}`);
    await fetchMembers();
  } catch (e) {
    toast(e.message || '操作失败');
  }
}

async function openGrantFor(m) {
  if (!canOperateMember(m)) {
    toast('部门管理员之间不能互相操作');
    return;
  }
  grantTarget.value = m;
  grantKeyword.value = '';
  // 拉该用户的授权
  try {
    const r = await api.request({ method: 'GET', url: `/api/user/dept/grants/${m.id}` });
    if (r.code === 0) {
      grantsByUser.value = { ...grantsByUser.value, [m.id]: r.data.list || [] };
    }
  } catch (e) {
    // 兜底：暂不显示
  }
  await fetchServices();
}

async function handleGrant(service) {
  try {
    const r = await api.grantServiceToDeptMember(grantTarget.value.id, service.id);
    if (r.code !== 0) throw new Error(r.message || '授权失败');
    toast('已授权');
    const cur = grantsByUser.value[grantTarget.value.id] || [];
    grantsByUser.value[grantTarget.value.id] = [...cur, { accountId: service.id }];
  } catch (e) {
    toast(e.message || '授权失败');
  }
}

async function handleRevokeGrant(service) {
  if (!await showConfirm('撤销授权', `确定撤销「${grantTarget.value.username}」对「${service.name}」的访问吗？`)) return;
  try {
    const r = await api.revokeServiceFromDeptMember(grantTarget.value.id, service.id);
    if (r.code !== 0) throw new Error(r.message || '撤销失败');
    toast('已撤销');
    const cur = grantsByUser.value[grantTarget.value.id] || [];
    grantsByUser.value[grantTarget.value.id] = cur.filter(g => g.accountId !== service.id);
  } catch (e) {
    toast(e.message || '撤销失败');
  }
}

function openCreateService() {
  serviceForm.value = {
    name: '', category: '', identifier: '', url: '', secret: '',
    digits: 6, period: 30, algorithm: 'SHA1',
  };
  createService.value = true;
}

function openCreateMember() {
  memberForm.value = { username: '', password: '', role: 'user' };
  createMember.value = true;
}

async function submitCreateMember() {
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(memberForm.value.username)) {
    toast('用户名 3-32 位字母数字下划线');
    return;
  }
  if (!memberForm.value.password || memberForm.value.password.length < 6) {
    toast('密码至少 6 位');
    return;
  }
  saving.value = true;
  try {
    const r = await api.createDeptMember({
      username: memberForm.value.username,
      password: memberForm.value.password,
      role: memberForm.value.role,
    });
    if (r.code !== 0) throw new Error(r.message || '创建失败');
    toast(`已创建 ${r.data.username}`);
    createMember.value = false;
    await fetchMembers();
  } catch (e) {
    toast(e.message || '创建失败');
  } finally {
    saving.value = false;
  }
}

async function submitCreateService() {
  if (!serviceForm.value.name) { toast('请输入服务名'); return; }
  saving.value = true;
  try {
    const payload = { ...serviceForm.value };
    if (!payload.secret) delete payload.secret;
    if (!payload.category) delete payload.category;
    if (!payload.identifier) delete payload.identifier;
    if (!payload.url) delete payload.url;
    const r = await api.createDeptService(payload);
    if (r.code !== 0) throw new Error(r.message || '创建失败');
    toast('已创建');
    createService.value = false;
    await fetchServices();
  } catch (e) {
    toast(e.message || '创建失败');
  } finally {
    saving.value = false;
  }
}

async function handleLogout() {
  const ok = await showConfirm('退出登录', '确定要退出登录吗？');
  if (!ok) return;
  auth.logout();
  router.push('/login');
}

onMounted(() => {
  if (!canManage.value) return;
  fetchAll();
});
</script>

<style scoped>
.dept-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: rgba(255,255,255,0.88);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.back-btn {
  background: rgba(255,255,255,0.08);
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 18px;
  cursor: pointer;
  color: rgba(255,255,255,0.85);
  transition: background 0.15s;
}
.back-btn:hover { background: rgba(255,255,255,0.18); }
.title { font-size: 16px; font-weight: 600; color: #fff; }
.dept-tag {
  font-size: 12px;
  background: rgba(64,158,255,0.18);
  color: #79bbff;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(64,158,255,0.35);
}

.header-actions { display: flex; gap: 8px; }

.ghost-btn, .primary-btn, .link-btn {
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  padding: 6px 12px;
  transition: all 0.18s;
  font-family: inherit;
}
.ghost-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.85);
}
.ghost-btn:hover { background: rgba(255,255,255,0.14); }
.ghost-btn.danger { color: #f56c6c; border-color: rgba(245,108,108,0.3); }
.ghost-btn.danger:hover { background: rgba(245,108,108,0.18); }
.ghost-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.primary-btn {
  background: linear-gradient(135deg, #409eff, #667eea);
  color: #fff;
  border: none;
}
.primary-btn:hover { filter: brightness(1.1); }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.primary-btn.ghost {
  background: rgba(64,158,255,0.15);
  color: #79bbff;
  border: 1px solid rgba(64,158,255,0.35);
}
.primary-btn.ghost:hover { background: rgba(64,158,255,0.25); }

.link-btn {
  background: none;
  color: #79bbff;
  padding: 4px 8px;
}
.link-btn:hover { background: rgba(64,158,255,0.15); }
.link-btn.warn { color: #e6a23c; }
.link-btn.warn:hover { background: rgba(230,162,60,0.15); }
.link-btn:disabled { color: rgba(255,255,255,0.3); cursor: not-allowed; }

.dept-body {
  flex: 1;
  padding: 20px;
  overflow: auto;
}
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
}
.search-input, .text-input, .select {
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  outline: none;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.88);
  font-family: inherit;
  transition: border-color 0.15s;
}
.search-input:focus, .text-input:focus, .select:focus { border-color: #409eff; }
.search-input { flex: 1; max-width: 320px; }
.text-input { width: 100%; box-sizing: border-box; }
.select { cursor: pointer; }
.select option { background: #1f2230; color: #fff; }

.member-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  overflow: hidden;
}
.member-table th, .member-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 13px;
  color: rgba(255,255,255,0.85);
}
.member-table th {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6);
  font-weight: 500;
  font-size: 12px;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}
.member-table tr:last-child td { border-bottom: none; }
.member-table tr.disabled { opacity: 0.55; }
.member-table tr:hover { background: rgba(255,255,255,0.04); }
.member-table.small th, .member-table.small td { padding: 6px 10px; font-size: 12px; }

.th-actions, .td-actions { text-align: right; }
.td-actions { white-space: nowrap; }
.td-actions .link-btn + .link-btn { margin-left: 4px; }

.username-cell .u-name { color: #fff; font-weight: 500; }
.u-name { color: #fff; font-weight: 500; }
.u-sub { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }

.role-tag {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}
.role-user { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
.role-dept_admin { background: rgba(230,162,60,0.18); color: #e6a23c; border: 1px solid rgba(230,162,60,0.3); }
.role-super_admin { background: rgba(245,108,108,0.18); color: #f56c6c; border: 1px solid rgba(245,108,108,0.3); }

.status-tag {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
}
.status-tag.on { background: rgba(103,194,58,0.18); color: #67c23a; border: 1px solid rgba(103,194,58,0.3); }
.status-tag.off { background: rgba(245,108,108,0.18); color: #f56c6c; border: 1px solid rgba(245,108,108,0.3); }

.empty-cell { text-align: center; color: rgba(255,255,255,0.4); padding: 16px; }

.loading, .empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255,255,255,0.5);
}
.empty.small { padding: 30px; }
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(64,158,255,0.2);
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 10px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.modal-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal-box {
  background: #1f2230;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  min-width: 360px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex; flex-direction: column;
  padding: 20px 22px 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.9);
  animation: zoomIn 0.15s ease;
}
@keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-box.wide { min-width: 640px; }
.modal-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #fff; }
.modal-body {
  font-size: 13px;
  color: rgba(255,255,255,0.75);
  margin-bottom: 18px;
  overflow: auto;
  flex: 1;
}
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
.modal-btn {
  padding: 6px 18px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.85);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.modal-btn:hover { background: rgba(255,255,255,0.14); }
.modal-btn.cancel:hover { background: rgba(255,255,255,0.14); }
.modal-btn.confirm { background: #409eff; border-color: #409eff; color: #fff; }
.modal-btn.confirm:hover { background: #66b1ff; }
.modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.form-row { margin-bottom: 12px; }
.form-row label {
  display: block;
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 4px;
}
.form-row.inline { display: flex; gap: 12px; }
.form-row.inline > div { flex: 1; }
.form-tip {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  margin-top: 4px;
}

.grant-toolbar { margin-bottom: 12px; }

.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(48,49,51,0.95);
  color: white;
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 13px;
  z-index: 2000;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
</style>
