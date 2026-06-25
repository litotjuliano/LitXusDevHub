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

// On startup, reset all managed systems to stopped (processes were killed by START-DevHub.bat)
function resetRegistryOnStartup() {
  var reg = readRegistry();
  reg.systems.forEach(function(sys) {
    if (sys.name !== 'LitXusDevHub') {
      sys.status = 'stopped';
    }
  });
  writeRegistry(reg);
  console.log('[STARTUP] All system statuses reset to stopped.');
}

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
        updateSystemStatus(sys.name, 'stopped');
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

  function getRepo(name) {
    var reg = readRegistry();
    var repos = reg.gitRepos || [];
    return repos.find(function(r) { return r.name === name; }) || { name: 'LitXusDevHub', path: BASE, remote: 'https://github.com/litotjuliano/LitXusDevHub.git' };
  }

  if (url === '/api/git/repos' && method === 'GET') {
    var reg = readRegistry();
    return send(res, 200, { repos: reg.gitRepos || [] });
  }

  if (url === '/api/git/status' && method === 'GET') {
    var qrepo = (req.url.split('?repo=')[1] || '').split('&')[0];
    var srepo = getRepo(decodeURIComponent(qrepo) || 'LitXusDevHub');
    exec('git status --short', { cwd: srepo.path, shell: true }, function(err, stdout) {
      send(res, 200, { status: stdout || 'Nothing to commit.' });
    });
    return;
  }

  if (url === '/api/git/commit' && method === 'POST') {
    parseBody(req).then(function(body) {
      var repo = getRepo(body.repo || 'LitXusDevHub');
      var msg = (body.message || 'chore: update').replace(/"/g, "'");
      var gitDir = path.join(repo.path, '.git');
      var locks = ['index.lock', 'HEAD.lock', 'config.lock'].map(function(f) { return path.join(gitDir, f); });
      locks.forEach(function(f) { try { fs.unlinkSync(f); } catch(e) {} });
      exec('git add . && git commit -m "' + msg + '"', { cwd: repo.path, shell: true }, function(err, stdout, stderr) {
        if (err && err.code !== 0) return send(res, 200, { success: false, message: stderr || err.message });
        send(res, 200, { success: true, message: stdout.trim() });
      });
    });
    return;
  }

  if (url === '/api/git/push' && method === 'POST') {
    parseBody(req).then(function(body) {
      var repo = getRepo(body.repo || 'LitXusDevHub');
      exec('git remote get-url origin', { cwd: repo.path, shell: true }, function(err) {
        var setRemote = err
          ? 'git remote add origin ' + repo.remote + ' && '
          : 'git remote set-url origin ' + repo.remote + ' && ';
        exec(setRemote + 'git push origin master', { cwd: repo.path, shell: true }, function(err2, stdout, stderr) {
          if (err2) return send(res, 200, { success: false, message: stderr || err2.message });
          send(res, 200, { success: true, message: 'Pushed ' + repo.name + ' to origin/master' });
        });
      });
    });
    return;
  }

  if (url === '/api/registry' && method === 'POST') {
    parseBody(req).then(function(body) {
      writeRegistry(body);
      send(res, 200, { success: true });
    });
    return;
  }

  // ── UAT: Read incoming file ──────────────────────────────────────────────────
  if (url.startsWith('/api/uat/read') && method === 'GET') {
    var uatFile = decodeURIComponent((url.split('?file=')[1] || '').split('&')[0]);
    if (!uatFile) return send(res, 400, { error: 'No filename' });
    var uatCandidates = [
      path.join(BASE, 'incoming', uatFile),
      path.join(BASE, 'outgoing', uatFile)
    ];
    var uatPath = null;
    uatCandidates.forEach(function(c) { if (!uatPath && fs.existsSync(c)) uatPath = c; });
    if (!uatPath) return send(res, 404, { error: 'File not found: ' + uatFile });
    try {
      return send(res, 200, { content: fs.readFileSync(uatPath, 'utf8') });
    } catch(e) { return send(res, 500, { error: e.message }); }
  }

  // ── UAT: Save test report ────────────────────────────────────────────────────
  if (url === '/api/uat/report' && method === 'POST') {
    parseBody(req).then(function(body) {
      var outDir = path.join(BASE, 'outgoing');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      var rFilename = 'test-report-' + (body.project || 'unknown').toLowerCase().replace(/\s/g,'-') + '-v' + (body.version || '1') + '.md';
      var rPath = path.join(outDir, rFilename);

      var items = body.items || [];
      var passed    = items.filter(function(i) { return i.status === 'passed'; }).length;
      var failed    = items.filter(function(i) { return i.status === 'failed'; }).length;
      var retesting = items.filter(function(i) { return i.status === 'retesting'; }).length;
      var pending   = items.filter(function(i) { return i.status === 'pending'; }).length;
      var icons     = { passed: '✅', failed: '❌', pending: '⏳', retesting: '🔄' };
      var today     = new Date().toISOString().split('T')[0];

      var md = '# LitXus Test Report — ' + body.project + ' v' + body.version + '\n';
      md += '<!-- STATUS: UPDATED — ' + today + ' -->\n\n';
      md += '## Report Info\n';
      md += '- **Project:** ' + body.project + '\n';
      md += '- **Version:** v' + body.version + '\n';
      md += '- **Date:** ' + today + '\n';
      md += '- **Reviewed By:** LitXusDevHub\n\n---\n\n';
      md += '## UAT Results\n\n';
      md += '| # | Feature | Status | Notes |\n';
      md += '|---|---------|--------|-------|\n';
      items.forEach(function(item) {
        var icon = icons[item.status] || '⏳';
        var label = item.status.charAt(0).toUpperCase() + item.status.slice(1);
        md += '| ' + item.id + ' | ' + item.feature + ' | ' + icon + ' ' + label + ' | ' + (item.notes || '') + ' |\n';
      });
      md += '\n---\n\n## Summary\n\n';
      md += '| Total | Passed | Failed | Re-testing | Pending |\n';
      md += '|-------|--------|--------|------------|---------|\n';
      md += '| ' + items.length + ' | ' + passed + ' | ' + failed + ' | ' + retesting + ' | ' + pending + ' |\n\n';

      var errorItems = items.filter(function(i) { return i.status === 'failed' && i.notes; });
      if (errorItems.length) {
        md += '---\n\n## Error Details\n\n';
        errorItems.forEach(function(item) {
          md += '### Feature ' + item.id + ': ' + item.feature + '\n';
          md += '- **Status:** ❌ Failed\n';
          md += '- **Notes:** ' + item.notes + '\n\n';
        });
      }

      md += '---\n\n## Feedback to ' + body.project + '\n';
      if (failed > 0) {
        md += '- **Action Required:** ' + failed + ' item(s) failed — fix and notify DevHub for re-test.\n';
      } else if (pending > 0 || retesting > 0) {
        md += '- **Action Required:** Testing in progress.\n';
      } else {
        md += '- **Status:** All items passed — UAT cycle complete. ✅\n';
      }

      fs.writeFileSync(rPath, md, 'utf8');
      console.log('[UAT] Report saved: ' + rFilename);

      // Update uat-tracker in registry
      var reg = readRegistry();
      if (!reg.uatTracker) reg.uatTracker = [];
      var overallResult = failed > 0 ? 'failed' : (pending > 0 || retesting > 0) ? 'pending' : 'passed';
      var existing = reg.uatTracker.find(function(t) { return t.project === body.project && t.version === ('v' + body.version); });
      var summary = passed + ' passed, ' + failed + ' failed, ' + pending + ' pending';
      if (existing) {
        existing.result = overallResult; existing.date = today; existing.notes = summary;
      } else {
        reg.uatTracker.push({ project: body.project, version: 'v' + body.version, date: today, result: overallResult, notes: summary });
      }
      writeRegistry(reg);

      send(res, 200, { success: true, filename: rFilename });
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

resetRegistryOnStartup();
seedFromDefaults();
killPortsAndStart();

function seedFromDefaults() {
  var reg = readRegistry();
  if (reg.systems && reg.systems.length > 0) return; // already populated
  var defaultsPath = path.join(BASE, 'systems-defaults.json');
  if (!fs.existsSync(defaultsPath)) {
    console.log('[INIT] systems-defaults.json not found — skipping seed.');
    return;
  }
  try {
    var defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
    if (!defaults.systems || !defaults.systems.length) return;
    reg.systems = defaults.systems;
    writeRegistry(reg);
    console.log('[INIT] systems array was empty — seeded ' + defaults.systems.length + ' systems from systems-defaults.json');
  } catch (e) {
    console.error('[INIT] Failed to seed from defaults: ' + e.message);
  }
}

server.on('listening', function() {
  console.log('');
  console.log('  LitXusDevHub Server');
  console.log('  http://localhost:' + PORT);
  console.log('  Press Ctrl+C to stop');
  console.log('');
  try {
    fs.watch(INCOMING_PATH, function(event, filename) {
      if (filename && filename.endsWith('.md')) {
        console.log('[INCOMING] ' + filename);
        scanIncoming();
      }
    });
  } catch(e) { console.log('  Could not watch incoming: ' + e.message); }
  scanIncoming();
});

server.on('error', function(e) {
  if (e.code === 'EADDRINUSE') {
    console.error('  ERROR: Port ' + PORT + ' still in use. Try again.');
  } else {
    console.error('  ERROR: ' + e.message);
  }
  process.exit(1);
});
