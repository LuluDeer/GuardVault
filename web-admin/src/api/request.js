import axios from 'axios'
export { axios }
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
// 等待刷新完成的请求队列，刷新成功后统一重试
let refreshQueue = []

function processQueue(success) {
  refreshQueue.forEach(({ resolve, reject, config }) => {
    if (success) {
      config.headers['Authorization'] = `Bearer ${localStorage.getItem('admin_token')}`
      resolve(request(config))
    } else {
      reject(new Error('Token refresh failed'))
    }
  })
  refreshQueue = []
}

async function doRefreshToken() {
  const refreshToken = localStorage.getItem('admin_refresh_token')
  if (!refreshToken) return false
  try {
    const resp = await request.post('/admin/refresh', { refreshToken })
    if (resp?.code === 0 && resp.data?.token) {
      localStorage.setItem('admin_token', resp.data.token)
      if (resp.data.refreshToken) {
        localStorage.setItem('admin_refresh_token', resp.data.refreshToken)
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
      const errorMessages = {
        1001: res.message || '参数校验失败',
        1002: res.message || '用户名或密码错误',
        1003: res.message || '账号已被禁用',
        1004: res.message || '账号已被锁定',
        1005: '登录已过期，请重新登录',
        1006: 'Token已被吊销，请重新登录',
        1007: res.message || '无权限访问',
        1008: res.message || '用户不存在',
        1009: res.message || '2FA权限未开通',
        1010: res.message || '用户名已存在',
        1011: res.message || '原密码错误',
        5000: res.message || '服务器内部错误',
      }
      const msg = errorMessages[res.code] || res.message || '请求失败'
      ElMessage.error(msg)
      if (res.code === 1005 || res.code === 1006) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_username')
        localStorage.removeItem('admin_refresh_token')
        localStorage.removeItem('admin_token_expire_at')
        localStorage.removeItem('admin_role')
        setTimeout(() => { window.location.href = '/login' }, 1500)
      }
      return Promise.reject(new Error(msg))
    }
    return res
  },
  async (error) => {
    const originalRequest = error.config
    if (error.response?.data?.code === 1005 && !originalRequest._retry) {
      originalRequest._retry = true
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve,
            reject,
            config: originalRequest,
          })
        })
      }
      isRefreshing = true
      const success = await doRefreshToken()
      isRefreshing = false
      if (success) {
        processQueue(true)
        originalRequest.headers['Authorization'] = `Bearer ${localStorage.getItem('admin_token')}`
        return request(originalRequest)
      }
      processQueue(false)
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
