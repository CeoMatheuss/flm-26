import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme
const savedTheme = localStorage.getItem('flm-theme') || 'dark';
document.documentElement.classList.add(savedTheme);

createRoot(document.getElementById("root")!).render(<App />);
