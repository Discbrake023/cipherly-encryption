/**
 * RSA Hybrid Encryption Module
 */
import { postJSON } from "./api.js";

export function initHybridPanel() {
  const genKeysBtn = document.getElementById("h-genkeys-btn");
  const encryptBtn = document.getElementById("h-encrypt-btn");
  const decryptBtn = document.getElementById("h-decrypt-btn");

  if (!genKeysBtn) return;

  genKeysBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/hybrid/generate-keys", { method: "POST" });
      const data = await res.json();
      document.getElementById("h-public").value = data.public_key;
      document.getElementById("h-private").value = data.private_key;
      document.getElementById("h-warning").textContent = data.warning;
    } catch (e) {
      document.getElementById("h-warning").textContent = "Gagal membangkitkan kunci: " + e.message;
    }
  });

  encryptBtn.addEventListener("click", async () => {
    try {
      const data = await postJSON("/api/hybrid/encrypt", {
        plaintext: document.getElementById("h-plaintext").value,
        public_key: document.getElementById("h-public").value,
        algorithm: "aes-gcm",
      });
      document.getElementById("h-envelope").value = data.envelope;
    } catch (e) {
      document.getElementById("h-envelope").value = "Gagal: " + e.message;
    }
  });

  decryptBtn.addEventListener("click", async () => {
    const box = document.getElementById("h-result");
    box.textContent = "Mendekripsi...";
    box.className = "result-box";

    try {
      const data = await postJSON("/api/hybrid/decrypt", {
        envelope: document.getElementById("h-envelope").value,
        private_key: document.getElementById("h-private").value,
      });
      box.textContent = "Plainteks: " + data.plaintext;
      box.className = "result-box ok";
    } catch (e) {
      box.textContent = "Gagal: " + e.message;
      box.className = "result-box err";
    }
  });
}
