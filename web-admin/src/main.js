import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import router from './router'
import App from './App.vue'
import { locale, elementPlusLocaleMap } from './i18n'
import { startTokenRefresh } from './api/request'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)

app.use(ElementPlus, { locale: elementPlusLocaleMap[locale.value] || elementPlusLocaleMap['zh-CN'] })

app.config.globalProperties.$t = (key, params) => {
  return (window.__t__ || ((k, p) => k))(key, params)
}

app.mount('#app')

document.documentElement.setAttribute('lang', locale.value)

if (localStorage.getItem('admin_token')) {
  startTokenRefresh()
}
