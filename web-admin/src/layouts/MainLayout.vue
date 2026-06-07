<template>
  <el-container style="height:100vh">
    <el-aside :width="sidebarWidth" class="sidebar">
      <div class="logo">TOTP Admin</div>
      <el-menu
        :default-active="activeMenu"
        :background-color="menuBg"
        :text-color="menuText"
        :active-text-color="menuActive"
        router
      >
        <el-menu-item index="/services">
          <el-icon><Grid /></el-icon><span>{{ t('menu.services') }}</span>
        </el-menu-item>
        <el-menu-item index="/departments">
          <el-icon><OfficeBuilding /></el-icon><span>{{ t('menu.departments') }}</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon><span>{{ t('menu.users') }}</span>
        </el-menu-item>
        <el-menu-item index="/totp">
          <el-icon><Key /></el-icon><span>{{ t('menu.totp') }}</span>
        </el-menu-item>
        <el-menu-item index="/logs">
          <el-icon><Document /></el-icon><span>{{ t('menu.logs') }}</span>
        </el-menu-item>
        <el-menu-item index="/audit">
          <el-icon><DataAnalysis /></el-icon><span>{{ t('menu.audit') }}</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon><span>{{ t('menu.settings') }}</span>
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
import { User, Key, Document, Setting, ArrowDown, Grid, OfficeBuilding, DataAnalysis, Sunny, Moon, Position } from '@element-plus/icons-vue'
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
const menuBg = computed(() => theme.isDark ? '#0f172a' : '#001529')
const menuText = computed(() => theme.isDark ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.65)')
const menuActive = computed(() => '#fff')

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
.sidebar { transition: background-color 0.3s; }
.logo {
  height: 64px;
  line-height: 64px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--topbar-border, #f0f0f0);
  background: var(--topbar-bg, #fff);
  transition: background-color 0.3s, border-color 0.3s;
}
.topbar-actions { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 16px; font-weight: 600; color: var(--topbar-text, #303133); }
.user-info { cursor: pointer; color: var(--topbar-text, #606266); display: inline-flex; align-items: center; gap: 4px; }
.main-area { background: var(--main-bg, #f5f7fa); transition: background-color 0.3s; }
</style>

<style>
/* 暗色模式 - 顶级全局样式（无法在 scoped 内通过 :global() 引用） */
html.dark .topbar { --topbar-bg: #1e293b; --topbar-border: #334155; --topbar-text: #e2e8f0; }
html.dark .main-area { --main-bg: #0f172a; }
html.dark .el-menu { border-right: none !important; }
html.dark .el-menu-item.is-active { background-color: rgba(64, 158, 255, 0.2) !important; }
</style>
