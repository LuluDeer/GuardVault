const { ipcMain, clipboard } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.env.APPDATA, 'totp-client', 'config.json');

function getConfig() {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return { serverUrl: 'http://127.0.0.1:3000' };
  }
}

function saveConfig(config) {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch {
    return false;
  }
}

let axiosInstance = null;

function createAxiosInstance(serverUrl) {
  axiosInstance = axios.create({
    baseURL: serverUrl || getConfig().serverUrl,
    timeout: 10000
  });
  
  return axiosInstance;
}

async function handleHttpRequest(event, config) {
  try {
    if (!axiosInstance) createAxiosInstance();
    
    // 从请求配置中获取 token（由渲染进程传递）
    const token = config.token;
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 删除 token 字段，避免传递给 axios
    delete config.token;
    
    const response = await axiosInstance(config);
    return response.data;
  } catch (error) {
    return {
      code: error.response?.status || -1,
      message: error.response?.data?.message || error.message || '网络错误'
    };
  }
}

function initIpc(mainWindow) {
  ipcMain.handle('http-request', handleHttpRequest);
  
  ipcMain.handle('get-server-url', () => {
    return getConfig().serverUrl;
  });
  
  ipcMain.handle('set-server-url', (event, url) => {
    const config = getConfig();
    config.serverUrl = url;
    if (saveConfig(config)) {
      axiosInstance = null;
      return { success: true };
    }
    return { success: false };
  });
  
  ipcMain.handle('copy-clipboard', (event, text) => {
    clipboard.writeText(text);
    return { success: true };
  });
  
  ipcMain.handle('set-autostart', (event, enable) => {
    const { setAutoStart } = require('./autostart');
    return setAutoStart(enable);
  });
  
  ipcMain.handle('get-autostart', () => {
    const { getAutoStart } = require('./autostart');
    return getAutoStart();
  });
  
  ipcMain.handle('minimize-window', () => {
    mainWindow.minimize();
    return { success: true };
  });
  
  ipcMain.handle('close-window', () => {
    mainWindow.hide();
    return { success: true };
  });
}

module.exports = { initIpc, getConfig, saveConfig };