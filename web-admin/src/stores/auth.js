import { defineStore } from 'pinia'
import { adminLogin, adminLogout } from '@/api/auth'
import { startTokenRefresh, stopTokenRefresh } from '@/api/request'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    username: localStorage.getItem('admin_username') || '',
    refreshToken: localStorage.getItem('admin_refresh_token') || '',
    tokenExpireAt: localStorage.getItem('admin_token_expire_at') || '',
    role: localStorage.getItem('admin_role') || '',
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    async login(username, password) {
      try {
        const res = await adminLogin({ username, password })
        this.token = res.data.token
        this.username = res.data.username || username
        this.refreshToken = res.data.refreshToken || ''
        this.tokenExpireAt = res.data.expireAt || ''
        this.role = res.data.role || ''
        localStorage.setItem('admin_token', this.token)
        localStorage.setItem('admin_username', this.username)
        localStorage.setItem('admin_refresh_token', this.refreshToken)
        localStorage.setItem('admin_token_expire_at', this.tokenExpireAt)
        localStorage.setItem('admin_role', this.role)
        startTokenRefresh()
        return { ok: true }
      } catch (err) {
        return { ok: false, message: err.message || '登录失败' }
      }
    },
    async logout() {
      stopTokenRefresh()
      try { await adminLogout() } catch {}
      this.token = ''
      this.username = ''
      this.refreshToken = ''
      this.tokenExpireAt = ''
      this.role = ''
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_username')
      localStorage.removeItem('admin_refresh_token')
      localStorage.removeItem('admin_token_expire_at')
      localStorage.removeItem('admin_role')
    },
  },
})
