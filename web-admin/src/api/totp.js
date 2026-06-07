import request from './request'

export function getTotpList(params) {
  return request.get('/admin/totp/list', { params })
}

export function enableTotp(userId) {
  return request.post(`/admin/totp/enable/${userId}`)
}

export function disableTotp(userId) {
  return request.post(`/admin/totp/disable/${userId}`)
}

export function resetTotp(userId) {
  return request.post(`/admin/totp/reset/${userId}`)
}

export function batchResetTotp(userIds) {
  return request.post('/admin/totp/batch-reset', { userIds })
}

export function getTotpCode(userId) {
  return request.get(`/admin/totp/code/${userId}`)
}
