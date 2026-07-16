import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initNativeDeepLinks, isNativePlatform } from "./lib/native";
import { initNativePushListeners } from "./lib/nativePush";
import "./index.css";

initNativeDeepLinks();
initNativePushListeners();

// Stale PWA service workers block Capacitor API calls to http://10.0.2.2 (mixed content).
if (isNativePlatform() && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service workers break Capacitor API calls (cross-origin fetch via sw.js). PWA only.
if ("serviceWorker" in navigator && !isNativePlatform()) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.log("ServiceWorker registration failed: ", err);
    });
  });
}
