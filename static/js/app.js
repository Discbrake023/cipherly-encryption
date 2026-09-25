/**
 * Main Application Entrypoint
 */
import { initTabs } from "./tabs.js";
import { initTextPanel } from "./text_panel.js";
import { initFilePanel } from "./file_panel.js";
import { initDemoPanel } from "./demo_panel.js";
import { initAnalysisPanel } from "./analysis_panel.js";
import { initHybridPanel } from "./hybrid_panel.js";

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initTextPanel();
  initFilePanel();
  initDemoPanel();
  initAnalysisPanel();
  initHybridPanel();
});
