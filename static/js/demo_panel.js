/**
 * UTS Scenario Demo Module — stepper checklist UX.
 */
import { postFormData } from "./api.js";
import { icon, refreshIcons } from "./icons.js";

export function initDemoPanel() {
  const runBtn = document.getElementById("d-run-btn");
  if (!runBtn) return;

  runBtn.addEventListener("click", async () => {
    const output = document.getElementById("d-output");
    const fileInput = document.getElementById("d-file");
    const prog = document.getElementById("d-progress");

    if (!fileInput.files.length) {
      output.innerHTML = "<p class='status err'>Pilih berkas uji dulu (PDF / gambar / teks).</p>";
      return;
    }

    const label = runBtn.textContent;
    runBtn.disabled = true;
    runBtn.textContent = "Menjalankan... 1/5";
    if (prog) { prog.hidden = false; prog.firstElementChild.style.transform = "scaleX(0.2)"; }
    output.innerHTML = "<ol class='steps'><li class='step running'>1/5 Mengunci berkas...</li></ol>";

    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("password", document.getElementById("d-password").value);
    form.append("algorithm", document.getElementById("d-algo").value);
    form.append("kdf", document.getElementById("d-kdf").value);

    try {
      const res = await postFormData("/api/demo/full", form);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjalankan demo.");
      if (prog) prog.firstElementChild.style.transform = "scaleX(1)";
      runBtn.textContent = label;
      const ok = (c) => c ? "pass" : "fail";
      const iconFor = (c, cls = "step-ico") => icon(c ? "circle-check" : "circle-x", cls);
      output.innerHTML = `
        <ol class="steps">
        <li class="step pass"><div class="step-title">${icon("circle-check", "step-ico")} 1. Berkas terkunci (${data.encrypt_ms} ms)</div>
          <div class="step-detail">${data.meta.algorithm} + ${data.meta.kdf} — salt ${String(data.meta.salt_hex).slice(0,12)}...</div></li>
        <li class="step"><div class="step-title">${icon("search", "step-ico")} 2. Hasil terkunci (cuplikan)</div>
          <div class="step-detail">${data.ciphertext_preview_hex}</div></li>
        <li class="step ${ok(data.decrypt_correct_matches_original)}"><div class="step-title">${iconFor(data.decrypt_correct_matches_original)} 3. Dibuka sandi benar — ${data.decrypt_correct_matches_original ? "COCOK" : "TIDAK COCOK"} (${data.decrypt_correct_ms} ms)</div></li>
        <li class="step ${ok(data.wrong_password_rejected)}"><div class="step-title">${iconFor(data.wrong_password_rejected)} 4. Sandi salah — ${data.wrong_password_rejected ? "DITOLAK (benar)" : "LOLOS (bahaya!)"}</div>
          <div class="step-detail">${data.wrong_password_message || ""}</div></li>
        <li class="step ${ok(data.tampered_rejected)}"><div class="step-title">${iconFor(data.tampered_rejected)} 5. File diubah 1 byte — ${data.tampered_rejected ? "DITOLAK (benar)" : "LOLOS (bahaya!)"}</div>
          <div class="step-detail">${data.tampered_message || ""}</div></li>
        </ol>`;
      refreshIcons();
    } catch (e) {
      output.innerHTML = `<p class="status err">Gagal: ${e.message} — coba berkas lebih kecil atau ganti KDF ke PBKDF2.</p>`;
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = label;
    }
  });
}
