/**
 * Main Application Entrypoint
 */
import { initTabs } from "./tabs.js";
import { initTextPanel } from "./text_panel.js";
import { initFilePanel } from "./file_panel.js";
import { initDemoPanel } from "./demo_panel.js";
import { initAnalysisPanel } from "./analysis_panel.js";
import { initHybridPanel } from "./hybrid_panel.js";
import { initPasswordStrength } from "./password_strength.js";

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTextPanel();
  initFilePanel();
  initDemoPanel();
  initAnalysisPanel();
  initHybridPanel();
  // Password strength meter (instruksi §4) — hanya field enkripsi
  initPasswordStrength("t-password");
  initPasswordStrength("f-password-enc");

  // Tooltip Tippy.js — hanya jika CDN berhasil dimuat.
  // Berjalan setelah lucide.createIcons() (listener base.html terdaftar lebih dulu).
  if (typeof tippy !== "undefined") {
    tippy("[data-tippy-content]", {
      theme: "cipherly",
      placement: "top",
      arrow: true,
      animation: "fade",
      duration: 200,
      delay: [200, 0],
      allowHTML: false,
      interactive: false,
      trigger: "mouseenter focus",
    });
  }
});
