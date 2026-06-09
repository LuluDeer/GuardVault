import request from './request'

export function getGrantList(params) {
  return request.get('/admin/grant/list', { params })
}

export function checkGrant(params) {
  return request.get('/admin/grant/check', { params })
}

export function grantAccess(data) {
  return request.post('/admin/grant/grant', data)
}

export function revokeAccess(data) {
  return request.post('/admin/grant/revoke', data)
}

export function batchGrant(data) {
  return request.post('/admin/grant/batch-grant', data)
}

export function batchRevoke(data) {
  return request.post('/admin/grant/batch-revoke', data)
}

export function batchGrantByDept(data) {
  return request.post('/admin/grant/batch-grant-by-dept', data)
}

export function batchRevokeByDept(data) {
  return request.post('/admin/grant/batch-revoke-by-dept', data)
}