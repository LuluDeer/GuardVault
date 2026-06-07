import request from './request'

export function parseMigration(data) {
  return request.post('/admin/import/parse-migration', data)
}

export function parseOtpauthUrl(data) {
  return request.post('/admin/import/parse-url', data)
}

export function previewImport(data) {
  return request.post('/admin/import/preview', data)
}

export function confirmImport(data) {
  return request.post('/admin/import/confirm', data)
}