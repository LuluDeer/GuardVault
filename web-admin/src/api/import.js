import request from './request'

export function parseMigration(data) {
  return request.post('/admin/import/parse-migration', data)
}

export function confirmImport(data) {
  return request.post('/admin/import/confirm', data)
}