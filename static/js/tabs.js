/**
 * Sidebar Tab Controller
 */
export function initTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = document.querySelectorAll(".panel");
  const crumb = document.getElementById("breadcrumb-current");

  if (!tabs.length || !panels.length) return;

  const labels = {
    teks: "Enkripsi Teks",
    berkas: "Enkripsi Berkas",
    demo: "Demo Skenario UTS",
    analisis: "Analisis Cepat",
    hibrida: "Hibrida (RSA + AES)",
  };

  function activate(tabBtn, focus = false) {
    const targetTab = tabBtn.dataset.tab;
    if (!targetTab) return;

    tabs.forEach((btn) => {
      const on = btn === tabBtn;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
    panels.forEach((panel) => panel.classList.remove("active"));

    const targetPanel = document.getElementById("panel-" + targetTab);
    if (targetPanel) {
      targetPanel.classList.add("active");
      targetPanel.setAttribute("role", "tabpanel");
      targetPanel.setAttribute("aria-labelledby", "tab-" + targetTab);
    }
    if (crumb) crumb.textContent = labels[targetTab] || targetTab;
    if (focus) tabBtn.focus();
  }

  tabs.forEach((tabBtn, i) => {
    tabBtn.addEventListener("click", () => activate(tabBtn));
    tabBtn.addEventListener("keydown", (e) => {
      let j = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") j = (i + 1) % tabs.length;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = tabs.length - 1;
      if (j !== null) {
        e.preventDefault();
        activate(tabs[j], true);
      }
    });
  });
}
