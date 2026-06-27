/**
 * LitXusDevHub — UAT Auto-Sync Watcher
 *
 * Watches both sides of the UAT communication:
 *   LitXusTravel/uat/outgoing/  → DevHub/incoming/          (project sends UAT list)
 *   DevHub/outgoing/            → LitXusTravel/uat/incoming/ (DevHub sends feedback)
 *
 * Just run: node uat-sync.js
 * Or it starts automatically with START-DevHub.bat
 */

const fs = require('fs');
const path = require('path');

const PROJECTS = [
  {
    name: 'LitXusTravel',
    // Where the project drops its UAT lists
    projectOutgoing: 'C:\\LitXus Systems\\LitXusTravel\\uat\\outgoing',
    // Where DevHub receives them
    devhubIncoming: 'C:\\LitXus Systems\\LitXusDevHub\\incoming',
    // DevHub renames file to include project name
    incomingPrefix: 'uat-list-litxustravel-',

    // Where DevHub puts its feedback
    devhubOutgoing: 'C:\\LitXus Systems\\LitXusDevHub\\outgoing',
    // What DevHub report files are named (pattern)
    outgoingPattern: 'test-report-litxustravel-',
    // Where the project reads feedback
    projectIncoming: 'C:\\LitXus Systems\\LitXusTravel\\uat\\incoming',
    // Project sees the file without the project prefix
    projectIncomingPrefix: 'test-report-',
  },
  // Add more projects here:
  // {
  //   name: 'LitXusCount',
  //   projectOutgoing: 'C:\\LitXus Systems\\LitXusCount\\uat\\outgoing',
  //   devhubIncoming: 'C:\\LitXus Systems\\LitXusDevHub\\incoming',
  //   incomingPrefix: 'uat-list-litxuscount-',
  //   devhubOutgoing: 'C:\\LitXus Systems\\LitXusDevHub\\outgoing',
  //   outgoingPattern: 'test-report-litxuscount-',
  //   projectIncoming: 'C:\\LitXus Systems\\LitXusCount\\uat\\incoming',
  //   projectIncomingPrefix: 'test-report-',
  // },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[UAT-SYNC] Created folder: ${dir}`);
  }
}

function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    const srcShort = src.split('\\').slice(-3).join('\\');
    const destShort = dest.split('\\').slice(-3).join('\\');
    console.log(`[UAT-SYNC] ✅ Copied: ${srcShort} → ${destShort}`);
  } catch (err) {
    console.error(`[UAT-SYNC] ❌ Copy failed: ${err.message}`);
  }
}

function watchDir(dir, label, onChange) {
  ensureDir(dir);
  fs.watch(dir, (eventType, filename) => {
    if (!filename || !filename.endsWith('.md')) return;
    if (eventType !== 'rename' && eventType !== 'change') return;

    const srcPath = path.join(dir, filename);
    // Small delay so the file is fully written before we copy
    setTimeout(() => {
      if (fs.existsSync(srcPath)) {
        onChange(srcPath, filename);
      }
    }, 300);
  });
  console.log(`[UAT-SYNC] 👁  Watching [${label}]: ${dir}`);
}

// Start watchers for all projects
for (const project of PROJECTS) {

  // 1. Project → DevHub: when project drops a UAT list, copy to DevHub incoming
  watchDir(project.projectOutgoing, `${project.name} → DevHub`, (srcPath, filename) => {
    // uat-list-v1.md → uat-list-litxustravel-v1.md
    const version = filename.replace('uat-list-', '');
    const destFilename = project.incomingPrefix + version;
    const destPath = path.join(project.devhubIncoming, destFilename);
    copyFile(srcPath, destPath);
  });

  // 2. DevHub → Project: when DevHub writes a report, copy to project incoming
  watchDir(project.devhubOutgoing, `DevHub → ${project.name}`, (srcPath, filename) => {
    if (!filename.startsWith(project.outgoingPattern)) return;
    // test-report-litxustravel-v1.md → test-report-v1.md
    const version = filename.replace(project.outgoingPattern, '');
    const destFilename = project.projectIncomingPrefix + version;
    const destPath = path.join(project.projectIncoming, destFilename);
    copyFile(srcPath, destPath);
  });
}

console.log('');
console.log('[UAT-SYNC] 🚀 UAT Auto-Sync running. Files copy automatically when saved.');
console.log('[UAT-SYNC]    LitXusTravel/uat/outgoing → DevHub/incoming');
console.log('[UAT-SYNC]    DevHub/outgoing           → LitXusTravel/uat/incoming');
console.log('[UAT-SYNC]    Press Ctrl+C to stop.');
console.log('');
