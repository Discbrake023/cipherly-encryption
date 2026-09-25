/**
 * UTS Scenario Demo Module
 */
import { postFormData } from "./api.js";

export function initDemoPanel() {
  const runBtn = document.getElementById("d-run-btn");
  if (!runBtn) return;

  runBtn.addEventListener("click", async () => {
    const output = document.getElementById("d-output");
    const fileInput = document.getElementById("d-file");

    if (!fileInput.files.length) {
      output.innerHTML = "<p class='warning'>Pilih berkas (mis. PDF) terlebih dahulu.</p>";
      return;
    }

    output.innerHTML = "<p class='status'>Menjalankan skenario pengujian...</p>";

    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("password", document.getElementById("d-password").value);
    form.append("algorithm", document.getElementById("d-algo").value);
    form.append("kdf", document.getElementById("d-kdf").value);

    try {
      const res = await postFormData("/api/demo/full", form);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjalankan demo.");

      output.innerHTML = `
        <div class="step pass">
          <div class="step-title">1. Enkripsi berkas &mdash; ${data.encrypt_ms} ms</div>
          <div class="step-detail">algoritma=${data.meta.algorithm}, kdf=${data.meta.kdf}, salt=${data.meta.salt_hex}, nonce=${data.meta.nonce_hex}</div>
        </div>
        <div class="step">
          <div class="step-title">2. Cipherteks (pratinjau heksadesimal)</div>
          <div class="step-detail">${data.ciphertext_preview_hex}</div>
        </div>
        <div class="step ${data.decrypt_correct_matches_original ? "pass" : "fail"}">
          <div class="step-title">3. Dekripsi kata sandi benar &mdash; ${data.decrypt_correct_matches_original ? "COCOK dengan asli" : "TIDAK COCOK"} (${data.decrypt_correct_ms} ms)</div>
        </div>
        <div class="step ${data.wrong_password_rejected ? "pass" : "fail"}">
          <div class="step-title">4. Dekripsi kata sandi SALAH &mdash; ${data.wrong_password_rejected ? "DITOLAK (sesuai harapan)" : "TIDAK DITOLAK (masalah!)"}</div>
          <div class="step-detail">${data.wrong_password_message || ""}</div>
        </div>
        <div class="step ${data.tampered_rejected ? "pass" : "fail"}">
          <div class="step-title">5. Dekripsi cipherteks yang diubah 1 byte &mdash; ${data.tampered_rejected ? "DITOLAK (sesuai harapan)" : "TIDAK DITOLAK (masalah!)"}</div>
          <div class="step-detail">${data.tampered_message || ""}</div>
        </div>
      `;
    } catch (e) {
      output.innerHTML = `<p class="status err">Gagal: ${e.message}</p>`;
    }
  });
}
