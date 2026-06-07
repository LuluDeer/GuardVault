import { defineStore } from 'pinia'
import { adminLogin, adminLogout } from '@/api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    username: localStorage.getItem('admin_username') || '',
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    async login(username, password) {
      const res = await adminLogin({ username, password })
      this.token = res.data.token
      this.username = res.data.username || username
      localStorage.setItem('admin_token', this.token)
      localStorage.setItem('admin_username', this.username)
    },
    async logout() {
      try { await adminLogout() } catch {}
      this.token = ''
      this.username = ''
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_username')
    },
  },
})
