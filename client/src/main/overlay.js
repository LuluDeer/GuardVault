// 覆盖层模块 - 用于显示全局提示、遮罩等
// 目前预留接口，实际实现可根据需求扩展

let overlayWindow = null;

module.exports = {
  init: () => {
    // 初始化覆盖层（预留）
  },
  
  show: (options = {}) => {
    // 显示覆盖层（预留）
    console.log('[overlay] show:', options);
  },
  
  hide: () => {
    // 隐藏覆盖层（预留）
    console.log('[overlay] hide');
  },
  
  destroy: () => {
    // 销毁覆盖层（预留）
    if (overlayWindow) {
      overlayWindow.close();
      overlayWindow = null;
    }
  },
};
