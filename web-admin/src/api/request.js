import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false

async function doRefreshToken() {
  const refreshToken = localStorage.getItem('admin_refresh_token')
  if (!refreshToken) return false
  try {
    const resp = await axios.post('/api/admin/refresh', { refreshToken })
    if (resp.data?.code === 0 && resp.data.data?.token) {
      localStorage.setItem('admin_token', resp.data.data.token)
      if (resp.data.data.refreshToken) {
        localStorage.setItem('admin_refresh_token', resp.data.data.refreshToken)
      }
      return true
    }
    return false
  } catch {
    return false
  }
}

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res
  },
  async (error) => {
    const originalRequest = error.config
    if (error.response?.data?.code === 1005 && !originalRequest._retry) {
      originalRequest._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        const success = await doRefreshToken()
        isRefreshing = false
        if (success) {
          originalRequest.headers['Authorization'] = `Bearer ${localStorage.getItem('admin_token')}`
          return request(originalRequest)
        }
      }
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_username')
      localStorage.removeItem('admin_refresh_token')
      localStorage.removeItem('admin_token_expire_at')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_username')
      localStorage.removeItem('admin_refresh_token')
      localStorage.removeItem('admin_token_expire_at')
      window.location.href = '/login'
    } else {
      ElMessage.error(error.response?.data?.message || error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

let refreshTimer = null
export function startTokenRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(async () => {
    const expireAt = localStorage.getItem('admin_token_expire_at')
    if (expireAt) {
      const expireTime = new Date(expireAt).getTime()
      const now = Date.now()
      if (expireTime - now < 5 * 60 * 1000) {
        await doRefreshToken()
      }
    }
  }, 60 * 1000)
}

export function stopTokenRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

export default request
