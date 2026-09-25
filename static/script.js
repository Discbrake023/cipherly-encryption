// ---------------------------------------------------------------------------
// Navigasi antar tab
// ---------------------------------------------------------------------------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
  });
});

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Terjadi kesalahan.");
  return data;
}

// ---------------------------------------------------------------------------
// TEKS
// ---------------------------------------------------------------------------
document.getElementById("t-encrypt-btn").addEventListener("click", async () => {
  const box = document.getElementById("t-result");
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
    document.getElementById("t-ciphertext").value = data.envelope;
    document.getElementById("t-meta").textContent =
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

document.getElementById("t-decrypt-btn").addEventListener("click", async () => {
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

document.getElementById("t-copy-btn").addEventListener("click", () => {
  const el = document.getElementById("t-ciphertext");
  el.select();
  navigator.clipboard.writeText(el.value);
});

// ---------------------------------------------------------------------------
// BERKAS
// ---------------------------------------------------------------------------
document.getElementById("f-encrypt-btn").addEventListener("click", async () => {
  const status = document.getElementById("f-enc-status");
  const fileInput = document.getElementById("f-file-enc");
  if (!fileInput.files.length) { status.textContent = "Pilih berkas terlebih dahulu."; status.className = "status err"; return; }

  const form = new FormData();
  form.append("file", fileInput.files[0]);
  form.append("password", document.getElementById("f-password-enc").value);
  form.append("algorithm", document.getElementById("f-algo").value);
  form.append("kdf", document.getElementById("f-kdf").value);

  status.textContent = "Mengenkripsi...";
  status.className = "status";
  try {
    const res = await fetch("/api/encrypt/file", { method: "POST", body: form });
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

document.getElementById("f-decrypt-btn").addEventListener("click", async () => {
  const status = document.getElementById("f-dec-status");
  const fileInput = document.getElementById("f-file-dec");
  if (!fileInput.files.length) { status.textContent = "Pilih berkas .krp terlebih dahulu."; status.className = "status err"; return; }

  const form = new FormData();
  form.append("file", fileInput.files[0]);
  form.append("password", document.getElementById("f-password-dec").value);

  status.textContent = "Mendekripsi...";
  status.className = "status";
  try {
    const res = await fetch("/api/decrypt/file", { method: "POST", body: form });
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

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// DEMO SKENARIO UTS
// ---------------------------------------------------------------------------
document.getElementById("d-run-btn").addEventListener("click", async () => {
  const output = document.getElementById("d-output");
  const fileInput = document.getElementById("d-file");
  if (!fileInput.files.length) { output.innerHTML = "<p class='warning'>Pilih berkas (mis. PDF) terlebih dahulu.</p>"; return; }

  output.innerHTML = "<p class='status'>Menjalankan skenario...</p>";

  const form = new FormData();
  form.append("file", fileInput.files[0]);
  form.append("password", document.getElementById("d-password").value);
  form.append("algorithm", document.getElementById("d-algo").value);
  form.append("kdf", document.getElementById("d-kdf").value);

  try {
    const res = await fetch("/api/demo/full", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal.");

    output.innerHTML = `
      <div class="step pass">
        <div class="step-title">1. Enkripsi berkas &mdash; ${data.encrypt_ms} ms</div>
        <div class="step-detail">algoritma=${data.meta.algorithm}, kdf=${data.meta.kdf}, salt=${data.meta.salt_hex}, nonce=${data.meta.nonce_hex}</div>
      </div>
      <div class="step">
        <div class="step-title">2. Cipherteks (pratinjau heksadesimal)</div>
        <div class="step-detail">${data.ciphertext_preview_hex}</div>
      </div>
      <div class="step ${data.decrypt_correct_matches_original ? "pass" : "fail"}">
        <div class="step-title">3. Dekripsi kata sandi benar &mdash; ${data.decrypt_correct_matches_original ? "COCOK dengan asli" : "TIDAK COCOK"} (${data.decrypt_correct_ms} ms)</div>
      </div>
      <div class="step ${data.wrong_password_rejected ? "pass" : "fail"}">
        <div class="step-title">4. Dekripsi kata sandi SALAH &mdash; ${data.wrong_password_rejected ? "DITOLAK (sesuai harapan)" : "TIDAK DITOLAK (masalah!)"}</div>
        <div class="step-detail">${data.wrong_password_message || ""}</div>
      </div>
      <div class="step ${data.tampered_rejected ? "pass" : "fail"}">
        <div class="step-title">5. Dekripsi cipherteks yang diubah 1 byte &mdash; ${data.tampered_rejected ? "DITOLAK (sesuai harapan)" : "TIDAK DITOLAK (masalah!)"}</div>
        <div class="step-detail">${data.tampered_message || ""}</div>
      </div>
    `;
  } catch (e) {
    output.innerHTML = `<p class="status err">Gagal: ${e.message}</p>`;
  }
});

// ---------------------------------------------------------------------------
// ANALISIS CEPAT
// ---------------------------------------------------------------------------
document.getElementById("a-run-btn").addEventListener("click", async () => {
  const output = document.getElementById("a-output");
  output.innerHTML = "<p class='status'>Menghitung...</p>";
  try {
    const data = await postJSON("/api/analyze/avalanche", {
      plaintext: document.getElementById("a-plaintext").value,
      password: document.getElementById("a-password").value,
      algorithm: document.getElementById("a-algo").value,
      kdf: "pbkdf2",
    });
    output.innerHTML = `
      <div class="metric-card">
        <div class="metric-value">${data.avalanche_plaintext_bit_change_percent}%</div>
        <div class="metric-label">Avalanche effect &mdash; ubah 1 bit plaintext (ideal &asymp; 50%)</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.avalanche_key_change_percent}%</div>
        <div class="metric-label">Avalanche effect &mdash; ubah 1 bit kunci (ideal &asymp; 50%)</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.entropy_plaintext_bits_per_byte}</div>
        <div class="metric-label">Entropi plaintext (bit/byte, maks 8)</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${data.entropy_ciphertext_bits_per_byte}</div>
        <div class="metric-label">Entropi ciphertext (bit/byte, maks 8 &mdash; makin dekat 8 makin acak)</div>
      </div>
    `;
  } catch (e) {
    output.innerHTML = `<p class="status err">Gagal: ${e.message}</p>`;
  }
});

// ---------------------------------------------------------------------------
// HIBRIDA
// ---------------------------------------------------------------------------
document.getElementById("h-genkeys-btn").addEventListener("click", async () => {
  const res = await fetch("/api/hybrid/generate-keys", { method: "POST" });
  const data = await res.json();
  document.getElementById("h-public").value = data.public_key;
  document.getElementById("h-private").value = data.private_key;
  document.getElementById("h-warning").textContent = data.warning;
});

document.getElementById("h-encrypt-btn").addEventListener("click", async () => {
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

document.getElementById("h-decrypt-btn").addEventListener("click", async () => {
  const box = document.getElementById("h-result");
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
