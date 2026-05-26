import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from "./components/ErrorBoundary";

// Register Service Worker for PWA
registerSW({ immediate: true });

// Apply saved theme
const savedTheme = localStorage.getItem('flm-theme') || 'dark';
document.documentElement.classList.add(savedTheme);

// Production hardening: silence verbose console output and surface only critical errors.
// This reduces information leakage via DevTools while keeping unhandled errors visible.
if (import.meta.env.PROD) {
  const noop = () => {};
  // Keep `error` so production crashes are still reportable, mute the rest.
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.warn = noop;
  console.trace = noop;
  console.table = noop;
  console.group = noop;
  console.groupCollapsed = noop;
  console.groupEnd = noop;
}

// Global safety net — surface async crashes (only in dev) so they never silently
// produce a blank screen (the ErrorBoundary catches sync renders).
window.addEventListener('error', (e) => {
  if (import.meta.env.DEV) console.error('[GlobalError]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  if (import.meta.env.DEV) console.error('[UnhandledRejection]', e.reason);
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="root">
    <App />
  </ErrorBoundary>
);
