// State
let authToken = localStorage.getItem('mc_token') || null;
let currentUser = null;
let activeView = 'overview';
let activeNode = 'survival';
let playerTab = 'online';

let consoleWs = null;
let telemetryWs = null;
let terminal = null;
let fitAddon = null;

let memChart = null;
let playersChart = null;
let cpuChart = null;

const memHistory = [];
const cpuHistory = [];
const playersHistory = [];
const maxDataPoints = 12;

let cmdHistory = [];
let cmdHistoryIndex = -1;

// Elements
const authModal = document.getElementById('auth-modal');
const mainApp = document.getElementById('main-app');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const authErrorBadge = document.getElementById('auth-error-badge');
const authErrorText = document.getElementById('auth-error-text');
const nodeSelect = document.getElementById('active-node-select');

// Whitelist mock/live state
let isWhitelistEnabled = false;
let samplePlayers = [
  { name: 'Dinnerbone', uuid: '61699b2e-d327-4a01-9f1e-0ea8c3f06bc6', online: false, whitelisted: true },
  { name: 'jeb_', uuid: '853c80ef-3c37-49fd-aa49-938b674adae6', online: false, whitelisted: true },
  { name: 'Notch', uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', online: false, whitelisted: true },
  { name: 'Technoblade', uuid: 'b876ec32-e396-476b-a115-8438d83c67d4', online: false, whitelisted: true }
];

window.addEventListener('DOMContentLoaded', async () => {
  initCharts();
  initTerminal();

  if (authToken) {
    const ok = await verifySession();
    if (ok) {
      showDashboard();
      return;
    }
  }
  showAuthModal();
});

// ==================== AUTHENTICATION ====================
function switchAuthTab(tab) {
  authErrorBadge.classList.add('hidden');
  const btnLogin = document.getElementById('auth-tab-login');
  const btnRegister = document.getElementById('auth-tab-register');

  if (tab === 'login') {
    btnLogin.classList.add('active');
    btnRegister.classList.remove('active');
    formLogin.style.display = 'block';
    formRegister.style.display = 'none';
  } else {
    btnRegister.classList.add('active');
    btnLogin.classList.remove('active');
    formLogin.style.display = 'none';
    formRegister.style.display = 'block';
  }
}

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorBadge.classList.add('hidden');
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('mc_token', authToken);
    updateUserBadge();
    showDashboard();
  } catch (err) {
    authErrorText.innerText = err.message;
    authErrorBadge.classList.remove('hidden');
  }
});

formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  authErrorBadge.classList.add('hidden');
  const username = document.getElementById('reg-user').value.trim();
  const password = document.getElementById('reg-pass').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('mc_token', authToken);
    updateUserBadge();
    showDashboard();
  } catch (err) {
    authErrorText.innerText = err.message;
    authErrorBadge.classList.remove('hidden');
  }
});

async function verifySession() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (!res.ok) return false;
    const data = await res.json();
    currentUser = data.user;
    updateUserBadge();
    return true;
  } catch {
    return false;
  }
}

function updateUserBadge() {
  if (!currentUser) return;
  document.getElementById('sidebar-user-name').innerText = currentUser.username;
  document.getElementById('sidebar-user-avatar').src = `https://mc-heads.net/avatar/${currentUser.username}/32`;
}

function promptLogout() {
  if (confirm('Log out of VoxelDash?')) {
    localStorage.removeItem('mc_token');
    authToken = null;
    currentUser = null;
    showAuthModal();
  }
}

function showAuthModal() {
  authModal.classList.remove('hidden');
  mainApp.classList.add('hidden');
  if (consoleWs) consoleWs.close();
  if (telemetryWs) telemetryWs.close();
}

function showDashboard() {
  authModal.classList.add('hidden');
  mainApp.classList.remove('hidden');
  navigateView(activeView);
  connectTelemetry();
}

// ==================== NAVIGATION ====================
function navigateView(viewId) {
  activeView = viewId;

  // Update Sidebar active state
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
  const activeNavItem = document.getElementById(`nav-${viewId}`);
  if (activeNavItem) activeNavItem.classList.add('active');

  // Update Breadcrumb text
  const titles = {
    overview: 'Overview',
    players: 'Players',
    console: 'Console',
    worlds: 'Worlds',
    settings: 'Settings'
  };
  document.getElementById('breadcrumb-current').innerText = titles[viewId] || viewId;

  // Show corresponding view panel
  document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.remove('hidden');

  if (viewId === 'console') {
    connectConsole(activeNode);
    if (fitAddon) setTimeout(() => fitAddon.fit(), 100);
  } else if (viewId === 'players') {
    renderPlayersTable();
  }
}

function openMapUrl() {
  window.open('/map', '_blank');
}

// Node Switcher
nodeSelect.addEventListener('change', (e) => {
  activeNode = e.target.value;
  document.getElementById('console-server-title').innerText = `console@mc-${activeNode}`;
  if (activeView === 'console') {
    connectConsole(activeNode);
  }
});

// ==================== CHARTS (CHART.JS) ====================
function initCharts() {
  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { color: '#6b637d', font: { size: 10, family: 'monospace' } }
      },
      y: {
        grid: { color: 'rgba(38, 27, 61, 0.5)', drawBorder: false },
        ticks: { color: '#6b637d', font: { size: 10, family: 'monospace' } }
      }
    }
  };

  // 1. Memory Line Chart (Purple Area)
  const ctxMem = document.getElementById('chart-memory')?.getContext('2d');
  if (ctxMem) {
    const purpleGrad = ctxMem.createLinearGradient(0, 0, 0, 120);
    purpleGrad.addColorStop(0, 'rgba(147, 51, 234, 0.45)');
    purpleGrad.addColorStop(1, 'rgba(147, 51, 234, 0.0)');

    memChart = new Chart(ctxMem, {
      type: 'line',
      data: {
        labels: ['03:08', '03:09', '03:10', '03:11', '03:12', '03:13', '03:14', '03:15'],
        datasets: [{
          data: [15, 20, 28, 30, 32, 18, 26, 28],
          borderColor: '#a855f7',
          backgroundColor: purpleGrad,
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0
        }]
      },
      options: chartDefaults
    });
  }

  // 2. Players Line Chart (Purple Area)
  const ctxPlayers = document.getElementById('chart-players')?.getContext('2d');
  if (ctxPlayers) {
    const purpleGrad = ctxPlayers.createLinearGradient(0, 0, 0, 120);
    purpleGrad.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
    purpleGrad.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

    playersChart = new Chart(ctxPlayers, {
      type: 'line',
      data: {
        labels: ['03:08', '03:09', '03:10', '03:11', '03:12', '03:13', '03:14', '03:15'],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0, 0, 0],
          borderColor: '#c084fc',
          backgroundColor: purpleGrad,
          fill: true,
          tension: 0.2,
          borderWidth: 2,
          pointRadius: 0
        }]
      },
      options: {
        ...chartDefaults,
        scales: {
          ...chartDefaults.scales,
          y: { ...chartDefaults.scales.y, min: 0, max: 4 }
        }
      }
    });
  }

  // 3. CPU Line Chart (Emerald Green)
  const ctxCpu = document.getElementById('chart-cpu')?.getContext('2d');
  if (ctxCpu) {
    cpuChart = new Chart(ctxCpu, {
      type: 'line',
      data: {
        labels: ['03:08', '03:09', '03:10', '03:11', '03:12', '03:13', '03:14', '03:15'],
        datasets: [{
          data: [35, 30, 32, 28, 22, 18, 25, 20],
          borderColor: '#10b981',
          fill: false,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0
        }]
      },
      options: {
        ...chartDefaults,
        scales: {
          ...chartDefaults.scales,
          y: { ...chartDefaults.scales.y, min: 0, max: 50 }
        }
      }
    });
  }
}

function updateCharts(activeServer) {
  const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Memory Chart Update
  if (memChart) {
    const memMb = activeServer.metrics.memoryUsedMb || 0;
    memChart.data.labels.push(timeLabel);
    memChart.data.datasets[0].data.push(memMb);
    if (memChart.data.labels.length > maxDataPoints) {
      memChart.data.labels.shift();
      memChart.data.datasets[0].data.shift();
    }
    memChart.update('none');
  }

  // CPU Chart Update
  if (cpuChart) {
    const cpuVal = activeServer.metrics.cpuPercent || 0;
    cpuChart.data.labels.push(timeLabel);
    cpuChart.data.datasets[0].data.push(cpuVal);
    if (cpuChart.data.labels.length > maxDataPoints) {
      cpuChart.data.labels.shift();
      cpuChart.data.datasets[0].data.shift();
    }
    cpuChart.update('none');
  }

  // Player Chart Update
  if (playersChart) {
    const onlineCount = activeServer.players.online || 0;
    playersChart.data.labels.push(timeLabel);
    playersChart.data.datasets[0].data.push(onlineCount);
    if (playersChart.data.labels.length > maxDataPoints) {
      playersChart.data.labels.shift();
      playersChart.data.datasets[0].data.shift();
    }
    playersChart.update('none');
  }
}

// ==================== TELEMETRY STREAM ====================
function connectTelemetry() {
  if (telemetryWs) telemetryWs.close();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/telemetry?token=${authToken}`;

  telemetryWs = new WebSocket(wsUrl);

  telemetryWs.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'telemetry' && payload.servers) {
        renderDashboardData(payload.servers);
      }
    } catch (e) {
      console.error('Telemetry error:', e);
    }
  };

  telemetryWs.onclose = () => {
    setTimeout(connectTelemetry, 3000);
  };
}

function renderDashboardData(servers) {
  const active = servers.find(s => s.id === activeNode) || servers[0];
  if (!active) return;

  // 1. Players Big Stat
  document.getElementById('stat-online-players').innerText = `${active.players.online} / ${active.players.max || 20}`;
  document.getElementById('subtab-count-online').innerText = active.players.online;

  // 2. Memory
  document.getElementById('mem-used-mb').innerText = active.metrics.memoryUsedMb;
  document.getElementById('mem-limit-mb').innerText = active.metrics.memoryLimitMb.toLocaleString();
  document.getElementById('mem-percent-badge').innerText = `${active.metrics.memoryPercent}%`;
  document.getElementById('mem-progress-bar').style.width = `${active.metrics.memoryPercent}%`;
  document.getElementById('mem-allocated-text').innerText = `${active.metrics.memoryUsedMb} MB`;

  // 3. Uptime
  const hours = Math.floor(active.metrics.uptimeSeconds / 3600);
  const mins = Math.floor((active.metrics.uptimeSeconds % 3600) / 60);
  document.getElementById('stat-uptime').innerText = `${hours}h ${mins}m`;

  // 4. Update Charts
  updateCharts(active);

  // Sync online players to player table list
  if (active.players.list && active.players.list.length > 0) {
    active.players.list.forEach(p => {
      if (!samplePlayers.find(sp => sp.name.toLowerCase() === p.name.toLowerCase())) {
        samplePlayers.unshift({ name: p.name, uuid: p.id, online: true, whitelisted: true });
      }
    });
  }
}

// ==================== PLAYERS MANAGEMENT ====================
function filterPlayerTab(tab) {
  playerTab = tab;
  document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
  event.currentTarget.classList.add('active');
  renderPlayersTable();
}

function renderPlayersTable() {
  const container = document.getElementById('players-table-body');
  if (!container) return;

  let filtered = samplePlayers;
  if (playerTab === 'online') {
    filtered = samplePlayers.filter(p => p.online);
  } else if (playerTab === 'whitelist') {
    filtered = samplePlayers.filter(p => p.whitelisted);
  } else if (playerTab === 'banned') {
    filtered = samplePlayers.filter(p => p.banned);
  }

  document.getElementById('subtab-count-whitelist').innerText = samplePlayers.filter(p => p.whitelisted).length;
  document.getElementById('subtab-count-banned').innerText = samplePlayers.filter(p => p.banned).length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 2.5rem; text-align: center; color: var(--text-dim); font-size: 0.8125rem;">
        <i class="fa-solid fa-ghost" style="font-size: 1.5rem; opacity: 0.4; margin-bottom: 0.5rem; display: block;"></i>
        No players found in this category
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="table-row">
      <div>
        <input type="checkbox" style="accent-color: var(--accent-purple);" />
      </div>
      <div class="player-cell">
        <img src="https://mc-heads.net/avatar/${p.name}/32" class="player-cell-avatar" alt="${p.name}" />
        <span class="player-cell-name">${p.name}</span>
      </div>
      <div>
        <span class="uuid-pill">${p.uuid}</span>
      </div>
      <div style="text-align: right;">
        <button class="action-trash-btn" onclick="removePlayer('${p.name}')" title="Remove Player">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function toggleWhitelist(enabled) {
  isWhitelistEnabled = enabled;
  document.getElementById('whitelist-sub-label').innerText = enabled
    ? 'Only whitelisted players can join'
    : 'All players can join';
  dispatchServerCommand(enabled ? 'whitelist on' : 'whitelist off');
}

function promptAddPlayer() {
  const username = prompt('Enter Minecraft username to whitelist:');
  if (!username) return;

  dispatchServerCommand(`whitelist add ${username.trim()}`);
  samplePlayers.push({
    name: username.trim(),
    uuid: 'player-' + Math.random().toString(36).substring(2, 10),
    online: false,
    whitelisted: true
  });
  renderPlayersTable();
}

function removePlayer(name) {
  if (!confirm(`Remove ${name} from whitelist?`)) return;
  dispatchServerCommand(`whitelist remove ${name}`);
  samplePlayers = samplePlayers.filter(p => p.name !== name);
  renderPlayersTable();
}

// ==================== CONSOLE & TERMINAL ====================
function initTerminal() {
  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    theme: {
      background: '#08050e',
      foreground: '#f4f4f5',
      cursor: '#c084fc',
      selectionBackground: '#261b3d'
    },
    convertEol: true
  });

  fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(document.getElementById('xterm-container'));
  fitAddon.fit();

  window.addEventListener('resize', () => {
    if (fitAddon) fitAddon.fit();
  });
}

function clearTerminal() {
  if (terminal) terminal.clear();
}

function connectConsole(nodeId) {
  if (consoleWs) consoleWs.close();

  terminal.clear();
  terminal.writeln(`\x1b[35m=== Connected to live console: mc-${nodeId} ===\x1b[0m\r\n`);

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/console/${nodeId}?token=${authToken}`;

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
}

// Command Submission
const consoleCmdForm = document.getElementById('console-command-form');
const consoleCmdInput = document.getElementById('console-cmd-input');

consoleCmdForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const cmd = consoleCmdInput.value.trim();
  if (!cmd) return;

  cmdHistory.push(cmd);
  cmdHistoryIndex = cmdHistory.length;

  if (consoleWs && consoleWs.readyState === WebSocket.OPEN) {
    consoleWs.send(JSON.stringify({ type: 'command', command: cmd }));
  } else {
    dispatchServerCommand(cmd);
  }

  consoleCmdInput.value = '';
});

// Arrow Up / Down Command History
consoleCmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') {
    if (cmdHistoryIndex > 0) {
      cmdHistoryIndex--;
      consoleCmdInput.value = cmdHistory[cmdHistoryIndex] || '';
    }
  } else if (e.key === 'ArrowDown') {
    if (cmdHistoryIndex < cmdHistory.length - 1) {
      cmdHistoryIndex++;
      consoleCmdInput.value = cmdHistory[cmdHistoryIndex] || '';
    } else {
      cmdHistoryIndex = cmdHistory.length;
      consoleCmdInput.value = '';
    }
  }
});

function sendQuickCommand(cmd) {
  if (consoleWs && consoleWs.readyState === WebSocket.OPEN) {
    consoleWs.send(JSON.stringify({ type: 'command', command: cmd }));
  } else {
    dispatchServerCommand(cmd);
  }
}

async function dispatchServerCommand(cmd) {
  try {
    const res = await fetch(`/api/servers/${activeNode}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ command: cmd })
    });
    const data = await res.json();
    if (terminal) {
      terminal.writeln(`\x1b[32m[Response] ${data.response || 'Executed'}\x1b[0m`);
    }
  } catch (err) {
    console.error('Command failed:', err);
  }
}

// Power Controls
async function triggerPowerAction(action) {
  if (!confirm(`Are you sure you want to ${action} ${activeNode}?`)) return;

  try {
    const res = await fetch(`/api/servers/${activeNode}/power`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (terminal) {
      terminal.writeln(`\r\n\x1b[35m[Power Control] ${data.message || data.error}\x1b[0m`);
    }
  } catch (err) {
    alert('Power action error: ' + err.message);
  }
}

