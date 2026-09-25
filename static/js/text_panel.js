/**
 * Text Encryption & Decryption Module
 */
import { postJSON } from "./api.js";

export function initTextPanel() {
  const encryptBtn = document.getElementById("t-encrypt-btn");
  const decryptBtn = document.getElementById("t-decrypt-btn");
  const copyBtn = document.getElementById("t-copy-btn");

  if (!encryptBtn) return;

  encryptBtn.addEventListener("click", async () => {
    const box = document.getElementById("t-result");
    const metaBox = document.getElementById("t-meta");
    const ciphertextInput = document.getElementById("t-ciphertext");

    box.textContent = "Mengenkripsi...";
    box.className = "result-box";

    try {
      const data = await postJSON("/api/encrypt/text", {
        plaintext: document.getElementById("t-plaintext").value,
        password: document.getElementById("t-password").value,
        algorithm: document.getElementById("t-algo").value,
        kdf: document.getElementById("t-kdf").value,
        encoding: document.getElementById("t-encoding").value,
      });

      ciphertextInput.value = data.envelope;
      metaBox.textContent =
        `algoritma=${data.meta.algorithm}  kdf=${data.meta.kdf}  ` +
        `salt=${data.meta.salt_hex.slice(0, 12)}...  nonce=${data.meta.nonce_hex}  ` +
        `waktu=${data.elapsed_ms} ms`;

      box.textContent = "Berhasil dienkripsi.";
      box.className = "result-box ok";
    } catch (e) {
      box.textContent = "Gagal: " + e.message;
      box.className = "result-box err";
    }
  });

  decryptBtn.addEventListener("click", async () => {
    const box = document.getElementById("t-result");
    box.textContent = "Mendekripsi...";
    box.className = "result-box";

    try {
      const data = await postJSON("/api/decrypt/text", {
        envelope: document.getElementById("t-ciphertext").value,
        password: document.getElementById("t-password").value,
        encoding: document.getElementById("t-encoding").value,
      });

      box.textContent = `Plainteks: ${data.plaintext}\n(waktu dekripsi: ${data.elapsed_ms} ms)`;
      box.className = "result-box ok";
    } catch (e) {
      box.textContent = "Ditolak: " + e.message;
      box.className = "result-box err";
    }
  });

  copyBtn.addEventListener("click", () => {
    const el = document.getElementById("t-ciphertext");
    el.select();
    navigator.clipboard.writeText(el.value);
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Tersalin!";
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 1500);
  });
}
