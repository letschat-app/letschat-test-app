const fs = require('fs');
let code = fs.readFileSync('src/Navbar.jsx', 'utf8');

// Inject imports
code = code.replace("import { API } from './service/UserAuth';", "import { API } from './service/UserAuth';\nimport { useTheme } from './context/ThemeContext';");

// Inject useTheme hook
code = code.replace("const userId = localStorage.getItem('userid');", "const { theme, setTheme, availableThemes } = useTheme();\n  const userId = localStorage.getItem('userid');");

// Inject Theme Picker UI
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
code = code.replace(/\{showLogoutConfirm && \([\s\S]*?\}\)/, themePickerUI);

// Style Replacements
code = code.replace(/linear-gradient\(135deg, #0c1e2e 0%, #050d14 100%\)/g, 'var(--bg-gradient)');
code = code.replace(/'#ffffff'/g, "'var(--text-primary)'");
code = code.replace(/'#fff'/g, "'var(--text-primary)'");
code = code.replace(/'#3b82f6'/g, "'var(--accent-color)'");
code = code.replace(/rgba\(59, 130, 246, 0.2\)/g, 'var(--bg-card)');
code = code.replace(/rgba\(59, 130, 246, 0.25\)/g, 'var(--bg-card-hover)');
code = code.replace(/rgba\(59, 130, 246, 0.35\)/g, 'var(--nav-active-bg)');
code = code.replace(/rgba\(96, 165, 250, 0.35\)/g, 'var(--nav-active-bg)');
code = code.replace(/rgba\(59, 130, 246, 0.4\)/g, 'var(--border-color)');
code = code.replace(/rgba\(59, 130, 246, 0.3\)/g, 'var(--border-color)');
code = code.replace(/rgba\(59, 130, 246, 0.5\)/g, 'var(--border-color)');
code = code.replace(/'#ef4444'/g, "'var(--danger-color)'");
code = code.replace(/'#1a1a1a'/g, "'var(--bg-primary)'");
code = code.replace(/'#1e3a5f'/g, "'var(--bg-card)'");

fs.writeFileSync('src/Navbar.jsx', code);
console.log('Navbar.jsx refactored successfully.');
