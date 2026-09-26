/**
 * File Encryption & Decryption Module — UX refactor: dropzone + meta + loading.
 */
import { postFormData, downloadBlob } from "./api.js";
import { icon, refreshIcons } from "./icons.js";
import { showToast } from "./toast.js";

export const MAX_SIZE = 32 * 1024 * 1024; // sama dengan MAX_CONTENT_LENGTH backend

export function fileIcon(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) return "file-image";
  if (["pdf", "doc", "docx", "txt", "md", "ppt", "pptx", "xls", "xlsx"].includes(ext)) return "file-text";
  if (["zip", "rar", "7z", "gz", "tar"].includes(ext)) return "file-archive";
  if (["mp3", "wav", "ogg", "flac"].includes(ext)) return "file-audio";
  if (["mp4", "mkv", "mov", "avi", "webm"].includes(ext)) return "file-video";
  return "file";
}

function fmtSize(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) {
    const kb = n / 1024;
    return (Number.isInteger(kb) ? kb : kb.toFixed(1)) + " KB";
  }
  return (n / 1024 / 1024).toFixed(2) + " MB";
}

function wireDropzone(dzId, inputId, previewId) {
  const dz = document.getElementById(dzId);
  const inp = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!dz || !inp) return;

  const clear = () => {
    inp.value = "";
    if (preview) preview.classList.remove("has-file");
  };
  const setFile = (file) => {
    if (!file) { clear(); return; }
    if (file.size > MAX_SIZE) {
      clear();
      showToast(`Berkas "${file.name}" terlalu besar — maksimal 32MB.`, "error");
      return;
    }
    if (preview) {
      preview.querySelector(".file-preview-name").textContent = file.name;
      preview.querySelector(".file-preview-size").textContent = fmtSize(file.size);
      preview.querySelector(".file-preview-icon").innerHTML = icon(fileIcon(file.name));
      preview.classList.add("has-file");
      refreshIcons();
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
    if (e.dataTransfer && e.dataTransfer.files.length) {
      inp.files = e.dataTransfer.files;
      setFile(e.dataTransfer.files[0]);
    }
  });
  inp.addEventListener("change", () => setFile(inp.files[0]));
  preview?.querySelector(".file-preview-remove")?.addEventListener("click", clear);
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

  wireDropzone("dz-enc", "f-file-enc", "f-file-enc-preview");
  wireDropzone("dz-dec", "f-file-dec", "f-file-dec-preview");

  let lastFile = null;
  document.getElementById("f-enc-download-btn")?.addEventListener("click", () => {
    if (lastFile) downloadBlob(lastFile.blob, lastFile.filename);
  });

  // Scoped ke panel berkas — dulu selector global + cek prefix f- membuat
  // tombol mata ter-bind dua kali (text_panel + file_panel) → klik jadi no-op
  document.querySelectorAll("#panel-berkas .pw-toggle").forEach((b) => {
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
    // Card selector algoritma (instruksi §2): radio, bukan <select>
    form.append("algorithm", document.querySelector('input[name="f-algo"]:checked')?.value || "aes-gcm");
    form.append("kdf", document.getElementById("f-kdf").value);
    status.textContent = `Mengunci ${fileInput.files[0].name}...`;
    status.className = "status";
    setLoading(encryptBtn, true, "Mengunci...");
    const progress = document.getElementById("f-enc-progress");
    if (progress) { progress.hidden = false; progress.classList.add("progress-indeterminate"); }
    try {
      const res = await postFormData("/api/encrypt/file", form);
      const ctype = res.headers.get("content-type") || "";
      const errData = ctype.includes("application/json") ? await res.json() : null;
      if (!res.ok) throw new Error(errData?.error || `Server menolak (HTTP ${res.status}) — berkas mungkin melebihi 32MB.`);
      const blob = await res.blob();
      const elapsed = res.headers.get("X-Elapsed-Ms");
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match ? match[1] : (fileInput.files[0].name + ".krp");
      downloadBlob(blob, filename);
      lastFile = { blob, filename };
      const resultBox = document.getElementById("f-enc-result");
      const resultText = document.getElementById("f-enc-result-text");
      if (resultText) resultText.textContent = `${filename} • ${elapsed} ms`;
      if (resultBox) resultBox.hidden = false;
      status.textContent = `Berhasil dikunci. Tersimpan sebagai ${filename} (${elapsed} ms).`;
      status.className = "status ok";
      showToast("Berhasil dikunci — " + filename, "success");
    } catch (e) {
      status.textContent = "Gagal: " + e.message;
      status.className = "status err";
      showToast("Gagal: " + e.message, "error");
    } finally {
      if (progress) { progress.hidden = true; progress.classList.remove("progress-indeterminate"); }
      setLoading(encryptBtn, false);
    }
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
    const progress = document.getElementById("f-dec-progress");
    if (progress) { progress.hidden = false; progress.classList.add("progress-indeterminate"); }
    try {
      const res = await postFormData("/api/decrypt/file", form);
      const ctype = res.headers.get("content-type") || "";
      const errData = ctype.includes("application/json") ? await res.json() : null;
      if (!res.ok) throw new Error(errData?.error || `Server menolak (HTTP ${res.status}).`);
      const blob = await res.blob();
      const elapsed = res.headers.get("X-Elapsed-Ms");
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match ? match[1] : "berkas_dekripsi";
      downloadBlob(blob, filename);
      status.textContent = `Berhasil dibuka. Tersimpan sebagai ${filename} (${elapsed} ms).`;
      status.className = "status ok";
      showToast("Berhasil dibuka — " + filename, "success");
    } catch (e) {
      status.textContent = "Ditolak: " + e.message + " — biasanya kata sandi salah atau file rusak.";
      status.className = "status err";
      showToast("Ditolak: " + e.message, "error");
    } finally {
      if (progress) { progress.hidden = true; progress.classList.remove("progress-indeterminate"); }
      setLoading(decryptBtn, false);
    }
  });
}
