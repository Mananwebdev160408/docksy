import React from "react";

export default function Home() {
  return (
    <>
      {/* Navigation Header */}
      <header className="header">
        <div className="container nav-container">
          <a href="#" className="logo-link">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M3 9h6" />
              <path d="M14 9h7" />
              <path d="M14 15h7" />
            </svg>
            Docksy
          </a>
          <nav>
            <ul className="nav-menu">
              <li><a href="#features" className="nav-link">Features</a></li>
              <li><a href="#setup" className="nav-link">Setup Wizard</a></li>
              <li>
                <a
                  href="https://github.com/Mananwebdev160408/docksy"
                  className="nav-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section className="hero-section">
          <div className="container hero-layout">
            <div className="hero-text">
              <h1>Never spend another minute setting up your workspace.</h1>
              <p>
                Docksy is a native Windows desktop utility that captures your running applications, window layouts, monitor positions, and browser tabs, and restores them in one click.
              </p>
              <div className="hero-actions">
                <a href="#setup" className="btn btn-primary">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Get Setup Wizard
                </a>
                <a
                  href="https://github.com/Mananwebdev160408/docksy"
                  className="btn btn-secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                  Inspect Code
                </a>
              </div>
            </div>

            <div className="hero-visual">
              <div className="blueprint-container">
                <div className="blueprint-grid-bg" />
                <div className="blueprint-header">
                  <span>docksy_restoration_grid.sys</span>
                  <div className="blueprint-status">
                    <span className="pulse-dot" />
                    <span>ACTIVE RESTORE</span>
                  </div>
                </div>

                <div className="blueprint-workspace">
                  {/* Mock Window 1 */}
                  <div className="wire-window w-ide">
                    <div className="wire-window-header">
                      <span className="wire-dot" />
                      <span className="wire-dot" />
                      <span className="wire-dot" />
                      <span style={{ fontSize: "7px", marginLeft: "4px", color: "var(--muted)" }}>VS Code</span>
                    </div>
                    <div className="wire-window-body">
                      <div className="wire-line long" />
                      <div className="wire-line medium" />
                      <div className="wire-line short" />
                      <div className="wire-line long" />
                    </div>
                  </div>

                  {/* Mock Window 2 */}
                  <div className="wire-window w-browser">
                    <div className="wire-window-header">
                      <span className="wire-dot" />
                      <span className="wire-dot" />
                      <span className="wire-dot" />
                      <span style={{ fontSize: "7px", marginLeft: "4px", color: "var(--muted)" }}>Chrome</span>
                    </div>
                    <div className="wire-window-body">
                      <div className="wire-line short" />
                      <div className="wire-line long" />
                      <div className="wire-line medium" />
                    </div>
                  </div>
                </div>

                <div className="blueprint-footer">
                  <span>DISP_01: HDMI-1 (1920x1080)</span>
                  <span>SYS_OK</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="container">
            <div className="section-header">
              <h2>Engineered for developers and power users.</h2>
              <p>Everything you need to automate your Windows workstation state, preserved locally.</p>
            </div>
            
            <div className="grid grid-cols-4">
              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <h3>Window Layouts</h3>
                <p>Captures exact coordinate bounds, minimized/maximized states, and active monitors for all running processes.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3>Virtual Desktops</h3>
                <p>Integrates natively with Windows Virtual Desktops, ensuring applications restore to their designated workspaces.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </div>
                <h3>Browser Integration</h3>
                <p>Manifest V3 socket connection automatically retrieves and re-allocates active tabs in Chrome and Edge.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-wrapper">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3>100% Offline</h3>
                <p>No cloud login, telemetry, or external storage. Everything saves directly into a local SQLite database.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Setup Wizard Section */}
        <section id="setup" className="setup-section">
          <div className="container setup-layout">
            <div className="setup-text">
              <h2>Simple native installation.</h2>
              <p>Get docksy running on your Windows device in a few steps using the custom Setup Wizard.</p>
              
              <ul className="steps-list">
                <li className="step-item">
                  <span className="step-num">1</span>
                  <div className="step-content">
                    <h4>Download the Setup Wizard</h4>
                    <p>Grab the executable installer from our direct server download.</p>
                  </div>
                </li>
                <li className="step-item">
                  <span className="step-num">2</span>
                  <div className="step-content">
                    <h4>Run the Installer</h4>
                    <p>The installer configures the Node.js frontend, Python Win32 sidecar engine, and SQLite database.</p>
                  </div>
                </li>
                <li className="step-item">
                  <span className="step-num">3</span>
                  <div className="step-content">
                    <h4>Install Browser Extension</h4>
                    <p>Load the Chrome/Edge extension to start capturing and restoring browser tab history.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="setup-console">
              <div className="console-box">
                <div className="console-header">
                  <div className="console-dots">
                    <span className="console-dot red" />
                    <span className="console-dot yellow" />
                    <span className="console-dot green" />
                  </div>
                  <span>powershell.exe</span>
                </div>
                <div className="console-body">
                  <div className="console-line prompt">npm run package</div>
                  <div className="console-line">Building React frontend... done.</div>
                  <div className="console-line">Compiling Python Win32 sidecar... done.</div>
                  <div className="console-line">Packaging electron-builder distribution...</div>
                  <div className="console-line success">✓ Distribution created: dist-packaged/Docksy.Setup.1.0.1.exe</div>
                </div>

                <div className="download-bar">
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>Docksy.Setup.1.0.1.exe</span>
                    <span style={{ color: "#4c566a", fontSize: "0.7rem" }}>Windows x64 • ~45MB • MIT License</span>
                  </div>
                  <a
                    href="https://github.com/Mananwebdev160408/docksy/releases/latest/download/Docksy.Setup.1.0.1.exe"
                    className="btn btn-primary"
                    style={{ padding: "8px 16px", fontSize: "0.75rem" }}
                  >
                    Download Installer
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-layout">
          <div>
            <p style={{ fontSize: "0.875rem", marginBottom: "8px", fontWeight: 700, color: "var(--neutral-ink)" }}>
              Docksy — Windows Workspace Restorer
            </p>
            <p style={{ fontSize: "0.75rem" }}>
              MIT License • Made for local workspace automation.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-end" }}>
            <div className="footer-links">
              <a href="#features" className="footer-link">Features</a>
              <a href="#setup" className="footer-link">Setup Wizard</a>
              <a
                href="https://github.com/Mananwebdev160408/docksy"
                className="footer-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Source
              </a>
            </div>
            <span className="badge-windows">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.101zM10.8 1.95L24 0v11.55H10.8V1.95zM10.8 12.45H24v11.55l-13.2-1.95v-9.6z" />
              </svg>
              Windows 10 / 11 Compatible
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
