const { Tray, Menu, nativeImage } = require('electron');

let tray = null;

function initTray(mainWindow) {
  // 创建一个简单的图标
  const canvas = nativeImage.createEmpty();
  const ctx = canvas.getContext('2d');
  canvas.resize({ width: 16, height: 16 });
  
  // 绘制一个简单的图标（绿色圆形）
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.arc(8, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  
  tray = new Tray(canvas);
  tray.setToolTip('TOTP客户端');
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: '退出',
      click: () => {
        mainWindow.destroy();
        process.exit(0);
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow.show();
  });
}

module.exports = { initTray };