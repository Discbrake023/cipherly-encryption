/**
 * Lucide icon helper — library dimuat dari CDN (lihat base.html),
 * panggil refreshIcons() tiap render dinamis.
 */
export function icon(name, cls = "") {
  return `<i data-lucide="${name}" class="${cls}"></i>`;
}

export function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}
