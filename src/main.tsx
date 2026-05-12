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

// Global safety net — surface async crashes in the console so they never
// silently produce a blank screen (the ErrorBoundary catches sync renders).
window.addEventListener('error', (e) => {
  // eslint-disable-next-line no-console
  console.error('[GlobalError]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  // eslint-disable-next-line no-console
  console.error('[UnhandledRejection]', e.reason);
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary label="root">
    <App />
  </ErrorBoundary>
);
