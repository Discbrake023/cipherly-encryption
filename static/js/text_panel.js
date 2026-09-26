/**
 * Text Encryption & Decryption Module — UX refactor:
 * mode toggle, inline validation, loading states, show/hide password.
 */
import { postJSON } from "./api.js";
import { icon, refreshIcons } from "./icons.js";
import { showToast } from "./toast.js";

function renderMeta(data) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set("t-meta-algo", data.meta.algorithm);
  set("t-meta-kdf", data.meta.kdf);
  set("t-meta-time", data.elapsed_ms + " ms");
  set("t-meta-salt", data.meta.salt_hex.slice(0, 16) + "…");
  set("t-meta-nonce", data.meta.nonce_hex);
  const panel = document.getElementById("t-meta");
  if (panel) panel.hidden = false;
  refreshIcons();
}

function setLoading(btn, on, label) {
  if (!btn) return;
  if (on) {
    btn.dataset.label = btn.textContent;
    btn.textContent = label;
    btn.disabled = true;
    btn.classList.add("is-loading");
  } else {
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
    btn.disabled = false;
    btn.classList.remove("is-loading");
  }
}

function fieldErr(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg || "";
}

export function initTextPanel() {
  const encryptBtn = document.getElementById("t-encrypt-btn");
  const decryptBtn = document.getElementById("t-decrypt-btn");
  const copyBtn = document.getElementById("t-copy-btn");
  if (!encryptBtn) return;

  // State mode — memengaruhi seluruh render ulang label/panel (instruksi §1)
  let mode = "encrypt";

  function applyMode(next) {
    mode = next === true || next === "decrypt" ? "decrypt" : "encrypt";
    const dec = mode === "decrypt";
    const set = (id, show) => {
      const el = document.getElementById(id);
      if (el) el.hidden = !show;
    };
    const title = document.getElementById("t-left-title");
    if (title) title.textContent = dec ? "Ciphertext" : "Pesan Asli";
    const rtitle = document.getElementById("t-right-title");
    if (rtitle) rtitle.textContent = dec ? "Pesan Terbuka" : "Hasil Terkunci";
    set("t-in-enc", !dec);
    set("t-in-dec", dec);
    set("t-out-enc", !dec);
    set("t-out-dec", dec);
    set("t-settings", !dec); // sembunyikan pengaturan saat dekripsi (instruksi §1)
    set("t-encrypt-btn", !dec);
    set("t-decrypt-btn", dec);
  }

  // Satu listener di fieldset — baca state `checked` terkini sehingga tahan
  // terhadap urutan event uncheck/check dua radio (change bisa dobel).
  const modeFs = document.getElementById("t-mode");
  modeFs?.addEventListener("change", () => {
    const dec = !!document.querySelector('input[name="t-mode"][value="decrypt"]')?.checked;
    applyMode(dec);
  });
  applyMode(false); // render awal konsisten dengan radio "encrypt" yang checked

  // Show/hide password — scoped ke panel teks (perbaikan double-bind: sebelumnya
  // selector global membuat tombol mata panel berkas ter-bind dua kali → no-op)
  document.querySelectorAll("#panel-teks .pw-toggle").forEach((b) => {
    b.addEventListener("click", () => {
      const inp = document.getElementById(b.dataset.for);
      if (!inp) return;
      const show = inp.type === "password";
      inp.type = show ? "text" : "password";
      b.innerHTML = icon(show ? "eye-off" : "eye");
      refreshIcons();
      b.setAttribute("aria-label", show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
    });
  });

  // Inline validation on blur
  const pw = document.getElementById("t-password");
  const pt = document.getElementById("t-plaintext");
  pw?.addEventListener("blur", () => {
    fieldErr("t-password-err", pw.value.length < 8 ? "Kata sandi minimal 8 karakter." : "");
  });
  pt?.addEventListener("blur", () => {
    fieldErr("t-plaintext-err", !pt.value.trim() ? "Tulis pesan dulu sebelum dikunci." : "");
  });

  encryptBtn.addEventListener("click", async () => {
    const box = document.getElementById("t-result");
    const ciphertextInput = document.getElementById("t-ciphertext");
    fieldErr("t-password-err", "");
    fieldErr("t-plaintext-err", "");
    const password = document.getElementById("t-password").value;
    const plaintext = document.getElementById("t-plaintext").value;
    if (password.length < 8) { fieldErr("t-password-err", "Kata sandi minimal 8 karakter."); return; }
    if (!plaintext.trim()) { fieldErr("t-plaintext-err", "Tulis pesan dulu sebelum dikunci."); return; }

    box.textContent = "Mengunci pesan...";
    box.className = "result-box";
    setLoading(encryptBtn, true, "Mengunci...");

    try {
      // Card selector algoritma (instruksi §2): radio, bukan <select>
      const algo = document.querySelector('input[name="t-algo"]:checked')?.value || "aes-gcm";
      const data = await postJSON("/api/encrypt/text", {
        plaintext,
        password,
        algorithm: algo,
        kdf: document.getElementById("t-kdf").value,
        encoding: document.getElementById("t-encoding").value,
      });
      ciphertextInput.value = data.envelope;
      renderMeta(data);
      box.textContent = "Berhasil dikunci. Salin hasil di samping.";
      box.className = "result-box ok";
      showToast("Pesan berhasil dikunci.", "success");
    } catch (e) {
      box.textContent = "Gagal mengunci: " + e.message + " — cek pesan & kata sandi, coba lagi.";
      box.className = "result-box err";
      showToast("Gagal mengunci: " + e.message, "error");
    } finally {
      setLoading(encryptBtn, false);
    }
  });

  decryptBtn.addEventListener("click", async () => {
    const box = document.getElementById("t-result-dec") || document.getElementById("t-result");
    const envEl = document.getElementById("t-ciphertext-dec") || document.getElementById("t-ciphertext");
    const pwEl = document.getElementById("t-password-dec") || document.getElementById("t-password");
    box.textContent = "Membuka pesan...";
    box.className = "result-box";
    setLoading(decryptBtn, true, "Membuka...");
    try {
      const data = await postJSON("/api/decrypt/text", {
        envelope: envEl.value.trim(),
        password: pwEl.value,
        encoding: document.getElementById("t-encoding").value,
      });
      box.textContent = `Pesan asli: ${data.plaintext}\n(waktu buka: ${data.elapsed_ms} ms)`;
      box.className = "result-box ok";
      showToast("Pesan berhasil dibuka.", "success");
    } catch (e) {
      box.textContent = "Ditolak: " + e.message + " — biasanya kata sandi salah atau hasil ditempel tidak lengkap.";
      box.className = "result-box err";
      showToast(e.message, "error");
    } finally {
      setLoading(decryptBtn, false);
    }
  });

  copyBtn?.addEventListener("click", async () => {
    const el = document.getElementById("t-ciphertext");
    if (!el.value) return;
    try { await navigator.clipboard.writeText(el.value); }
    catch { el.select(); document.execCommand("copy"); }
    const originalText = copyBtn.textContent;
    copyBtn.textContent = "Tersalin!";
    setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
  });
}
