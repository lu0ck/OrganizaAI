import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function showEmergencyError(message: string) {
  const root = document.getElementById('root');
  if (!root) return;
  const existing = root.querySelector('[data-emergency-error]');
  if (existing) return;
  const div = document.createElement('div');
  div.setAttribute('data-emergency-error', '1');
  div.style.cssText = 'position:fixed;inset:0;z-index:999999;background:white;padding:32px;font-family:monospace;max-width:600px;margin:0 auto;overflow:auto;';
  div.innerHTML = `
    <h2 style="color:#e11d48;margin-bottom:16px;">Erro Fatal</h2>
    <p style="color:#64748b;margin-bottom:8px;">O app crashou. O erro foi salvo no localStorage.</p>
    <div style="background:#f1f5f9;padding:12px;border-radius:8px;font-size:11px;color:#475569;word-break:break-all;margin-bottom:16px;max-height:200px;overflow:auto;">${message}</div>
    <button onclick="localStorage.removeItem('organizaai_data_v2');location.reload()" style="background:#ef4444;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold;margin-right:8px;">Limpar Dados e Recarregar</button>
    <button onclick="location.reload()" style="background:#64748b;color:white;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold;">Tentar Recarregar</button>
  `;
  root.appendChild(div);
}

window.addEventListener('error', (event) => {
  try {
    localStorage.setItem('organizaai_last_error', JSON.stringify({
      source: 'window.error',
      message: event.error?.message || event.message || 'Unknown',
      stack: event.error?.stack || '',
      filename: event.filename || '',
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      time: new Date().toISOString()
    }));
  } catch {}
  showEmergencyError(event.error?.message || event.message || 'Unknown error');
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    localStorage.setItem('organizaai_last_error', JSON.stringify({
      source: 'unhandledrejection',
      message: err.message,
      stack: err.stack || '',
      time: new Date().toISOString()
    }));
  } catch {}
  showEmergencyError(event.reason instanceof Error ? event.reason.message : String(event.reason));
});

const rootEl = document.getElementById('root')!;
const observer = new MutationObserver(() => {
  if (rootEl.childNodes.length === 0) {
    try {
      const saved = localStorage.getItem('organizaai_last_error');
      const msg = saved ? JSON.parse(saved).message : 'Root element became empty';
      showEmergencyError(msg);
    } catch {
      showEmergencyError('Root element became empty');
    }
  }
});
observer.observe(rootEl, { childList: true });

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
