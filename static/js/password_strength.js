/**
 * Password strength meter + checklist — real-time, debounce 150ms (instruksi §4, §8).
 */
export const RULES = [
  { id: "len", test: (v) => v.length >= 8 },
  { id: "num", test: (v) => /\d/.test(v) },
  { id: "sym", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function scorePassword(value) {
  return RULES.filter((r) => r.test(value)).map((r) => r.id);
}

export function passwordLevel(value) {
  if (!value) return "";
  // Input terisi minimal "Lemah" — nilai 0 aturan tetap ditampilkan sebagai Lemah 1/3
  const n = Math.max(scorePassword(value).length, 1);
  return ["", "Lemah", "Cukup", "Kuat"][n];
}

export function initPasswordStrength(inputId) {
  const input = document.getElementById(inputId);
  const wrap = document.getElementById(inputId + "-meter");
  if (!input || !wrap) return;
  const fill = wrap.querySelector(".pw-meter-fill");
  const label = wrap.querySelector(".pw-meter-label");
  let timer = null;

  const render = () => {
    const v = input.value;
    const ids = v ? scorePassword(v) : [];
    const lvl = passwordLevel(v);
    const n = v ? Math.max(ids.length, 1) : 0;
    fill.style.width = (n / RULES.length) * 100 + "%";
    fill.className =
      "pw-meter-fill " +
      (lvl === "Lemah" ? "weak" : lvl === "Cukup" ? "fair" : lvl === "Kuat" ? "strong" : "");
    label.textContent = lvl ? "Kekuatan: " + lvl : "";
    RULES.forEach((r) => {
      wrap.querySelector('[data-rule="' + r.id + '"]').classList.toggle("ok", ids.includes(r.id));
    });
  };

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(render, 150); // debounce
  });
  render();
}
