/**
 * Toast notification — pojok kanan atas, auto-dismiss, bisa ditutup manual.
 */
import { refreshIcons } from "./icons.js";

function ensureRoot() {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.className = "toast-root";
    root.id = "toast-root";
    root.setAttribute("aria-live", "polite");
    document.body.appendChild(root);
  }
  return root;
}

export function showToast(message, type = "success", duration = 4000) {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.innerHTML = `
    <i data-lucide="${type === "error" ? "circle-alert" : "circle-check"}" class="toast-icon"></i>
    <span class="toast-msg"></span>
    <button type="button" class="toast-close" aria-label="Tutup notifikasi">
      <i data-lucide="x"></i>
    </button>`;
  el.querySelector(".toast-msg").textContent = message; // aman dari HTML injection
  const remove = () => {
    el.classList.add("out");
    setTimeout(() => el.remove(), 220);
  };
  el.querySelector(".toast-close").addEventListener("click", remove);
  ensureRoot().appendChild(el);
  refreshIcons();
  setTimeout(remove, duration);
  return el;
}

// Escape menutup toast teratas (aksesibilitas §7)
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const last = document.querySelector("#toast-root .toast:last-child");
  if (last) last.querySelector(".toast-close").click();
});
