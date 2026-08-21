import http from 'node:http';
import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import * as bip39 from 'bip39';

export interface WalletSyncResult {
  seed: Uint8Array;
  seedHex: string;
  source: string;
}

export function parseSeedOrMnemonic(raw: string): { seed: Uint8Array; seedHex: string } | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  // Check BIP-39 mnemonic phrase
  if (trimmed.includes(' ')) {
    try {
      const seedBuffer = bip39.mnemonicToSeedSync(trimmed).subarray(0, 32);
      return {
        seed: new Uint8Array(seedBuffer),
        seedHex: Buffer.from(seedBuffer).toString('hex'),
      };
    } catch {
      return null;
    }
  }

  // Check 64-character hex seed
  const cleanHex = trimmed.replace(/^0x/i, '');
  if (cleanHex.length === 64 && /^[0-9a-fA-F]{64}$/.test(cleanHex)) {
    const seedBuffer = Buffer.from(cleanHex, 'hex');
    return {
      seed: new Uint8Array(seedBuffer),
      seedHex: cleanHex.toLowerCase(),
    };
  }

  return null;
}

function openBrowser(url: string) {
  const platform = process.platform;
  let command = '';

  if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      console.warn(`[Browser Sync] Could not automatically open browser: ${err.message}`);
      console.log(`[Browser Sync] Please manually navigate to: ${url}`);
    }
  });
}

function getSyncHtml(port: number, envSeedHex?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Midnight Contract Deployment — Deployer Portal</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f293d;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent: #8b5cf6;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, var(--bg) 70%);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .container {
      width: 100%;
      max-width: 680px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
      padding: 32px;
    }
    .badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-live {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    h1 {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 6px;
      background: linear-gradient(135deg, #ffffff 0%, #93c5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .card-section {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .wallet-detect-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .wallet-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .wallet-icon {
      width: 40px;
      height: 40px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    .wallet-name { font-weight: 600; font-size: 15px; }
    .wallet-status { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: var(--primary);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .btn:hover:not(:disabled) {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #1e293b; color: #f1f5f9; border: 1px solid #334155; }
    .btn-secondary:hover:not(:disabled) { background: #334155; }
    .btn-faucet { background: #059669; color: white; }
    .btn-faucet:hover:not(:disabled) { background: #047857; }
    .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 6px; }
    .quick-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 20px 0;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--card-border);
    }
    .divider::before { margin-right: 12px; }
    .divider::after { margin-left: 12px; }
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 6px;
      color: #d1d5db;
    }
    textarea {
      width: 100%;
      background: #090d16;
      border: 1px solid #334155;
      border-radius: 8px;
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 13px;
      padding: 12px;
      transition: border-color 0.15s ease;
      outline: none;
      resize: vertical;
    }
    textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    .address-card {
      margin-top: 14px;
      padding: 14px;
      background: #090d16;
      border: 1px solid #334155;
      border-radius: 8px;
    }
    .address-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    .address-val {
      font-family: var(--font-mono);
      font-size: 12px;
      color: #93c5fd;
      word-break: break-all;
      margin-bottom: 10px;
    }
    .status-box {
      margin-top: 16px;
      padding: 14px;
      border-radius: 8px;
      font-size: 13px;
      display: none;
      line-height: 1.5;
    }
    .status-box.success {
      display: block;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .status-box.error {
      display: block;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }
    .status-box.info {
      display: block;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.4);
      color: #93c5fd;
    }
    .notice {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12px;
      margin-top: 14px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge-row">
      <div class="badge">Midnight Preview Network</div>
      <div class="badge badge-live" id="live-indicator">● CLI Bridge Active</div>
    </div>
    <h1>Deployer Wallet Portal</h1>
    <p class="subtitle">
      Sync your deployer wallet with your active CLI terminal to fund and deploy the smart contract on-chain.
    </p>

    <!-- Browser Extension Card -->
    <div class="card-section">
      <div class="wallet-detect-box">
        <div class="wallet-info">
          <div class="wallet-icon" id="wallet-icon">🌙</div>
          <div>
            <div class="wallet-name" id="wallet-name">Detecting Browser Extension...</div>
            <div class="wallet-status" id="wallet-status">Checking for Lace / 1AM wallet...</div>
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="manualDetect()">🔄 Scan</button>
          <button class="btn btn-secondary btn-sm" id="btn-connect" onclick="connectExtensionWallet()">Connect</button>
        </div>
      </div>
    </div>

    <!-- Quick Action Seed Generators -->
    <div class="quick-actions">
      <button class="btn btn-secondary btn-sm" onclick="generateRandomSeed()">🎲 Generate Fresh Random Seed</button>
      ${envSeedHex ? `<button class="btn btn-secondary btn-sm" onclick="useEnvSeed('${envSeedHex}')">💾 Load Saved .env Seed</button>` : ''}
    </div>

    <div class="form-group">
      <label for="seed-input">Deployer Wallet Seed (64-char Hex) or BIP-39 Mnemonic Phrase (12/24 words)</label>
      <textarea id="seed-input" rows="3" oninput="onSeedChanged()" placeholder="Enter or paste your 64-char hex seed or 12/24-word BIP-39 mnemonic phrase..."></textarea>
    </div>

    <!-- Derived Address & Faucet Helper -->
    <div class="address-card" id="address-preview-card" style="display: none;">
      <div class="address-label">Unshielded Address (Fund this address on Faucet):</div>
      <div class="address-val" id="derived-address-text"></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="btn btn-secondary btn-sm" onclick="copyAddress()">📋 Copy Address</button>
        <a class="btn btn-faucet btn-sm" href="https://faucet.preview.midnight.network" target="_blank">💧 Open Midnight Preview Faucet ↗</a>
      </div>
    </div>

    <div class="notice">
      <strong>💡 Important Midnight Deployment Note:</strong><br/>
      Smart contract deployment transactions on Midnight require <strong>Unshielded tNIGHT tokens</strong> to balance and publish on-chain. Please paste the unshielded address above into the Midnight Preview faucet if your balance is 0.
    </div>

    <div style="margin-top: 20px;">
      <button class="btn" id="btn-sync" style="width: 100%; padding: 14px; font-size: 15px;" onclick="syncWithCli()">
        🚀 Sync Wallet with Deployment Terminal
      </button>
    </div>

    <div class="status-box" id="status-box"></div>
  </div>

  <script>
    let detectedWallet = null;
    let currentDerivedAddress = "";

    function detectExtension() {
      const win = window;
      const midnight = win.midnight;
      const cardano = win.cardano;

      let found = null;
      let name = "No Extension Detected";
      let icon = "⚠️";

      if (midnight) {
        if (midnight.mnLace || midnight.lace || midnight['io.lace.midnight']) {
          found = midnight.mnLace || midnight.lace || midnight['io.lace.midnight'];
          name = "Lace Wallet (Midnight)";
          icon = "🪢";
        } else if (midnight['1am'] || midnight['xyz.oneam.wallet']) {
          found = midnight['1am'] || midnight['xyz.oneam.wallet'];
          name = "1AM Midnight Wallet";
          icon = "⏰";
        } else {
          for (const [k, v] of Object.entries(midnight)) {
            if (v && (v.connect || v.enable)) {
              found = v;
              name = v.name || k;
              icon = "🌙";
              break;
            }
          }
        }
      }

      if (!found && cardano?.lace) {
        found = cardano.lace;
        name = "Lace Wallet (Cardano)";
        icon = "🪢";
      }

      const nameEl = document.getElementById('wallet-name');
      const statusEl = document.getElementById('wallet-status');
      const iconEl = document.getElementById('wallet-icon');
      const connectBtn = document.getElementById('btn-connect');

      if (found) {
        detectedWallet = found;
        nameEl.textContent = name;
        statusEl.textContent = "Ready to connect";
        iconEl.textContent = icon;
        connectBtn.disabled = false;
        connectBtn.textContent = "Connect";
      } else {
        nameEl.textContent = "No Injected Extension Found";
        statusEl.textContent = "Paste your Seed/Mnemonic below or click 'Generate Fresh Seed'";
        connectBtn.disabled = true;
      }
    }

    function manualDetect() {
      detectExtension();
      const statusBox = document.getElementById('status-box');
      if (detectedWallet) {
        statusBox.className = "status-box success";
        statusBox.textContent = "Extension detected: " + document.getElementById('wallet-name').textContent;
      } else {
        statusBox.className = "status-box info";
        statusBox.textContent = "Scanned window.midnight & window.cardano. No extension found. You can enter your seed manually below.";
      }
    }

    async function connectExtensionWallet() {
      const statusBox = document.getElementById('status-box');
      try {
        if (!detectedWallet) {
          throw new Error("No extension detected. Paste your seed or mnemonic below.");
        }
        statusBox.className = "status-box info";
        statusBox.textContent = "Requesting authorization from browser extension...";
        statusBox.style.display = "block";

        let api = null;
        if (typeof detectedWallet.connect === 'function') {
          api = await detectedWallet.connect("preview");
        } else if (typeof detectedWallet.enable === 'function') {
          api = await detectedWallet.enable();
        }

        let address = "";
        if (api && typeof api.getShieldedAddresses === 'function') {
          const addrs = await api.getShieldedAddresses();
          address = addrs.shieldedAddress || "";
        } else if (api && typeof api.getChangeAddress === 'function') {
          address = await api.getChangeAddress();
        }

        document.getElementById('wallet-status').textContent = "Connected: " + (address ? address.slice(0, 16) + '...' : 'Active');
        statusBox.className = "status-box success";
        statusBox.innerHTML = "<strong>✅ Extension Connected!</strong><br/>" +
          "Note: Due to browser security, extensions do not expose private seed phrases to webpages. Enter or generate your deployer seed below to authorize on-chain CLI deployment.";
      } catch (err) {
        statusBox.className = "status-box error";
        statusBox.textContent = "Extension connection notice: " + (err.message || String(err));
      }
    }

    function generateRandomSeed() {
      const randomBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randomBytes);
      const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const input = document.getElementById('seed-input');
      input.value = hex;
      onSeedChanged();
    }

    function useEnvSeed(hex) {
      const input = document.getElementById('seed-input');
      input.value = hex;
      onSeedChanged();
    }

    let changeTimer = null;
    function onSeedChanged() {
      clearTimeout(changeTimer);
      changeTimer = setTimeout(async () => {
        const val = document.getElementById('seed-input').value.trim();
        const card = document.getElementById('address-preview-card');
        const text = document.getElementById('derived-address-text');

        if (!val) {
          card.style.display = 'none';
          currentDerivedAddress = "";
          return;
        }

        try {
          const res = await fetch('/api/derive-address', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seedOrMnemonic: val })
          });
          const data = await res.json();
          if (data.success && data.address) {
            currentDerivedAddress = data.address;
            text.textContent = data.address;
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        } catch (e) {
          card.style.display = 'none';
        }
      }, 300);
    }

    function copyAddress() {
      if (currentDerivedAddress) {
        navigator.clipboard.writeText(currentDerivedAddress);
        alert('Address copied to clipboard!\n\nPaste this address into the Midnight Preview Faucet to receive tNIGHT.');
      }
    }

    async function syncWithCli() {
      const seedInput = document.getElementById('seed-input').value.trim();
      const statusBox = document.getElementById('status-box');
      const syncBtn = document.getElementById('btn-sync');

      if (!seedInput) {
        statusBox.className = "status-box error";
        statusBox.textContent = "Please enter a 64-character hex seed or BIP-39 mnemonic phrase (or click 'Generate Fresh Seed').";
        return;
      }

      syncBtn.disabled = true;
      syncBtn.textContent = "Syncing with CLI...";

      try {
        const response = await fetch('/api/sync-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seedOrMnemonic: seedInput, source: 'Browser Chrome Portal' })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          const addr = data.address || '';
          statusBox.className = "status-box success";
          statusBox.innerHTML = "<strong>🎉 Wallet Successfully Synced!</strong><br/>" +
            "Your deployment terminal has received the deployer wallet details.<br/><br/>" +
            "<strong>Unshielded Address (Faucet recipient):</strong><br/>" +
            "<code style='background:#090d16; padding:6px 10px; border-radius:6px; display:block; word-break:break-all; margin:8px 0; font-family:var(--font-mono); font-size:12px; border:1px solid #334155;'>" + addr + "</code>" +
            "<div style='display:flex; gap:10px; margin-top:10px; flex-wrap:wrap;'>" +
              "<button class='btn btn-secondary btn-sm' onclick='copyAddress()'>📋 Copy Address</button>" +
              "<a class='btn btn-faucet btn-sm' href='https://faucet.preview.midnight.network' target='_blank'>💧 Open Preview Faucet ↗</a>" +
            "</div><br/>" +
            "<em>You can close this tab and return to your terminal to watch the contract deploy!</em>";
          syncBtn.textContent = "✅ Synced with Terminal";
        } else {
          throw new Error(data.error || "Failed to validate wallet credentials.");
        }
      } catch (err) {
        statusBox.className = "status-box error";
        statusBox.textContent = "Sync failed: " + (err.message || String(err));
        syncBtn.disabled = false;
        syncBtn.textContent = "🚀 Sync Wallet with Deployment Terminal";
      }
    }

    // Auto-poll detection repeatedly during the first 10 seconds for delayed injected wallets
    window.addEventListener('load', () => {
      detectExtension();
      let count = 0;
      const poller = setInterval(() => {
        count++;
        if (!detectedWallet) {
          detectExtension();
        }
        if (count > 20 || detectedWallet) clearInterval(poller);
      }, 500);

      const initialVal = document.getElementById('seed-input').value.trim();
      if (initialVal) onSeedChanged();
    });
  </script>
</body>
</html>`;
}

export async function startWalletSyncServer(
  preferredPort = 4242,
  addressDeriver?: (seed: Uint8Array) => string,
  envSeedHex?: string
): Promise<WalletSyncResult> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html' || req.url?.startsWith('/?'))) {
        const html = getSyncHtml(preferredPort, envSeedHex);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (req.method === 'POST' && req.url === '/api/derive-address') {
        let body = '';
        req.on('data', (chunk) => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const resolved = parseSeedOrMnemonic(parsed.seedOrMnemonic);
            if (!resolved) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid seed' }));
              return;
            }
            let address = '';
            if (addressDeriver) {
              try {
                address = addressDeriver(resolved.seed);
              } catch (e) {
                // Ignore derivation err
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, address, seedHex: resolved.seedHex }));
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err?.message || 'Error' }));
          }
        });
        return;
      }

      if (req.method === 'POST' && req.url === '/api/sync-wallet') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const resolved = parseSeedOrMnemonic(parsed.seedOrMnemonic);

            if (!resolved) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid seed or mnemonic phrase.' }));
              return;
            }

            let address = '';
            if (addressDeriver) {
              try {
                address = addressDeriver(resolved.seed);
              } catch (e) {
                // Ignore derivation err in response
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                seedHex: resolved.seedHex,
                address,
              })
            );

            // Shutdown server gracefully after responding
            setTimeout(() => {
              server.close();
              resolve({
                seed: resolved.seed,
                seedHex: resolved.seedHex,
                source: parsed.source || 'Chrome / Browser Portal',
              });
            }, 600);
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
          }
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port if 4242 is busy
        console.warn(`[Browser Sync] Port ${preferredPort} was in use. Trying port ${preferredPort + 1}...`);
        server.listen(preferredPort + 1);
      } else {
        reject(err);
      }
    });

    server.listen(preferredPort, () => {
      const addressInfo = server.address() as { port: number };
      const port = addressInfo?.port || preferredPort;
      const syncUrl = `http://localhost:${port}`;
      console.log(`\n================================================================`);
      console.log(`  🌐 CHROME WALLET SYNC BRIDGE STARTED`);
      console.log(`================================================================`);
      console.log(`Portal URL: ${syncUrl}`);
      console.log(`Opening your browser automatically...`);
      console.log(`(If browser does not open automatically, visit: ${syncUrl})\n`);

      openBrowser(syncUrl);
    });
  });
}
