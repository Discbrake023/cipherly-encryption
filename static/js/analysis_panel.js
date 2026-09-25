/**
 * Avalanche & Entropy Analysis Module
 */
import { postJSON } from "./api.js";

export function initAnalysisPanel() {
  const runBtn = document.getElementById("a-run-btn");
  if (!runBtn) return;

  runBtn.addEventListener("click", async () => {
    const output = document.getElementById("a-output");
    output.innerHTML = "<p class='status'>Menghitung avalanche effect dan entropi...</p>";

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
          <div class="metric-label">Avalanche effect &mdash; ubah 1 bit plaintext (ideal &asymp; 50%)</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.avalanche_key_change_percent}%</div>
          <div class="metric-label">Avalanche effect &mdash; ubah 1 bit kunci (ideal &asymp; 50%)</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.entropy_plaintext_bits_per_byte}</div>
          <div class="metric-label">Entropi plaintext (bit/byte, maks 8)</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${data.entropy_ciphertext_bits_per_byte}</div>
          <div class="metric-label">Entropi ciphertext (bit/byte, maks 8 &mdash; mendekati 8 menandakan keacakan tinggi)</div>
        </div>
      `;
    } catch (e) {
      output.innerHTML = `<p class="status err">Gagal: ${e.message}</p>`;
    }
  });
}
