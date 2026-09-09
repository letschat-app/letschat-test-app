import fs from 'fs';
import path from 'path';

const dirsToScan = ['src', 'src/pages'];

const colorMappings = {
  "'#0c1e2e'": "'var(--bg-secondary)'",
  "'#050d14'": "'var(--bg-primary)'",
  "linear-gradient(135deg, #0c1e2e 0%, #050d14 100%)": "var(--bg-gradient)",
  "'#1a1a1a'": "'var(--bg-primary)'",
  "'#ffffff'": "'var(--text-primary)'",
  "'#fff'": "'var(--text-primary)'",
  "'white'": "'var(--text-primary)'",
  "'#3b82f6'": "'var(--accent-color)'",
  "rgba(59, 130, 246, 0.2)": "var(--bg-card)",
  "rgba(59, 130, 246, 0.25)": "var(--bg-card-hover)",
  "rgba(59, 130, 246, 0.35)": "var(--nav-active-bg)",
  "rgba(96, 165, 250, 0.35)": "var(--nav-active-bg)",
  "rgba(59, 130, 246, 0.4)": "var(--border-color)",
  "rgba(59, 130, 246, 0.3)": "var(--border-color)",
  "rgba(59, 130, 246, 0.5)": "var(--border-color)",
  "'#ef4444'": "'var(--danger-color)'",
  "'#1e3a5f'": "'var(--bg-card)'",
  "'#121212'": "'var(--bg-primary)'",
  "'#1A1A1A'": "'var(--bg-primary)'",
  "'#222'": "'var(--bg-secondary)'",
  "'#252525'": "'var(--bg-secondary)'",
  "'#1f1f1f'": "'var(--bg-secondary)'",
  "'#000000'": "'var(--bg-primary)'",
  "'#000'": "'var(--bg-primary)'",
  "'#1f2937'": "'var(--message-bg-incoming)'"
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      // Don't recurse blindly
    } else if (fullPath.endsWith('.jsx') && file !== 'Navbar.jsx') {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let original = content;
      for (const [hex, variable] of Object.entries(colorMappings)) {
        content = content.split(hex).join(variable);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log("Updated " + fullPath);
      }
    }
  }
}

dirsToScan.forEach(dir => processDirectory(dir));
