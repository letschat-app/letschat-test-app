import fs from 'fs';

let content = fs.readFileSync('src/Navbar.jsx', 'utf8');

if (!content.includes("import { useTheme }")) {
  content = content.replace("import { API } from './service/UserAuth';", "import { API } from './service/UserAuth';\nimport { useTheme } from '../context/ThemeContext';");
  content = content.replace("const userId = localStorage.getItem('userid');", "const { theme, setTheme, availableThemes } = useTheme();\n  const userId = localStorage.getItem('userid');");
  
  const themePickerUI = `
            {showLogoutConfirm && (
              <div style={confirmBoxStyle} ref={logoutRef}>
                <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: 'var(--text-primary)' }}>
                  Are you sure you want to logout?
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleLogout} style={confirmButtonStyle}>Yes</button>
                  <button onClick={toggleLogoutConfirm} style={cancelButtonStyle}>No</button>
                </div>
              </div>
            )}
            
            <div style={dividerStyle} />
            <div style={{ padding: '10px 0' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px', fontWeight: '600' }}>Theme</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {availableThemes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: theme === t.id ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                      background: theme === t.id ? 'var(--nav-active-bg)' : 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
  `;
  content = content.replace(/\{showLogoutConfirm && \([\s\S]*?\}\)/, themePickerUI);
}

const colorMappings = {
  "'#0c1e2e'": "'var(--bg-secondary)'",
  "'#050d14'": "'var(--bg-primary)'",
  "linear-gradient(135deg, #0c1e2e 0%, #050d14 100%)": "var(--bg-gradient)",
  "'#1a1a1a'": "'var(--bg-primary)'",
  "'#ffffff'": "'var(--text-primary)'",
  "'#fff'": "'var(--text-primary)'",
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
  "'#000'": "'var(--bg-primary)'"
};

for (const [hex, variable] of Object.entries(colorMappings)) {
  content = content.split(hex).join(variable);
}

fs.writeFileSync('src/Navbar.jsx', content);

// Let's do the same for ChatBox.jsx just in case for its colors
let chatbox = fs.readFileSync('src/pages/ChatBox.jsx', 'utf8');
let cbOriginal = chatbox;
for (const [hex, variable] of Object.entries(colorMappings)) {
  chatbox = chatbox.split(hex).join(variable);
}
if (chatbox !== cbOriginal) {
  fs.writeFileSync('src/pages/ChatBox.jsx', chatbox);
}

console.log("Done refactoring styles via node script.");
