/**
 * UTS Scenario Demo Module — stepper checklist UX.
 * Progress bar hijau + status teks dinamis, validasi real-time,
 * label hasil yang ramah audiens awam, metadata ukuran file.
 */
import { postFormData } from "./api.js";
import { icon, refreshIcons } from "./icons.js";
import { showToast } from "./toast.js";
import { wireDropzone } from "./file_panel.js";

const STAGES = [
  [0.15, "Menyiapkan berkas uji..."],
  [0.35, "Mengunci berkas dengan AEAD..."],
  [0.55, "Sedang menguji integritas tag..."],
  [0.75, "Memverifikasi penolakan password salah..."],
  [0.9, "Memeriksa perubahan 1 byte pada berkas..."],
];

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  const kb = bytes / 1024;
  return (kb < 100 ? kb.toFixed(2) : kb.toFixed(0)) + " KB";
}

export function initDemoPanel() {
  const runBtn = document.getElementById("d-run-btn");
  if (!runBtn) return;

  const fileInput = document.getElementById("d-file");
  const fileErr = document.getElementById("d-file-err");
  const dropzone = document.getElementById("dz-demo");

  wireDropzone("dz-demo", "d-file", "d-file-preview");

  // Highlight merah mengikuti dropzone juga (input-nya kini hidden)
  function setInvalid(on) {
    fileInput?.classList.toggle("invalid", on);
    dropzone?.classList.toggle("invalid", on);
    if (!on && fileErr) fileErr.textContent = "";
  }

  // Validasi real-time: hilangkan highlight merah begitu user memilih berkas
  fileInput?.addEventListener("change", () => setInvalid(false));

  let progTimer = null;
  const prog = document.getElementById("d-progress");
  const progStatus = document.getElementById("d-progress-status");

  function setProgress(frac, text, step) {
    if (prog) prog.firstElementChild.style.transform = `scaleX(${frac})`;
    if (progStatus) {
      progStatus.hidden = false;
      progStatus.textContent = text;
    }
    runBtn.textContent = `Menjalankan... ${step}/5`;
  }

  function stopProgress(finalText) {
    if (progTimer) {
      clearInterval(progTimer);
      progTimer = null;
    }
    if (finalText && progStatus) {
      progStatus.hidden = false;
      progStatus.textContent = finalText;
    }
  }

  runBtn.addEventListener("click", async () => {
    const output = document.getElementById("d-output");

    if (!fileInput.files.length) {
      // Jangan kirim request kosong: highlight area upload + toast error
      setInvalid(true);
      if (fileErr) fileErr.textContent = "Pilih berkas uji dulu (PDF / gambar / teks).";
      showToast("Pilih berkas uji dulu sebelum menjalankan 5 cek.", "error");
      fileInput.focus();
      return;
    }

    const label = runBtn.textContent;
    runBtn.disabled = true;
    if (prog) prog.hidden = false;
    output.innerHTML = "<ol class='steps'><li class='step running'>1/5 Mengunci berkas...</li></ol>";

    // Progress bar + status teks dinamis selama request berjalan
    let stage = 0;
    setProgress(STAGES[0][0], STAGES[0][1], 1);
    stage = 1;
    progTimer = setInterval(() => {
      if (stage < STAGES.length) {
        setProgress(STAGES[stage][0], STAGES[stage][1], Math.min(stage + 1, 5));
        stage += 1;
      }
    }, 700);

    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("password", document.getElementById("d-password").value);
    form.append("algorithm", document.getElementById("d-algo").value);
    form.append("kdf", document.getElementById("d-kdf").value);

    try {
      const res = await postFormData("/api/demo/full", form);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menjalankan demo.");

      const origSize = fileInput.files[0].size;
      const lockedSize = Math.floor((data.ciphertext_full_hex || "").length / 2);
      const overhead = origSize > 0 ? (((lockedSize - origSize) / origSize) * 100).toFixed(2) : "0";

      stopProgress("5/5 Selesai — semua cek berjalan dalam " + (data.encrypt_ms + data.decrypt_correct_ms).toFixed(0) + " ms");
      if (prog) prog.firstElementChild.style.transform = "scaleX(1)";
      runBtn.textContent = label;
      const ok = (c) => (c ? "pass" : "fail");
      const iconFor = (c, cls = "step-ico") => icon(c ? "circle-check" : "circle-x", cls);
      output.innerHTML = `
        <ol class="steps">
        <li class="step pass"><div class="step-title">${icon("circle-check", "step-ico")} 1. Berkas terkunci (${data.encrypt_ms} ms)</div>
          <div class="step-detail">📏 Asli: ${formatSize(origSize)} &rarr; Terkunci: ${formatSize(lockedSize)} (overhead AEAD ${overhead}%)</div>
          <div class="step-detail">${data.meta.algorithm} + ${data.meta.kdf} — salt ${String(data.meta.salt_hex).slice(0,12)}...</div></li>
        <li class="step"><div class="step-title">${icon("search", "step-ico")} 2. Hasil terkunci (cuplikan)</div>
          <div class="step-detail">${data.ciphertext_preview_hex}</div></li>
        <li class="step ${ok(data.decrypt_correct_matches_original)}"><div class="step-title">${iconFor(data.decrypt_correct_matches_original)} 3. Dibuka sandi benar — ${data.decrypt_correct_matches_original ? "COCOK" : "TIDAK COCOK"} (${data.decrypt_correct_ms} ms)</div></li>
        <li class="step ${ok(data.wrong_password_rejected)}"><div class="step-title">${iconFor(data.wrong_password_rejected)} 4. Sandi salah — ${data.wrong_password_rejected ? "&#9989; Verifikasi Keamanan Berhasil" : "&#9888;&#65039; LOLOS (bahaya!)"}</div>
          <div class="step-detail">${data.wrong_password_message || ""}</div></li>
        <li class="step ${ok(data.tampered_rejected)}"><div class="step-title">${iconFor(data.tampered_rejected)} 5. File diubah 1 byte — ${data.tampered_rejected ? "&#9989; Integritas Terjaga" : "&#9888;&#65039; LOLOS (bahaya!)"}</div>
          <div class="step-detail">${data.tampered_message || ""}</div></li>
        </ol>`;
      refreshIcons();
    } catch (e) {
      stopProgress("Berhenti — terjadi kesalahan.");
      output.innerHTML = `<p class="status err">Gagal: ${e.message} — coba berkas lebih kecil atau ganti KDF ke PBKDF2.</p>`;
    } finally {
      if (progTimer) {
        clearInterval(progTimer);
        progTimer = null;
      }
      runBtn.disabled = false;
      runBtn.textContent = label;
    }
  });
}
