const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

process.on('uncaughtException', function(e) { console.error('[UNCAUGHT] ' + e.message); });
process.on('unhandledRejection', function(e) { console.error('[UNHANDLED] ' + e); });

const PORT = 5000;
const BASE = 'C:\\LitXus Systems\\LitXusDevHub';
const REGISTRY_PATH = path.join(BASE, 'systems-registry.json');
const INCOMING_PATH = path.join(BASE, 'incoming');
const DASHBOARD_PATH = path.join(BASE, 'dashboard.html');

const processes = {};

function readRegistry() {
  try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); }
  catch { return { systems: [], notifications: [], uatTracker: [] }; }
}

function writeRegistry(data) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function updateSystemStatus(name, status) {
  var reg = readRegistry();
  var sys = reg.systems.find(function(s) { return s.name === name; });
  if (sys) {
    sys.status = status;
    sys.lastUpdated = new Date().toISOString().split('T')[0];
    writeRegistry(reg);
  }
}

function addNotification(from, file, type) {
  var reg = readRegistry();
  if (!reg.notifications) reg.notifications = [];
  reg.notifications.unshift({
    id: Date.now(), from: from, file: file, type: type, status: 'pending',
    received: new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })
  });
  writeRegistry(reg);
}

function scanIncoming() {
  try {
    var files = fs.readdirSync(INCOMING_PATH);
    var reg = readRegistry();
    var existingFiles = (reg.notifications || []).map(function(n) { return n.file; });
    files.forEach(function(file) {
      if (!existingFiles.includes(file) && file.endsWith('.md')) {
        var project = file.includes('count') ? 'LitXusCount' : file.includes('travel') ? 'LitXusTravel' : 'Unknown';
        var type = file.includes('uat') ? 'UAT' : 'FILE';
        addNotification(project, file, type);
        console.log('[INCOMING] ' + file);
      }
    });
  } catch(e) { console.error('Scan incoming error: ' + e.message); }
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendHTML(res, filePath) {
  try {
    var html = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    });
    res.end(html);
  } catch(e) {
    res.writeHead(404);
    res.end('Dashboard not found.');
  }
}

function parseBody(req) {
  return new Promise(function(resolve) {
    var body = '';
    req.on('data', function(chunk) { body += chunk; });
    req.on('end', function() {
      try { resolve(JSON.parse(body)); } catch(e) { resolve({}); }
    });
  });
}

function spawnProcess(key, cmd, cwd, extraEnv) {
  if (!fs.existsSync(cwd)) {
    console.error('[SKIP] ' + key + ' — working directory not found: ' + cwd);
    return null;
  }
  var env = Object.assign({}, process.env, extraEnv || {});
  var proc = spawn("cmd", ["/c", cmd], { cwd: cwd, shell: false, detached: false, windowsHide: false, env: env });
  processes[key] = proc;
  proc.on('error', function(e) { console.error('[ERROR] ' + key + ': ' + e.message); delete processes[key]; });
  if (proc.stderr) proc.stderr.on('data', function(d) { console.error('[' + key + '] ' + d); });
  if (proc.stdout) proc.stdout.on('data', function(d) { console.log('[' + key + '] ' + d); });
  proc.on('exit', function(code) {
    delete processes[key];
    console.log('[STOP] ' + key + ' exited (code ' + code + ')');
  });
  return proc;
}

function killPort(port, cb) {
  exec(
    'FOR /F "tokens=5" %P IN (\'netstat -ano ^| findstr :' + port + '\') DO taskkill /PID %P /F',
    { shell: true },
    function() { cb(); }
  );
}

function startSystem(sys) {
  if (processes[sys.name]) return { success: false, message: sys.name + ' is already running' };
  try {
    var cmd = sys.startCommand || 'npm start';
    var cwd = sys.workingDirectory || 'C:\\LitXus Systems\\' + sys.name;
    var proc = spawnProcess(sys.name, cmd, cwd, sys.startEnv);
    updateSystemStatus(sys.name, 'running');
    proc.on('exit', function() { updateSystemStatus(sys.name, 'stopped'); });
    if (sys.frontendStartCommand && sys.frontendWorkingDirectory) {
      var feKey = sys.name + '_frontend';
      if (!processes[feKey]) {
        var feProc = spawnProcess(feKey, sys.frontendStartCommand, sys.frontendWorkingDirectory);
        if (feProc) console.log('[START] ' + sys.name + ' frontend started');
      }
    }
    console.log('[START] ' + sys.name + ' PID: ' + proc.pid);
    return { success: true, message: sys.name + ' started on port ' + sys.port, pid: proc.pid };
  } catch(e) { return { success: false, message: e.message }; }
}

function startFrontend(sys) {
  if (!sys.frontendStartCommand || !sys.frontendWorkingDirectory) {
    return { success: false, message: 'No frontend config for ' + sys.name };
  }
  var feKey = sys.name + '_frontend';
  var fePort = sys.urls && sys.urls.frontend ? parseInt(sys.urls.frontend.split(':').pop()) : null;
  if (processes[feKey]) {
    try { processes[feKey].kill('SIGTERM'); delete processes[feKey]; } catch(e) {}
  }
  function doStart() {
    var p = spawnProcess(feKey, sys.frontendStartCommand, sys.frontendWorkingDirectory);
    if (!p) return { success: false, message: sys.name + ' frontend directory not found: ' + sys.frontendWorkingDirectory };
    console.log('[START] ' + sys.name + ' frontend spawned');
    return { success: true, message: sys.name + ' frontend starting' };
  }
  if (fePort) {
    killPort(fePort, function() {});
    setTimeout(function() {}, 300);
  }
  return doStart();
}

function stopSystem(name) {
  return new Promise(function(resolve) {
    var reg = readRegistry();
    var sys = reg.systems.find(function(s) { return s.name === name; });
    var port = sys && sys.port;
    var fePort = sys && sys.urls && sys.urls.frontend ? parseInt(sys.urls.frontend.split(':').pop()) : null;

    var proc = processes[name];
    if (proc) {
      try { proc.kill('SIGTERM'); delete processes[name]; } catch(e) {}
    }
    var feKey = name + '_frontend';
    if (processes[feKey]) {
      try { processes[feKey].kill('SIGTERM'); delete processes[feKey]; } catch(e) {}
    }

    var ports = [port, fePort].filter(Boolean);
    if (ports.length === 0) {
      updateSystemStatus(name, 'stopped');
      return resolve({ success: true, message: name + ' stopped' });
    }
    var pending = ports.length;
    function done() {
      pending--;
      if (pending === 0) {
        updateSystemStatus(name, 'stopped');
        console.log('[STOP] ' + name + ' stopped (ports cleared)');
        resolve({ success: true, message: name + ' stopped' });
      }
    }
    ports.forEach(function(p) { killPort(p, done); });
  });
}

function buildSystem(sys) {
  return new Promise(function(resolve) {
    var cmd = sys.buildCommand || 'npm run build';
    var cwd = sys.workingDirectory || 'C:\\LitXus Systems\\' + sys.name;
    updateSystemStatus(sys.name, 'building');
    exec(cmd, { cwd: cwd, shell: true }, function(error, stdout, stderr) {
      if (error) {
        updateSystemStatus(sys.name, 'stopped');
        resolve({ success: false, message: stderr || error.message });
      } else {
        updateSystemStatus(sys.name, 'running');
        resolve({ success: true, message: sys.name + ' built', output: stdout });
      }
    });
  });
}

var server = http.createServer(function(req, res) {
  var url = req.url;
  var method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  console.log(method + ' ' + url);

  if (url === '/' || url === '/dashboard') return sendHTML(res, DASHBOARD_PATH);

  if (url === '/api/registry' && method === 'GET') {
    scanIncoming();
    return send(res, 200, readRegistry());
  }

  if (url === '/api/incoming' && method === 'GET') {
    try {
      var ifiles = fs.readdirSync(INCOMING_PATH).map(function(f) {
        return { name: f, modified: fs.statSync(path.join(INCOMING_PATH, f)).mtime };
      });
      return send(res, 200, { files: ifiles });
    } catch(e) { return send(res, 200, { files: [] }); }
  }

  var startMatch = url.match(/^\/api\/systems\/(.+)\/start$/);
  if (startMatch && method === 'POST') {
    var name = decodeURIComponent(startMatch[1]);
    var reg = readRegistry();
    var sys = reg.systems.find(function(s) { return s.name === name; });
    if (!sys) return send(res, 404, { error: 'System not found' });
    return send(res, 200, startSystem(sys));
  }

  var fStartMatch = url.match(/^\/api\/systems\/(.+)\/start-frontend$/);
  if (fStartMatch && method === 'POST') {
    var fname = decodeURIComponent(fStartMatch[1]);
    var freg = readRegistry();
    var fsys = freg.systems.find(function(s) { return s.name === fname; });
    if (!fsys) return send(res, 404, { error: 'System not found' });
    return send(res, 200, startFrontend(fsys));
  }

  var stopMatch = url.match(/^\/api\/systems\/(.+)\/stop$/);
  if (stopMatch && method === 'POST') {
    var sname = decodeURIComponent(stopMatch[1]);
    stopSystem(sname).then(function(result) {
      send(res, 200, result);
    }).catch(function(e) {
      console.error('[STOP ERROR] ' + sname + ': ' + e.message);
      send(res, 200, { success: true, message: sname + ' stop attempted' });
    });
    return;
  }

  var buildMatch = url.match(/^\/api\/systems\/(.+)\/build$/);
  if (buildMatch && method === 'POST') {
    var bname = decodeURIComponent(buildMatch[1]);
    var breg = readRegistry();
    var bsys = breg.systems.find(function(s) { return s.name === bname; });
    if (!bsys) return send(res, 404, { error: 'System not found' });
    buildSystem(bsys).then(function(result) { send(res, 200, result); });
    return;
  }

  var refreshMatch = url.match(/^\/api\/systems\/(.+)\/refresh$/);
  if (refreshMatch && method === 'POST') {
    var rname = decodeURIComponent(refreshMatch[1]);
    updateSystemStatus(rname, 'running');
    return send(res, 200, { success: true, message: rname + ' refreshed' });
  }

  var notifMatch = url.match(/^\/api\/notifications\/(\d+)\/process$/);
  if (notifMatch && method === 'POST') {
    var nid = parseInt(notifMatch[1]);
    var nreg = readRegistry();
    var notif = nreg.notifications.find(function(n) { return n.id === nid; });
    if (notif) { notif.status = 'processed'; writeRegistry(nreg); return send(res, 200, { success: true }); }
    return send(res, 404, { error: 'Notification not found' });
  }

  var dismissMatch = url.match(/^\/api\/notifications\/(\d+)\/dismiss$/);
  if (dismissMatch && method === 'POST') {
    var did = parseInt(dismissMatch[1]);
    var dreg = readRegistry();
    dreg.notifications = dreg.notifications.filter(function(n) { return n.id !== did; });
    writeRegistry(dreg);
    return send(res, 200, { success: true });
  }

  if (url === '/api/registry' && method === 'POST') {
    parseBody(req).then(function(body) {
      writeRegistry(body);
      send(res, 200, { success: true });
    });
    return;
  }

  send(res, 404, { error: 'Not found' });
});

function killPortsAndStart() {
  var reg = readRegistry();
  var ports = [PORT].concat(reg.systems.map(function(s) { return s.port; }).filter(Boolean));
  var uniquePorts = ports.filter(function(v, i, a) { return a.indexOf(v) === i; });
  console.log('[INIT] Clearing ports: ' + uniquePorts.join(', '));
  var pending = uniquePorts.length;
  uniquePorts.forEach(function(port) {
    killPort(port, function() {
      pending--;
      if (pending === 0) setTimeout(function() { server.listen(PORT); }, 500);
    });
  });
}

killPortsAndStart();

server.on('listening', function() {
  console.log('');
  console.log('  LitXusDevHub Server');
  console.log('  http://localhost:' + PORT);
  c