import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Load theme from localStorage on app start
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById("root")!).render(<App />);
