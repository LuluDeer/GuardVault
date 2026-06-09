// 主窗口引用：仅 main 进程内部使用，避免在子模块里直接 require ./index 造成循环依赖。
let mainWindow = null;

function setMainWindow(win) {
  mainWindow = win;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = { setMainWindow, getMainWindow };
