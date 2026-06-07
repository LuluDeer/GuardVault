const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  console.log('App ready');
  
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  });
  
  win.loadFile('test.html');
  win.webContents.openDevTools();
  
  win.on('closed', () => {
    app.quit();
  });
  
  console.log('Window created');
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});