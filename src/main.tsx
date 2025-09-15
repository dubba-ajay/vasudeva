import "./lib/resizeObserverFix"
import "./lib/suppressWarnings"
import { createRoot } from 'react-dom/client';
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom';

// Global error overlay to surface runtime errors on the page
function showErrorOverlay(message: any) {
  try {
    const id = 'global-error-overlay';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.left = '0';
      el.style.top = '0';
      el.style.right = '0';
      el.style.padding = '12px';
      el.style.background = 'rgba(220,38,38,0.95)';
      el.style.color = 'white';
      el.style.zIndex = '99999';
      el.style.fontFamily = 'monospace';
      el.style.fontSize = '13px';
      el.style.whiteSpace = 'pre-wrap';
      document.body.appendChild(el);
    }
    el.textContent = String(message).slice(0, 2000);
  } catch (e) { /* ignore */ }
}

window.addEventListener('error', function (ev) {
  showErrorOverlay(ev.message + ' at ' + (ev.filename || '') + ':' + (ev.lineno || '') + ':' + (ev.colno || ''));
});
window.addEventListener('unhandledrejection', function (ev) {
  showErrorOverlay('UnhandledRejection: ' + (ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason)));
});

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
