/**
 * Sidebar Tab Controller
 */
export function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");

  if (!tabs.length || !panels.length) return;

  tabs.forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      const targetTab = tabBtn.dataset.tab;
      if (!targetTab) return;

      tabs.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));

      tabBtn.classList.add("active");
      const targetPanel = document.getElementById("panel-" + targetTab);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });
}
