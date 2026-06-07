import { defineStore } from 'pinia'

const STORAGE_KEY = 'admin_theme'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    // dark / light
    mode: localStorage.getItem(STORAGE_KEY) || 'light',
  }),
  getters: {
    isDark: (state) => state.mode === 'dark',
  },
  actions: {
    setMode(mode) {
      this.mode = mode
      localStorage.setItem(STORAGE_KEY, mode)
      this.applyMode()
    },
    toggle() {
      this.setMode(this.mode === 'dark' ? 'light' : 'dark')
    },
    applyMode() {
      const root = document.documentElement
      if (this.mode === 'dark') {
        root.classList.add('dark')
        root.setAttribute('data-theme', 'dark')
      } else {
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      }
    },
    init() {
      this.applyMode()
    },
  },
})
