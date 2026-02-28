/**
 * 在任意网页注入可拖拽的 T212 悬浮窗（iframe 加载 widget.html）
 */
(function() {
  const ID = 't212-floating-widget-root';
  const IFRAME_ID = 't212-floating-iframe';

  function getOrCreateRoot() {
    let root = document.getElementById(ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = ID;
    root.style.cssText = [
      'position:fixed',
      'top:80px',
      'right:20px',
      'left:auto',
      'width:360px',
      'max-height:480px',
      'z-index:2147483646',
      'border-radius:12px',
      'overflow:hidden',
      'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
      'font-family:system-ui,sans-serif'
    ].join(';');
    document.body.appendChild(root);
    return root;
  }

  function createHeader(root, iframe) {
    const header = document.createElement('div');
    header.style.cssText = [
      'height:36px',
      'background:#161b22',
      'border:1px solid #30363d',
      'border-bottom:none',
      'border-radius:12px 12px 0 0',
      'display:flex',
      'align-items:center',
      'justify-content:space-between',
      'padding:0 12px',
      'cursor:move',
      'user-select:none'
    ].join(';');
    header.textContent = 'T212 Agent — 拖拽移动';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background:transparent;border:none;color:#8b949e;font-size:20px;cursor:pointer;line-height:1;padding:0 4px';
    closeBtn.onclick = () => hide();
    header.appendChild(closeBtn);

    let drag = false;
    let dx = 0, dy = 0;
    header.addEventListener('mousedown', function(e) {
      if (e.target === closeBtn) return;
      drag = true;
      dx = e.clientX - root.offsetLeft;
      dy = e.clientY - root.offsetTop;
    });
    document.addEventListener('mousemove', function(e) {
      if (!drag) return;
      root.style.left = (e.clientX - dx) + 'px';
      root.style.top = (e.clientY - dy) + 'px';
      root.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { drag = false; });

    root.insertBefore(header, root.firstChild);
  }

  function show() {
    const root = getOrCreateRoot();
    if (document.getElementById(IFRAME_ID)) {
      root.style.display = 'block';
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.id = IFRAME_ID;
    iframe.src = chrome.runtime.getURL('widget.html');
    iframe.style.cssText = 'width:100%;height:440px;border:1px solid #30363d;border-radius:0 0 12px 12px;display:block;background:#0d1117';
    root.appendChild(iframe);
    createHeader(root, iframe);
    root.style.display = 'block';
  }

  function hide() {
    const root = document.getElementById(ID);
    if (root) root.style.display = 'none';
  }

  function toggle() {
    const root = document.getElementById(ID);
    if (root && root.style.display !== 'none') hide();
    else show();
  }

  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg.type === 'T212_TOGGLE_FLOATING') toggle();
    if (msg.type === 'T212_SHOW_FLOATING') show();
    if (msg.type === 'T212_HIDE_FLOATING') hide();
  });

  window.addEventListener('message', function(event) {
    const msg = event && event.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'T212_HIDE_FLOATING_WIDGET') hide();
  });
})();
