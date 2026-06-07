import request from './request'

export function getSummary(params) {
  return request.get('/admin/audit/summary', { params })
}

export function getServiceViewStats(params) {
  return request.get('/admin/audit/service-views', { params })
}

export function getUserViewStats(params) {
  return request.get('/admin/audit/user-views', { params })
}

export function getActionStats(params) {
  return request.get('/admin/audit/actions', { params })
}

export function getDailyStats(params) {
  return request.get('/admin/audit/daily', { params })
}