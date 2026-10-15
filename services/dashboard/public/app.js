// State
let authToken = localStorage.getItem('mc_token') || null;
let currentUser = null;
let activeServerId = 'survival';
let consoleWs = null;
let telemetryWs = null;
let terminal = null;
let fitAddon = null;
let commandHistory = [];
let historyIndex = -1;

// Elements
const authOverlay = document.getElementById('auth-overlay');
const app = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authAlert = document.getElementById('auth-alert');
const authAlertMsg = document.getElementById('auth-alert-msg');
const serverSelect = document.getElementById('server-select');
const cmdForm = document.getElementById('cmd-form');
const cmdInput = document.getElementById('cmd-input');
const btnRestart = document.getElementById('btn-restart');
const btnStop = document.getElementById('btn-stop');
const btnStart = document.getElementById('btn-start');
const btnLogout = document.getElementById('btn-logout');

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
  initTerminal();
  if (authToken) {
    const valid = await verifySession();
    if (valid) {
      showDashboard();
      return;
    }
  }
  showAuth();
});

function initTerminal() {
  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    theme: {
      background: '#09090b',
      foreground: '#f4f4f5',
      cursor: '#fafafa',
      selectionBackground: '#27272a'
    },
    convertEol: true
  });

  fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(document.getElementById('terminal-container'));
  fitAddon.fit();

  window.addEventListener('resize', () => {
    if (fitAddon) fitAddon.fit();
  });
}

function clearTerminal() {
  if (terminal) terminal.clear();
}

function showAuth() {
  authOverlay.classList.remove('hidden');
  app.classList.add('hidden');
  if (consoleWs) consoleWs.close();
  if (telemetryWs) telemetryWs.close();
}

function showDashboard() {
  authOverlay.classList.add('hidden');
  app.classList.remove('hidden');
  if (fitAddon) setTimeout(() => fitAddon.fit(), 100);

  connectTelemetry();
  switchServer(activeServerId);
}

// Tab Switching: Login vs Register
function switchAuthTab(tab) {
  authAlert.style.display = 'none';
  const tabLogin = document.getElementById('tab-btn-login');
  const tabRegister = document.getElementById('tab-btn-register');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
  } else {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  }
}

// Authentication
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authAlert.style.display = 'none';
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('mc_token', authToken);
    updateProfileUI();
    showDashboard();
    showToast('Signed in successfully', 'success');
  } catch (err) {
    authAlertMsg.innerText = err.message;
    authAlert.style.display = 'flex';
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authAlert.style.display = 'none';
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('mc_token', authToken);
    updateProfileUI();
    showDashboard();
    showToast('Administrator account created & verified', 'success');
  } catch (err) {
    authAlertMsg.innerText = err.message;
    authAlert.style.display = 'flex';
  }
});

async function verifySession() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) return false;
    const data = await res.json();
    currentUser = data.user;
    updateProfileUI();
    return true;
  } catch {
    return false;
  }
}

function updateProfileUI() {
  if (!currentUser) return;
  document.getElementById('user-name').innerText = currentUser.username;
  document.getElementById('user-avatar').src = `https://mc-heads.net/avatar/${currentUser.username}/32`;
  document.getElementById('user-role').innerText = (currentUser.groups[0] || 'OP').toUpperCase();
}

btnLogout.addEventListener('click', () => {
  localStorage.removeItem('mc_token');
  authToken = null;
  currentUser = null;
  showAuth();
  showToast('Logged out', 'default');
});

// Server Switcher
serverSelect.addEventListener('change', (e) => {
  switchServer(e.target.value);
});

function switchServer(serverId) {
  activeServerId = serverId;
  document.getElementById('terminal-badge').innerText = `console@mc-${serverId}`;
  connectConsole(serverId);
}

// WebSocket Console
function connectConsole(serverId) {
  if (consoleWs) {
    consoleWs.close();
  }

  terminal.clear();
  terminal.writeln(`\x1b[36mConnecting to live console: ${serverId}...\x1b[0m`);

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/console/${serverId}?token=${authToken}`;

  consoleWs = new WebSocket(wsUrl);

  consoleWs.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'log') {
        terminal.write(msg.data);
      } else if (msg.type === 'info') {
        terminal.write(msg.message);
      } else if (msg.type === 'error') {
        terminal.writeln(`\x1b[31m[Error] ${msg.message}\x1b[0m`);
      }
    } catch {
      terminal.write(event.data);
    }
  };

  consoleWs.onclose = () => {
    terminal.writeln(`\r\n\x1b[33mConsole disconnected.\x1b[0m`);
  };

  consoleWs.onerror = () => {
    terminal.writeln(`\r\n\x1b[31mWebSocket connection error.\x1b[0m`);
  };
}

// Command Execution
cmdForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const cmd = cmdInput.value.trim();
  if (!cmd) return;

  commandHistory.push(cmd);
  historyIndex = commandHistory.length;

  if (consoleWs && consoleWs.readyState === WebSocket.OPEN) {
    consoleWs.send(JSON.stringify({ type: 'command', command: cmd }));
  } else {
    // REST Fallback
    fetch(`/api/servers/${activeServerId}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ command: cmd })
    });
  }

  cmdInput.value = '';
});

// Command History (Up/Down)
cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    if (historyIndex > 0) {
      historyIndex--;
      cmdInput.value = commandHistory[historyIndex] || '';
    }
  } else if (e.key === 'ArrowDown') {
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      cmdInput.value = commandHistory[historyIndex] || '';
    } else {
      historyIndex = commandHistory.length;
      cmdInput.value = '';
    }
  }
});

function sendQuickCommand(cmd) {
  if (consoleWs && consoleWs.readyState === WebSocket.OPEN) {
    consoleWs.send(JSON.stringify({ type: 'command', command: cmd }));
  }
}

// Power Controls
async function triggerPower(action) {
  if (!confirm(`Are you sure you want to ${action} ${activeServerId}?`)) return;

  try {
    const res = await fetch(`/api/servers/${activeServerId}/power`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    terminal.writeln(`\r\n\x1b[35m[Power] ${data.message || data.error}\x1b[0m`);
    showToast(`${action.toUpperCase()} command dispatched to ${activeServerId}`, 'default');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

btnRestart.addEventListener('click', () => triggerPower('restart'));
btnStop.addEventListener('click', () => triggerPower('stop'));
btnStart.addEventListener('click', () => triggerPower('start'));

// Telemetry
function connectTelemetry() {
  if (telemetryWs) telemetryWs.close();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/telemetry?token=${authToken}`;

  telemetryWs = new WebSocket(wsUrl);

  telemetryWs.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'telemetry' && payload.servers) {
        renderTelemetry(payload.servers);
      }
    } catch (e) {
      console.error('Telemetry error:', e);
    }
  };

  telemetryWs.onclose = () => {
    setTimeout(connectTelemetry, 3000);
  };
}

function renderTelemetry(servers) {
  const active = servers.find(s => s.id === activeServerId) || servers[0];
  if (!active) return;

  // Status & Uptime
  const statusEl = document.getElementById('metric-status');
  statusEl.innerText = active.metrics.state;
  statusEl.style.color = active.metrics.state === 'running' ? 'var(--success)' : 'var(--destructive)';

  const uptimeMins = Math.floor(active.metrics.uptimeSeconds / 60);
  document.getElementById('metric-uptime').innerText = `Uptime: ${uptimeMins}m`;

  // Players & Latency
  document.getElementById('metric-players').innerText = `${active.players.online} / ${active.players.max}`;
  document.getElementById('metric-ping').innerText = active.pingMs ? `Latency: ${active.pingMs} ms` : 'Latency: -- ms';

  // CPU
  document.getElementById('metric-cpu').innerText = `${active.metrics.cpuPercent}%`;
  document.getElementById('bar-cpu').style.width = `${Math.min(100, active.metrics.cpuPercent)}%`;

  // RAM
  document.getElementById('metric-ram').innerText = `${active.metrics.memoryUsedMb} MB`;
  document.getElementById('metric-ram-max').innerText = `/ ${active.metrics.memoryLimitMb} MB`;
  document.getElementById('bar-ram').style.width = `${active.metrics.memoryPercent}%`;

  // Online Players List
  renderPlayerList(active.players.list);

  // Network Nodes List
  renderNodesList(servers);
}

function renderPlayerList(players) {
  const container = document.getElementById('player-container');
  document.getElementById('player-badge').innerText = players.length;

  if (!players || players.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--muted-foreground); padding: 2rem 0; font-size: 0.8125rem;">
        <i class="fa-solid fa-ghost" style="font-size: 1.5rem; opacity: 0.4; margin-bottom: 0.5rem; display: block;"></i>
        No players online
      </div>
    `;
    return;
  }

  container.innerHTML = players.map(p => `
    <div class="player-row">
      <div class="player-info">
        <img src="https://mc-heads.net/avatar/${p.name}/24" class="player-avatar" alt="${p.name}" />
        <span class="player-name">${p.name}</span>
      </div>
      <div class="player-actions">
        <button class="btn btn-sm btn-outline btn-icon-sm" onclick="playerAction('${p.name}', 'kick')" title="Kick">
          <i class="fa-solid fa-user-slash" style="color: var(--warning); font-size: 0.6875rem;"></i>
        </button>
        <button class="btn btn-sm btn-outline btn-icon-sm" onclick="playerAction('${p.name}', 'ban')" title="Ban">
          <i class="fa-solid fa-gavel" style="color: var(--destructive); font-size: 0.6875rem;"></i>
        </button>
        <button class="btn btn-sm btn-outline btn-icon-sm" onclick="playerAction('${p.name}', 'op')" title="Give OP">
          <i class="fa-solid fa-crown" style="color: #38bdf8; font-size: 0.6875rem;"></i>
        </button>
      </div>
    </div>
  `).join('');
}

async function playerAction(player, action) {
  if (!confirm(`Execute '${action}' on ${player}?`)) return;

  try {
    const res = await fetch(`/api/servers/${activeServerId}/players/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ player, action })
    });
    const data = await res.json();
    terminal.writeln(`\r\n\x1b[32m[Player Moderation] ${data.response || 'Success'}\x1b[0m`);
    showToast(`Executed ${action} on ${player}`, 'default');
  } catch (err) {
    showToast(`Failed to execute ${action}: ${err.message}`, 'error');
  }
}

function renderNodesList(servers) {
  const container = document.getElementById('nodes-container');
  container.innerHTML = servers.map(s => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; border-radius: calc(var(--radius) - 2px); background-color: #09090b; border: 1px solid var(--border); margin-bottom: 0.375rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${s.metrics.state === 'running' ? 'var(--success)' : 'var(--destructive)'};"></span>
        <span style="font-size: 0.8125rem; font-weight: 500; color: #ffffff;">${s.name}</span>
      </div>
      <span style="font-size: 0.6875rem; color: var(--muted-foreground); font-family: ui-monospace, monospace;">${s.metrics.cpuPercent}% CPU</span>
    </div>
  `).join('');
}

// Toast Notifications
function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';

  let icon = '<i class="fa-solid fa-info-circle" style="color: #38bdf8;"></i>';
  if (type === 'success') icon = '<i class="fa-solid fa-check-circle" style="color: var(--success);"></i>';
  if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation" style="color: var(--destructive);"></i>';

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

