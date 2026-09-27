/**
 * RSA Hybrid Encryption Module — state kunci otomatis (window.* + sessionStorage),
 * alur 3 langkah, metadata envelope KRPH, copy-ikon dengan feedback centang.
 */
import { postJSON } from "./api.js";
import { icon, refreshIcons } from "./icons.js";

const SK_PUB = "cipherly.hybrid.publicKey";
const SK_PRIV = "cipherly.hybrid.privateKey";

window.currentPublicKey = window.currentPublicKey || "";
window.currentPrivateKey = window.currentPrivateKey || "";

const BANNER_DEMO = `${icon("lightbulb", "inline-icon")} Mode Demo: Kunci disimpan sementara di browser Anda. Jangan gunakan untuk data sensitif nyata. Refresh halaman akan mempertahankan kunci sampai Anda menutup tab.`;
const BANNER_RESTORE = `${icon("lightbulb", "inline-icon")} Kunci sesi sebelumnya ditemukan. Hati-hati, ini hanya tersimpan di browser ini.`;

function setBanner(html) {
  const w = document.getElementById("h-warning");
  if (!w) return;
  w.innerHTML = html;
  refreshIcons();
}

async function copyText(id) {
  const el = document.getElementById(id);
  if (!el || !el.value) return false;
  try {
    await navigator.clipboard.writeText(el.value);
  } catch {
    el.select();
    document.execCommand("copy");
  }
  return true;
}

function bindCopyBtn(id, targetId) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!(await copyText(targetId))) return;
    btn.innerHTML = icon("check");
    btn.classList.add("copied");
    refreshIcons();
    setTimeout(() => {
      btn.innerHTML = icon("copy");
      btn.classList.remove("copied");
      refreshIcons();
    }, 2000);
  });
}

/** Parse header binary KRPH (tanpa mengubah format) untuk metadata. */
function parseEnvelopeMeta(b64) {
  try {
    const bin = atob(b64.replace(/\s/g, ""));
    if (bin.length < 8 || bin.slice(0, 4) !== "KRPH") return null;
    const wkLen = (bin.charCodeAt(5) << 8) | bin.charCodeAt(6);
    const nonceLen = bin.charCodeAt(7 + wkLen);
    const headerLen = 4 + 1 + 2 + wkLen + 1 + nonceLen;
    if (headerLen > bin.length) return null;
    return { ct: bin.length - headerLen, wk: wkLen };
  } catch {
    return null;
  }
}

function showEnvelopeMeta(b64, ms) {
  const meta = document.getElementById("h-envelope-meta");
  if (!meta) return;
  const m = parseEnvelopeMeta(b64);
  if (!m) {
    meta.hidden = true;
    return;
  }
  document.getElementById("h-meta-ct").textContent = String(m.ct);
  document.getElementById("h-meta-wk").textContent = String(m.wk);
  document.getElementById("h-meta-ms").textContent = String(ms);
  meta.hidden = false;
}

function effectivePrivateKey() {
  const wrap = document.getElementById("h-other-priv-wrap");
  const other = document.getElementById("h-dec-priv-other");
  if (wrap && !wrap.hidden && other && other.value.trim()) return other.value.trim();
  const active = document.getElementById("h-dec-private");
  return active ? active.value.trim() : "";
}

function updateDecryptState() {
  const btn = document.getElementById("h-decrypt-btn");
  const env = document.getElementById("h-dec-envelope");
  if (!btn || !env) return;
  btn.disabled = !(env.value.trim() && effectivePrivateKey());
}

function storeSession(pub, priv) {
  try {
    sessionStorage.setItem(SK_PUB, pub);
    sessionStorage.setItem(SK_PRIV, priv);
  } catch { /* storage penuh/di-block — abaikan */ }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SK_PUB);
    sessionStorage.removeItem(SK_PRIV);
  } catch { /* noop */ }
}

function applyKeys(pub, priv) {
  window.currentPublicKey = pub;
  window.currentPrivateKey = priv;
  const pubTa = document.getElementById("h-public");
  const privTa = document.getElementById("h-private");
  const decPriv = document.getElementById("h-dec-private");
  const active = document.getElementById("h-pub-active");
  if (pubTa) pubTa.value = pub;
  if (privTa) privTa.value = priv;
  if (decPriv) decPriv.value = priv;
  if (active) active.value = pub;
  updateDecryptState();
}

function restoreSession() {
  try {
    const pub = sessionStorage.getItem(SK_PUB) || "";
    const priv = sessionStorage.getItem(SK_PRIV) || "";
    if (pub && priv) {
      applyKeys(pub, priv);
      setBanner(BANNER_RESTORE);
      return true;
    }
  } catch { /* noop */ }
  return false;
}

export function initHybridPanel() {
  const genKeysBtn = document.getElementById("h-genkeys-btn");
  const encryptBtn = document.getElementById("h-encrypt-btn");
  const decryptBtn = document.getElementById("h-decrypt-btn");
  if (!genKeysBtn) return;

  bindCopyBtn("h-copy-pub", "h-public");
  bindCopyBtn("h-copy-priv", "h-private");

  document.getElementById("h-clear-btn")?.addEventListener("click", () => {
    applyKeys("", "");
    clearSession();
    const otherWrap = document.getElementById("h-other-priv-wrap");
    const otherTa = document.getElementById("h-dec-priv-other");
    const toggle = document.getElementById("h-toggle-priv");
    if (otherWrap) otherWrap.hidden = true;
    if (otherTa) otherTa.value = "";
    if (toggle) toggle.textContent = "Ganti Kunci Privat";
    const pubWrap = document.getElementById("h-other-pub-wrap");
    const pubTa = document.getElementById("h-pubkey-other");
    const pubToggle = document.getElementById("h-other-pub-toggle");
    if (pubWrap) pubWrap.hidden = true;
    if (pubTa) pubTa.value = "";
    if (pubToggle) pubToggle.textContent = "Tempel kunci publik lain";
    setBanner(`${icon("circle-check", "inline-icon")} Kunci dihapus dari layar & sesi browser. Buat baru untuk lanjut.`);
  });

  genKeysBtn.addEventListener("click", async () => {
    const label = genKeysBtn.textContent;
    genKeysBtn.disabled = true;
    genKeysBtn.textContent = "Membuat kunci...";
    try {
      const res = await fetch("/api/hybrid/generate-keys", { method: "POST" });
      const data = await res.json();
      applyKeys(data.public_key, data.private_key);
      storeSession(data.public_key, data.private_key);
      setBanner(
        `${icon("circle-check", "inline-icon")} Kunci RSA-2048 dibuat & disimpan sementara di browser ini. ` +
        `Bagikan Kunci Publik ke pengirim; simpan Kunci Privat untuk membuka pesan.`
      );
    } catch (e) {
      setBanner(`${icon("triangle-alert", "inline-icon")} Gagal membuat kunci: ${e.message}`);
    } finally {
      genKeysBtn.disabled = false;
      genKeysBtn.textContent = label;
    }
  });

  const otherPubToggle = document.getElementById("h-other-pub-toggle");
  otherPubToggle?.addEventListener("click", () => {
    const wrap = document.getElementById("h-other-pub-wrap");
    if (!wrap) return;
    wrap.hidden = !wrap.hidden;
    otherPubToggle.textContent = wrap.hidden
      ? "Tempel kunci publik lain"
      : "Batal — pakai kunci aktif";
    if (!wrap.hidden) document.getElementById("h-pubkey-other")?.focus();
  });

  encryptBtn.addEventListener("click", async () => {
    const otherWrap = document.getElementById("h-other-pub-wrap");
    const otherTa = document.getElementById("h-pubkey-other");
    const useOther = otherWrap && !otherWrap.hidden && otherTa && otherTa.value.trim();
    const pubKey = useOther
      ? otherTa.value.trim()
      : ((document.getElementById("h-pub-active") || {}).value || window.currentPublicKey);
    if (!pubKey) {
      document.getElementById("h-envelope").value =
        "Gagal: kunci publik belum ada — buat kunci di Langkah 1 atau tempel kunci lain.";
      const meta = document.getElementById("h-envelope-meta");
      if (meta) meta.hidden = true;
      return;
    }
    const label = encryptBtn.textContent;
    encryptBtn.disabled = true;
    encryptBtn.textContent = "Mengunci...";
    const t0 = performance.now();
    try {
      const data = await postJSON("/api/hybrid/encrypt", {
        plaintext: document.getElementById("h-plaintext").value,
        public_key: pubKey,
        algorithm: "aes-gcm",
      });
      const ms = Math.max(1, Math.round(performance.now() - t0));
      document.getElementById("h-envelope").value = data.envelope;
      showEnvelopeMeta(data.envelope, ms);
      const decEnv = document.getElementById("h-dec-envelope");
      if (decEnv) decEnv.value = data.envelope;
      updateDecryptState();
    } catch (e) {
      document.getElementById("h-envelope").value =
        "Gagal: " + e.message + " — pastikan kunci publik sudah ada & pesan tidak kosong.";
      const meta = document.getElementById("h-envelope-meta");
      if (meta) meta.hidden = true;
    } finally {
      encryptBtn.disabled = false;
      encryptBtn.textContent = label;
    }
  });

  const togglePriv = document.getElementById("h-toggle-priv");
  togglePriv?.addEventListener("click", () => {
    const wrap = document.getElementById("h-other-priv-wrap");
    if (!wrap) return;
    wrap.hidden = !wrap.hidden;
    togglePriv.textContent = wrap.hidden ? "Ganti Kunci Privat" : "Batal Ganti Kunci";
    if (!wrap.hidden) document.getElementById("h-dec-priv-other")?.focus();
    updateDecryptState();
  });

  document.getElementById("h-dec-envelope")?.addEventListener("input", updateDecryptState);
  document.getElementById("h-dec-priv-other")?.addEventListener("input", updateDecryptState);

  decryptBtn.addEventListener("click", async () => {
    const box = document.getElementById("h-result");
    box.textContent = "Membuka...";
    box.className = "result-box";
    try {
      const data = await postJSON("/api/hybrid/decrypt", {
        envelope: document.getElementById("h-dec-envelope").value,
        private_key: effectivePrivateKey(),
      });
      box.textContent = "Pesan asli: " + data.plaintext;
      box.className = "result-box ok";
    } catch (e) {
      box.textContent = "Gagal: " + e.message + " — biasanya kunci privat salah atau hasil tidak lengkap.";
      box.className = "result-box err";
    }
  });

  if (!restoreSession()) setBanner(BANNER_DEMO);
  updateDecryptState();
}
