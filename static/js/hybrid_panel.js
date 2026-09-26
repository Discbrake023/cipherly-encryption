/**
 * RSA Hybrid Encryption Module — safe UX: readonly keys, copy, clear, loading.
 */
import { postJSON } from "./api.js";
import { icon, refreshIcons } from "./icons.js";

async function copyText(id, btn) {
  const el = document.getElementById(id);
  if (!el || !el.value) return;
  try { await navigator.clipboard.writeText(el.value); }
  catch { el.select(); document.execCommand("copy"); }
  if (btn) {
    const t = btn.textContent; btn.textContent = "Tersalin!";
    setTimeout(() => { btn.textContent = t; }, 1500);
  }
}

export function initHybridPanel() {
  const genKeysBtn = document.getElementById("h-genkeys-btn");
  const encryptBtn = document.getElementById("h-encrypt-btn");
  const decryptBtn = document.getElementById("h-decrypt-btn");
  if (!genKeysBtn) return;

  document.getElementById("h-copy-pub")?.addEventListener("click", (e) => copyText("h-public", e.target));
  document.getElementById("h-copy-priv")?.addEventListener("click", (e) => copyText("h-private", e.target));
  document.getElementById("h-clear-btn")?.addEventListener("click", () => {
    document.getElementById("h-private").value = "";
    document.getElementById("h-public").value = "";
    const w = document.getElementById("h-warning");
    w.innerHTML = `${icon("circle-check", "inline-icon")} Kunci dihapus dari layar. Buat baru untuk lanjut.`;
    refreshIcons();
  });

  genKeysBtn.addEventListener("click", async () => {
    const label = genKeysBtn.textContent;
    genKeysBtn.disabled = true; genKeysBtn.textContent = "Membuat kunci...";
    try {
      const res = await fetch("/api/hybrid/generate-keys", { method: "POST" });
      const data = await res.json();
      document.getElementById("h-public").value = data.public_key;
      document.getElementById("h-private").value = data.private_key;
      const w2 = document.getElementById("h-warning");
      w2.innerHTML = `${icon("triangle-alert", "inline-icon")} ${data.warning}`;
      refreshIcons();
    } catch (e) {
      document.getElementById("h-warning").textContent = "Gagal membuat kunci: " + e.message;
    } finally { genKeysBtn.disabled = false; genKeysBtn.textContent = label; }
  });

  encryptBtn.addEventListener("click", async () => {
    const label = encryptBtn.textContent;
    encryptBtn.disabled = true; encryptBtn.textContent = "Mengunci...";
    try {
      const data = await postJSON("/api/hybrid/encrypt", {
        plaintext: document.getElementById("h-plaintext").value,
        public_key: document.getElementById("h-public").value,
        algorithm: "aes-gcm",
      });
      document.getElementById("h-envelope").value = data.envelope;
    } catch (e) {
      document.getElementById("h-envelope").value = "Gagal: " + e.message + " — pastikan kunci publik sudah ada & pesan tidak kosong.";
    } finally { encryptBtn.disabled = false; encryptBtn.textContent = label; }
  });

  decryptBtn.addEventListener("click", async () => {
    const box = document.getElementById("h-result");
    box.textContent = "Membuka...";
    box.className = "result-box";
    try {
      const data = await postJSON("/api/hybrid/decrypt", {
        envelope: document.getElementById("h-envelope").value,
        private_key: document.getElementById("h-private").value,
      });
      box.textContent = "Pesan asli: " + data.plaintext;
      box.className = "result-box ok";
    } catch (e) {
      box.textContent = "Gagal: " + e.message + " — biasanya kunci privat salah atau hasil tidak lengkap.";
      box.className = "result-box err";
    }
  });
}
