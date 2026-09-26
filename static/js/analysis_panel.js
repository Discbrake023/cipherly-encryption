/**
 * Avalanche & Entropy Analysis Module — meter UX.
 */
import { postJSON } from "./api.js";
import { icon, refreshIcons } from "./icons.js";

function verdictAv(v) {
  const n = parseFloat(v);
  if (n >= 48 && n <= 52) return `Ideal ${icon("circle-check", "inline-icon")}`;
  if (n >= 45 && n <= 55) return "Baik";
  return `Kurang ${icon("circle-x", "inline-icon")} — coba teks lebih panjang`;
}
function verdictEnt(v) {
  const n = parseFloat(v);
  if (n >= 7.5) return `Acak ${icon("circle-check", "inline-icon")}`;
  if (n >= 7.0) return "Cukup";
  return "Kurang acak";
}

export function initAnalysisPanel() {
  const runBtn = document.getElementById("a-run-btn");
  if (!runBtn) return;
  runBtn.addEventListener("click", async () => {
    const output = document.getElementById("a-output");
    output.innerHTML = "<p class='status'>Menghitung keacakan...</p>";
    const label = runBtn.textContent;
    runBtn.disabled = true; runBtn.textContent = "Menghitung...";
    try {
      const data = await postJSON("/api/analyze/avalanche", {
        plaintext: document.getElementById("a-plaintext").value,
        password: document.getElementById("a-password").value,
        algorithm: document.getElementById("a-algo").value,
        kdf: "pbkdf2",
      });
      output.innerHTML = `
        <div class="metric-card">
          <div class="metric-value">${data.avalanche_plaintext_bit_change_percent}%</div>
          <div class="metric-label">Berubah saat 1 huruf diubah (ideal 50%) — <strong>${verdictAv(data.avalanche_plaintext_bit_change_percent)}</strong></div>
          <div class="meter"><div class="meter-fill" style="transform:scaleX(${(parseFloat(data.avalanche_plaintext_bit_change_percent)/100).toFixed(3)})"></div></div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.avalanche_key_change_percent}%</div>
          <div class="metric-label">Berubah saat 1 huruf sandi diubah (ideal 50%) — <strong>${verdictAv(data.avalanche_key_change_percent)}</strong></div>
          <div class="meter"><div class="meter-fill" style="transform:scaleX(${(parseFloat(data.avalanche_key_change_percent)/100).toFixed(3)})"></div></div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.entropy_plaintext_bits_per_byte}</div>
          <div class="metric-label">Keacakan teks asli (dari 8)</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.entropy_ciphertext_bits_per_byte}</div>
          <div class="metric-label">Keacakan hasil terkunci (dari 8) — <strong>${verdictEnt(data.entropy_ciphertext_bits_per_byte)}</strong></div>
          <div class="meter"><div class="meter-fill" style="transform:scaleX(${(parseFloat(data.entropy_ciphertext_bits_per_byte)/8).toFixed(3)})"></div></div>
        </div>`;
      refreshIcons();
    } catch (e) {
      output.innerHTML = `<p class="status err">Gagal: ${e.message}</p>`;
    } finally { runBtn.disabled = false; runBtn.textContent = label; }
  });
}
