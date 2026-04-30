"use client";

import { useEffect, useState } from "react";

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    
    // Detect if running as PWA (standalone)
    const isStandalone = () => {
      return ('standalone' in window.navigator && (window.navigator as any).standalone) || 
             window.matchMedia('(display-mode: standalone)').matches;
    };

    // Check if we've already shown it recently
    const hasPrompted = localStorage.getItem('ios-install-prompt');
    const now = Date.now();
    
    if (isIos() && !isStandalone()) {
      if (!hasPrompted || now - parseInt(hasPrompted) > 1000 * 60 * 60 * 24 * 7) { // prompt once a week
        // Slight delay
        setTimeout(() => setShowPrompt(true), 2000);
      }
    }
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-install-prompt', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div style={{ position: "fixed", bottom: "0", left: "0", right: "0", zIndex: 9999, background: "#1e293b", color: "#f8fafc", padding: "1.5rem", borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem", boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <h3 style={{ fontWeight: "bold", fontSize: "1.125rem", margin: 0 }}>Install App</h3>
        <button onClick={dismiss} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.25rem" }}>
          ✕
        </button>
      </div>
      <p style={{ fontSize: "0.875rem", color: "#cbd5e1", marginBottom: "1rem" }}>
        Install this application on your home screen for a better full-screen experience.
      </p>
      <div style={{ background: "#0f172a", padding: "1rem", borderRadius: "0.5rem", fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>1. Tap the</span>
          <svg style={{ width: "1.25rem", height: "1.25rem" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
          <span><b>Share</b> button in Safari.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>2. Scroll down and tap</span>
          <div style={{ background: "#1e293b", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", border: "1px solid #334155", fontSize: "0.75rem" }}>➕ Add to Home Screen</div>
        </div>
      </div>
    </div>
  );
}
