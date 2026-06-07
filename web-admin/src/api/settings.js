import request from './request'

export function getSettings() {
  return request.get('/admin/config')
}

export function updateSetting(key, value) {
  return request.post('/admin/config', { key, value })
}
