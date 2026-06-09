import request from './request'

export function getServiceList(params) {
  return request.get('/admin/service/list', { params })
}

export function getService(id) {
  return request.get(`/admin/service/${id}`)
}

export function getServiceSecret(id) {
  return request.get(`/admin/service/${id}/secret`)
}

export function createService(data) {
  return request.post('/admin/service/create', data)
}

export function updateService(id, data) {
  return request.put(`/admin/service/${id}`, data)
}

export function resetSecret(id) {
  return request.post(`/admin/service/${id}/reset-secret`)
}

export function deleteService(id) {
  return request.delete(`/admin/service/${id}`)
}

export function getCategories() {
  return request.get('/admin/service/categories')
}

export function addCategory(category) {
  return request.post('/admin/service/category', { category })
}

export function deleteCategory(category) {
  return request.delete('/admin/service/category', { params: { category } })
}

export function batchImport(data) {
  return request.post('/admin/service/batch-import', data)
}

export function scanCreate(data) {
  return request.post('/admin/service/scan-create', data)
}