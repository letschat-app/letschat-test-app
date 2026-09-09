// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css"; // optional if you're using global CSS
import { ThemeProvider } from "./context/ThemeContext";

// Migration script: rename profilePic to profile in localStorage
const oldPic = localStorage.getItem('profilePic');
if (oldPic && !localStorage.getItem('profile')) {
    localStorage.setItem('profile', oldPic);
    localStorage.removeItem('profilePic');
}

// Render React
ReactDOM.createRoot(document.getElementById("root")).render(
    <ThemeProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
);

// Splash loader handoff is now handled in App.jsx inside the Suspense boundary
// to ensure it only fades out after the lazy-loaded components are fully mounted.

// Service Worker lifecycle is managed by PWAContext.jsx
// (registration, update detection, version tracking, and UI notifications)
