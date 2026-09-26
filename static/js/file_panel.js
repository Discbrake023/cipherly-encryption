/**
 * File Encryption & Decryption Module — UX refactor: dropzone + meta + loading.
 */
import { postFormData, downloadBlob } from "./api.js";
import { icon, refreshIcons } from "./icons.js";

function fmtSize(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(2) + " MB";
}

function wireDropzone(dzId, inputId, metaId) {
  const dz = document.getElementById(dzId);
  const inp = document.getElementById(inputId);
  const meta = document.getElementById(metaId);
  if (!dz || !inp) return;
  const show = () => {
    if (meta && inp.files.length) {
      const f = inp.files[0];
      meta.textContent = `${f.name} (${fmtSize(f.size)})`;
    }
  };
  dz.addEventListener("click", () => inp.click());
  dz.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inp.click(); }
  });
  ["dragover", "dragenter"].forEach((ev) => dz.addEventListener(ev, (e) => {
    e.preventDefault(); dz.classList.add("drag");
  }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => {
    e.preventDefault(); dz.classList.remove("drag");
  }));
  dz.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) { inp.files = e.dataTransfer.files; show(); }
  });
  inp.addEventListener("change", show);
}

function setLoading(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label; btn.disabled = true; }
  else { if (btn.dataset.label) btn.textContent = btn.dataset.label; btn.disabled = false; }
}

export function initFilePanel() {
  const encryptBtn = document.getElementById("f-encrypt-btn");
  const decryptBtn = document.getElementById("f-decrypt-btn");
  if (!encryptBtn) return;

  wireDropzone("dz-enc", "f-file-enc", "f-file-enc-meta");
  wireDropzone("dz-dec", "f-file-dec", "f-file-dec-meta");

  document.querySelectorAll(".pw-toggle").forEach((b) => {
    if (!b.dataset.for.startsWith("f-")) return;
    b.addEventListener("click", () => {
      const inp = document.getElementById(b.dataset.for);
      if (!inp) return;
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      b.innerHTML = icon(show ? "eye-off" : "eye");
      refreshIcons();
    });
  });

  encryptBtn.addEventListener("click", async () => {
    const status = document.getElementById("f-enc-status");
    const fileInput = document.getElementById("f-file-enc");
    const pw = document.getElementById("f-password-enc").value;
    if (!fileInput.files.length) {
      status.textContent = "Pilih berkas dulu — klik kotak di atas.";
      status.className = "status err";
      return;
    }
    if (pw.length < 8) {
      status.textContent = "Kata sandi minimal 8 karakter.";
      status.className = "status err";
      return;
    }
    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("password", pw);
    form.append("algorithm", document.getElementById("f-algo").value);
    form.append("kdf", document.getElementById("f-kdf").value);
    status.textContent = `Mengunci ${fileInput.files[0].name}...`;
    status.className = "status";
    setLoading(encryptBtn, true, "Mengunci...");
    try {
      const res = await postFormData("/api/encrypt/file", form);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengunci.");
      }
      const blob = await res.blob();
      const elapsed = res.headers.get("X-Elapsed-Ms");
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match ? match[1] : (fileInput.files[0].name + ".krp");
      downloadBlob(blob, filename);
      status.textContent = `Berhasil dikunci. Tersimpan sebagai ${filename} (${elapsed} ms).`;
      status.className = "status ok";
    } catch (e) {
      status.textContent = "Gagal: " + e.message;
      status.className = "status err";
    } finally { setLoading(encryptBtn, false); }
  });

  decryptBtn.addEventListener("click", async () => {
    const status = document.getElementById("f-dec-status");
    const fileInput = document.getElementById("f-file-dec");
    if (!fileInput.files.length) {
      status.textContent = "Pilih berkas .krp dulu.";
      status.className = "status err";
      return;
    }
    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("password", document.getElementById("f-password-dec").value);
    status.textContent = "Membuka berkas...";
    status.className = "status";
    setLoading(decryptBtn, true, "Membuka...");
    try {
      const res = await postFormData("/api/decrypt/file", form);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuka.");
      }
      const blob = await res.blob();
      const elapsed = res.headers.get("X-Elapsed-Ms");
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match ? match[1] : "berkas_dekripsi";
      downloadBlob(blob, filename);
      status.textContent = `Berhasil dibuka. Tersimpan sebagai ${filename} (${elapsed} ms).`;
      status.className = "status ok";
    } catch (e) {
      status.textContent = "Ditolak: " + e.message + " — biasanya kata sandi salah atau file rusak.";
      status.className = "status err";
    } finally { setLoading(decryptBtn, false); }
  });
}
