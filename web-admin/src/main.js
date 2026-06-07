import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import router from './router'
import App from './App.vue'
import { locale, elementPlusLocaleMap } from './i18n'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)

// Element Plus locale 与 i18n locale 联动
app.use(ElementPlus, { locale: elementPlusLocaleMap[locale.value] || elementPlusLocaleMap['zh-CN'] })

// 暴露到全局（可选）
app.config.globalProperties.$t = (key, params) => {
  // 通过响应式 locale 触发组件刷新
  return (window.__t__ || ((k, p) => k))(key, params)
}

app.mount('#app')

// 同步 HTML lang
document.documentElement.setAttribute('lang', locale.value)
