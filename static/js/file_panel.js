/**
 * File Encryption & Decryption Module
 */
import { postFormData, downloadBlob } from "./api.js";

export function initFilePanel() {
  const encryptBtn = document.getElementById("f-encrypt-btn");
  const decryptBtn = document.getElementById("f-decrypt-btn");

  if (!encryptBtn) return;

  encryptBtn.addEventListener("click", async () => {
    const status = document.getElementById("f-enc-status");
    const fileInput = document.getElementById("f-file-enc");

    if (!fileInput.files.length) {
      status.textContent = "Pilih berkas terlebih dahulu.";
      status.className = "status err";
      return;
    }

    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("password", document.getElementById("f-password-enc").value);
    form.append("algorithm", document.getElementById("f-algo").value);
    form.append("kdf", document.getElementById("f-kdf").value);

    status.textContent = "Mengenkripsi...";
    status.className = "status";

    try {
      const res = await postFormData("/api/encrypt/file", form);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengenkripsi.");
      }
      const blob = await res.blob();
      const elapsed = res.headers.get("X-Elapsed-Ms");
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match ? match[1] : (fileInput.files[0].name + ".krp");

      downloadBlob(blob, filename);
      status.textContent = `Berhasil. Diunduh sebagai ${filename} (${elapsed} ms).`;
      status.className = "status ok";
    } catch (e) {
      status.textContent = "Gagal: " + e.message;
      status.className = "status err";
    }
  });

  decryptBtn.addEventListener("click", async () => {
    const status = document.getElementById("f-dec-status");
    const fileInput = document.getElementById("f-file-dec");

    if (!fileInput.files.length) {
      status.textContent = "Pilih berkas .krp terlebih dahulu.";
      status.className = "status err";
      return;
    }

    const form = new FormData();
    form.append("file", fileInput.files[0]);
    form.append("password", document.getElementById("f-password-dec").value);

    status.textContent = "Mendekripsi...";
    status.className = "status";

    try {
      const res = await postFormData("/api/decrypt/file", form);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mendekripsi.");
      }
      const blob = await res.blob();
      const elapsed = res.headers.get("X-Elapsed-Ms");
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match ? match[1] : "berkas_dekripsi";

      downloadBlob(blob, filename);
      status.textContent = `Berhasil. Diunduh sebagai ${filename} (${elapsed} ms).`;
      status.className = "status ok";
    } catch (e) {
      status.textContent = "Ditolak: " + e.message;
      status.className = "status err";
    }
  });
}
