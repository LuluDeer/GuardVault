<template>
  <el-container style="height:100vh">
    <el-aside :width="sidebarWidth" class="sidebar">
      <div class="logo">
        <div class="logo-icon">
          <el-icon :size="24"><Key /></el-icon>
        </div>
        <span class="logo-text">GuardVault</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :background-color="menuBg"
        :text-color="menuText"
        :active-text-color="menuActive"
        router
      >
        <el-menu-item v-for="m in visibleMenus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon><span>{{ m.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="topbar">
        <span class="page-title">{{ route.meta.title || t('header.title') }}</span>
        <div class="topbar-actions">
          <!-- 主题切换 -->
          <el-tooltip :content="theme.isDark ? t('theme.switchToLight') : t('theme.switchToDark')" placement="bottom">
            <el-button text @click="theme.toggle">
              <el-icon><component :is="theme.isDark ? 'Sunny' : 'Moon'" /></el-icon>
            </el-button>
          </el-tooltip>

          <!-- 语言切换 -->
          <el-dropdown @command="handleLocale" trigger="click">
            <el-button text>
              <el-icon><Position /></el-icon>
              <span style="margin-left:4px">{{ currentLocaleLabel }}</span>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="loc in availableLocales"
                  :key="loc.value"
                  :command="loc.value"
                  :disabled="loc.value === locale"
                >
                  {{ loc.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-dropdown @command="handleCommand">
            <span class="user-info">
              {{ auth.username }} <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">{{ t('header.logout') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main-area">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Key, Document, Setting, ArrowDown, Grid, OfficeBuilding, DataAnalysis, Sunny, Moon, Position, Upload } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useI18n } from '@/i18n'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const { t, locale, availableLocales, setLocale } = useI18n()

const activeMenu = computed(() => '/' + route.path.split('/')[1])
const currentLocaleLabel = computed(() => availableLocales.find(l => l.value === locale.value)?.label || locale.value)

const sidebarWidth = '210px'
const menuBg = computed(() => theme.isDark ? '#0f172a' : '#fff')
const menuText = computed(() => theme.isDark ? 'rgba(255,255,255,0.7)' : '#606266')
const menuActive = computed(() => '#409eff')

// 侧栏菜单：按当前用户角色过滤可见项
const visibleMenus = computed(() => {
  const role = auth.role
  const all = [
    { path: '/services',   label: t('menu.services'),    icon: Grid,            roles: ['super_admin', 'dept_admin'] },
    { path: '/import',     label: t('menu.import'),      icon: Upload,          roles: ['super_admin', 'dept_admin'] },
    { path: '/departments',label: t('menu.departments'), icon: OfficeBuilding,  roles: ['super_admin'] },
    { path: '/users',      label: t('menu.users'),       icon: User,            roles: ['super_admin', 'dept_admin'] },
    { path: '/totp',       label: t('menu.totp'),        icon: Key,             roles: ['super_admin', 'dept_admin'] },
    { path: '/logs',       label: t('menu.logs'),        icon: Document,        roles: ['super_admin'] },
    { path: '/audit',      label: t('menu.audit'),       icon: DataAnalysis,    roles: ['super_admin'] },
    { path: '/settings',   label: t('menu.settings'),    icon: Setting,         roles: ['super_admin'] },
  ]
  return all.filter(m => !role || m.roles.includes(role))
})

async function handleCommand(cmd) {
  if (cmd === 'logout') {
    await auth.logout()
    router.push('/login')
  }
}

function handleLocale(lang) {
  setLocale(lang)
  // 刷新 Element Plus 组件 locale
  window.location.reload()
}

onMounted(() => {
  theme.init()
})
</script>

<style scoped>
.sidebar {
  transition: background-color 0.3s;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0 16px;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #409eff, #667eea);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.logo-text {
  color: #1a1a1a;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

html.dark .logo-text {
  color: #fff;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--topbar-border, #ebf0f5);
  background: var(--topbar-bg, #fff);
  transition: background-color 0.3s, border-color 0.3s;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--topbar-text, #1a1a1a);
  letter-spacing: -0.3px;
}

.user-info {
  cursor: pointer;
  color: var(--topbar-text, #606266);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.user-info:hover {
  background: rgba(0, 0, 0, 0.04);
}

html.dark .user-info:hover {
  background: rgba(255, 255, 255, 0.04);
}

.main-area {
  background: var(--main-bg, #f5f7fa);
  transition: background-color 0.3s;
  padding: 24px;
}
</style>

<style>
/* 暗色模式 - 顶级全局样式（无法在 scoped 内通过 :global() 引用） */
html.dark .topbar { --topbar-bg: #1e293b; --topbar-border: #334155; --topbar-text: #e2e8f0; }
html.dark .main-area { --main-bg: #0f172a; }
html.dark .el-menu { border-right: none !important; }
html.dark .el-menu-item.is-active { background-color: rgba(64, 158, 255, 0.2) !important; }
</style>
