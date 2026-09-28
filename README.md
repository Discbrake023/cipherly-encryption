# Cipherly &mdash; Aplikasi Enkripsi Modern

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Cryptography](https://img.shields.io/badge/Cryptography-AES--256--GCM%20%2F%20ChaCha20--Poly1305-1F2D3D?logo=python&logoColor=white)](https://cryptography.io/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?logo=vercel&logoColor=white)](https://vercel.com/)
[![License](https://img.shields.io/badge/License-Educational-blue.svg)](LICENSE)

Aplikasi web untuk mengenkripsi dan mendekripsi teks maupun berkas memakai
algoritma kriptografi modern **AES-256-GCM** dan **ChaCha20-Poly1305**,
dibuat untuk Tugas Proyek Aplikasi Kriptografi &mdash; mata kuliah Keamanan
Informasi.

[Link Demo](https://cipherly-encryption.vercel.app/)

---

## Daftar Isi

- [Anggota Kelompok](#anggota-kelompok)
- [Deskripsi](#deskripsi)
- [Struktur Proyek](#struktur-proyek)
- [Cara Instalasi](#cara-instalasi)
- [Cara Menjalankan Aplikasi](#cara-menjalankan-aplikasi)
- [Cara Menjalankan Pengujian](#cara-menjalankan-pengujian)
- [Deploy ke Vercel](#deploy-ke-vercel-git-integration)
- [Contoh Penggunaan API](#contoh-penggunaan-api)
- [Format Envelope `.krp`](#format-envelope-krp)
- [Keamanan & Batasan](#keamanan--batasan-yang-perlu-diketahui)
- [Troubleshooting](#troubleshooting)
- [Lisensi](#lisensi)

---

## Anggota Kelompok

| Nama | NPM |
|---|---|
| _(Raka Restu Saputra)_ | _(172)_ |
| _(Tazril Dwi Aprila)_ | _(173)_ |

---

## Deskripsi

Aplikasi menyediakan:

- **Enkripsi/dekripsi teks** dengan hasil ciphertext dalam format Base64 atau
  heksadesimal.
- **Enkripsi/dekripsi berkas** apa pun (gambar, PDF, dokumen, dll).
- **Dua algoritma AEAD modern**: AES-256-GCM dan ChaCha20-Poly1305, keduanya
  memakai pustaka `cryptography` (Python) yang sudah teruji.
- **Tiga metode penurunan kunci (KDF)** dari kata sandi: PBKDF2-HMAC-SHA256
  (600.000 iterasi), scrypt (N=32768, r=8, p=1), dan Argon2id (t=3, 64&nbsp;MiB,
  paralelisme 4). Salt dibangkitkan acak untuk setiap enkripsi.
- **Nonce/IV acak** untuk setiap operasi enkripsi, disimpan bersama
  ciphertext dalam satu "envelope" biner (`KRP1`).
- **Penolakan dekripsi** otomatis bila kata sandi salah atau ciphertext
  telah diubah (verifikasi authentication tag AEAD gagal) &mdash; tidak ada
  logika tambahan yang ditulis manual, ini adalah properti bawaan AEAD.
- **Fitur pengayaan**: enkripsi hibrida &mdash; kunci sesi AES/ChaCha20
  dibungkus dengan RSA-OAEP 2048-bit.
- **Skenario demo UTS otomatis**: satu klik untuk enkripsi &rarr; tampilkan
  ciphertext &rarr; dekripsi benar &rarr; tolak kata sandi salah &rarr; tolak
  ciphertext yang diubah 1 byte.
- **Skrip pengujian menyeluruh** (`testing/benchmark.py`) yang menghasilkan
  tabel Excel (`report/hasil_pengujian.xlsx`) berisi: uji korektnas
  (>=10 masukan berbeda termasuk citra & PDF), waktu enkripsi/dekripsi untuk
  1&nbsp;KB/1&nbsp;MB/10&nbsp;MB, avalanche effect, entropi, dan perbandingan
  dua algoritma &mdash; beserta grafik histogram byte (PNG).

---

## Struktur Proyek

```
📂 cipherly-encryption
├─── 📂 api/                     # API routes and endpoints
│   └─── 📄 index.py                     # Python script
├─── 📂 app/                     # Application pages and routing
│   ├─── 📂 routes/                     # Directory
│   │   ├─── 📄 __init__.py                     # Python script
│   │   ├─── 📄 analysis.py                     # Python script
│   │   ├─── 📄 demo.py                     # Python script
│   │   ├─── 📄 file.py                     # Python script
│   │   ├─── 📄 hybrid.py                     # Python script
│   │   ├─── 📄 text.py                     # Python script
│   │   └─── 📄 views.py                     # Python script
│   ├─── 📄 __init__.py                     # Python script
│   ├─── 📄 config.py                     # Python script
│   └─── 📄 errors.py                     # Python script
├─── 📂 report/                     # Directory
│   ├─── 📂 sample_data/                     # Directory
│   │   └─── 📄 README.md                     # Project documentation
│   ├─── 📄 hasil_pengujian.xlsx                     # File
│   ├─── 📄 histogram_ciphertext.png                     # PNG image
│   ├─── 📄 histogram_plaintext.png                     # PNG image
│   └─── 📄 laporan_teknis_skeleton.docx                     # File
├─── 📂 static/                     # Directory
│   ├─── 📂 css/                     # Directory
│   │   ├─── 📄 app.css                     # Stylesheet
│   │   ├─── 📄 base.css                     # Stylesheet
│   │   ├─── 📄 components.css                     # Stylesheet
│   │   ├─── 📄 landing.css                     # Stylesheet
│   │   └─── 📄 variables.css                     # Stylesheet
│   ├─── 📂 js/                     # Directory
│   │   ├─── 📄 analysis_panel.js                     # JavaScript file
│   │   ├─── 📄 api.js                     # JavaScript file
│   │   ├─── 📄 app.js                     # JavaScript file
│   │   ├─── 📄 demo_panel.js                     # JavaScript file
│   │   ├─── 📄 file_panel.js                     # JavaScript file
│   │   ├─── 📄 hybrid_panel.js                     # JavaScript file
│   │   ├─── 📄 icons.js                     # JavaScript file
│   │   ├─── 📄 password_strength.js                     # JavaScript file
│   │   ├─── 📄 tabs.js                     # JavaScript file
│   │   ├─── 📄 text_panel.js                     # JavaScript file
│   │   └─── 📄 toast.js                     # JavaScript file
│   ├─── 📂 tests/                     # Test files
│   │   ├─── 📄 run.mjs                     # File
│   │   ├─── 📄 run.ps1                     # File
│   │   └─── 📄 selftest.html                     # File
│   ├─── 📄 script.js                     # JavaScript file
│   └─── 📄 style.css                     # Stylesheet
├─── 📂 templates/                     # Directory
│   ├─── 📂 panels/                     # Directory
│   │   ├─── 📄 panel_analysis.html                     # File
│   │   ├─── 📄 panel_demo.html                     # File
│   │   ├─── 📄 panel_file.html                     # File
│   │   ├─── 📄 panel_hybrid.html                     # File
│   │   └─── 📄 panel_text.html                     # File
│   ├─── 📄 app.html                     # File
│   ├─── 📄 base.html                     # File
│   ├─── 📄 index.html                     # File
│   └─── 📄 landing.html                     # File
├─── 📂 testing/                     # Directory
│   ├─── 📄 __init__.py                     # Python script
│   ├─── 📄 benchmark.py                     # Python script
│   ├─── 📄 metrics.py                     # Python script
│   └─── 📄 sample_files.py                     # Python script
├─── 📂 tests/                     # Test files
│   ├─── 📄 test_crypto_core.py                     # Python script
│   └─── 📄 test_vercel_entrypoint.py                     # Python script
├─── 📄 .gitignore                     # Git ignore rules
├─── 📄 .python-version                     # File
├─── 📄 .vercelignore                     # File
├─── 📄 crypto_core.py                     # Python script
├─── 📄 README.md                     # Project documentation
├─── 📄 requirements-dev.txt                     # File
├─── 📄 requirements.txt                     # File
├─── 📄 run_dev.py                     # Python script
├─── 📄 skills-lock.json                     # JSON configuration
└─── 📄 vercel.json                     # JSON configuration
```

---

## Cara Instalasi

Membutuhkan **Python 3.10+** (dikembangkan dengan Python 3.12).

### Windows (PowerShell)

```powershell
# 1. Clone repositori
git clone https://github.com/Discbrake023/cipherly-encryption.git
cd cipherly-encryption

# 2. (Disarankan) buat virtual environment
py -3.12 -m venv venv
venv\Scripts\Activate.ps1

# 3. Pasang dependensi
pip install -r requirements.txt
```

> Jika `Activate.ps1` diblokir kebijakan eksekusi, jalankan dulu
> `Set-ExecutionPolicy -Scope Process RemoteSigned`, atau pakai Command
> Prompt: `venv\Scripts\activate.bat`.

### Linux / macOS

```bash
# 1. Clone repositori
git clone https://github.com/Discbrake023/cipherly-encryption.git
cd cipherly-encryption

# 2. (Disarankan) buat virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Pasang dependensi
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

---

## Cara Menjalankan Aplikasi

### Windows (PowerShell)

```powershell
py -3.12 run_dev.py
```

> Jika `py` tidak tersedia, pakai `python run_dev.py` (asalkan Python sudah
> ada di PATH).

### Linux / macOS

```bash
python3 run_dev.py
```

Buka **http://127.0.0.1:5000** di browser. Antarmuka memiliki 5 tab:

1. **Enkripsi Teks** &mdash; enkripsi/dekripsi teks, hasil Base64/hex.
2. **Enkripsi Berkas** &mdash; unggah berkas apa pun, unduh hasil `.krp`
   (atau berkas asli setelah didekripsi).
3. **Demo Skenario** &mdash; menjalankan skenario demo wajib secara
   otomatis dalam satu klik.
4. **Analisis Cepat** &mdash; pratinjau avalanche effect & entropi secara
   interaktif.
5. **Hibrida (RSA + AES)** &mdash; demonstrasi enkripsi hibrida (fitur
   pengayaan).

### Hot Reload (pengembangan lokal)

Hot reload **aktif secara default** saat dijalankan lewat `run_dev.py`
(`FLASK_DEBUG=1`):

- **File Python (`.py`)** &mdash; server restart otomatis (Werkzeug reloader).
- **Template (`templates/*.html`)** &mdash; Jinja reload otomatis, lalu
  browser me-refresh halaman sendiri.
- **CSS/JS (`static/`)** &mdash; browser me-refresh halaman otomatis tiap
  2 detik lewat endpoint dev `/__dev/version` (hanya ada saat debug).

Mematikan hot reload (misalnya saat ingin server statis):

```powershell
# Windows
$env:FLASK_DEBUG="0"; py -3.12 run_dev.py

$env:FLASK_DEBUG="1"; py -3.12 run_dev.py
```

```bash
# Linux / macOS
FLASK_DEBUG=0 python3 run_dev.py
```

> Endpoint `/__dev/version` dan skrip auto-refresh **tidak dirender** saat
> `FLASK_DEBUG=0` maupun di deployment produksi (Vercel), sehingga aman.

---

## Cara Menjalankan Pengujian

### Unit test

```powershell
# Windows
py -3.12 -m pytest -v
```

```bash
# Linux / macOS
python3 -m pytest -v
```

### Pengujian menyeluruh (menghasilkan data untuk laporan)

```powershell
# Windows
py -3.12 -m testing.benchmark
```

```bash
# Linux / macOS
python3 -m testing.benchmark
```

Hasilnya akan tersimpan di folder `report/`:

- `hasil_pengujian.xlsx` &mdash; 5 sheet: Uji Korektnas, Uji Waktu, Avalanche
  Effect, Entropi, dan Perbandingan Algoritma.
- `histogram_plaintext.png`, `histogram_ciphertext.png`.

> **Catatan:** `testing/sample_files.py` membuat citra PNG dan dokumen PDF
> sintetis secara otomatis (tanpa dependensi tambahan) agar skrip dapat
> langsung dijalankan.
> tambahkan berkas gambar/PDF asli ke folder `sample_data/` sebelum
> menjalankan `benchmark.py` &mdash; berkas tersebut akan otomatis ikut diuji.

---

## Deploy ke Vercel (Git Integration)

Proyek sudah dikonfigurasi untuk deploy otomatis lewat Vercel:

- `api/index.py` &mdash; entrypoint serverless yang mengekspor objek WSGI
  `app` (hasil `create_app()`), sesuai deteksi framework Flask Vercel.
- `vercel.json` &mdash; me-rewrite semua rute (`/(.*)`) ke `/api/index`,
  sehingga Flask menangani `/`, `/app`, `/static/*`, dan `/api/*`.
- `FLASK_DEBUG` tidak pernah di-set di Vercel, jadi route dev
  `/__dev/version` tidak terdaftar di produksi.

Langkah deploy:

1. Push repo ini ke GitHub.
2. Buka [vercel.com/new](https://vercel.com/new), impor repositori.
   Framework &amp; preset terdeteksi otomatis (Flask, Python 3.12 sesuai
   `.python-version`), tidak perlu mengubah pengaturan build.
3. Klik **Deploy**; build berikutnya berjalan otomatis tiap push ke `main`.

> **Batasan ukuran unggahan:** Vercel membatasi body request serverless
> ke **4,5 MB**, sementara `MAX_CONTENT_LENGTH` aplikasi default 32 MB.
> Atur environment variable `MAX_CONTENT_LENGTH_MB=4` di dashboard Vercel
> agar Flask menolak berkas besar lebih awal dengan pesan yang jelas.

Guardrail: `tests/test_vercel_entrypoint.py` memastikan auto-detect Vercel
selalu memilih `api/index.py` dan root tidak memiliki `app.py` yang bisa
bertabrakan dengan package `app/`. Jalankan `py -3.12 -m pytest -v` sebelum
push.

---

## Contoh Penggunaan (API)

Aplikasi juga dapat dipakai lewat API langsung, contoh dengan `curl`:

```bash
# Enkripsi teks
curl -X POST http://127.0.0.1:5000/api/encrypt/text \
  -H "Content-Type: application/json" \
  -d '{"plaintext":"Halo dunia","password":"kataSandiKuat!","algorithm":"aes-gcm","kdf":"pbkdf2","encoding":"base64"}'

# Enkripsi berkas
curl -X POST http://127.0.0.1:5000/api/encrypt/file \
  -F "file=@dokumen.pdf" -F "password=kataSandiKuat!" \
  -F "algorithm=chacha20" -F "kdf=argon2" -o dokumen.pdf.krp
```

---

## Format Envelope (`.krp`)

Setiap hasil enkripsi disimpan sebagai satu blok biner mandiri sehingga
tidak perlu menyimpan salt/nonce terpisah:

```
──────────┬─────────┬────────┬───────────┬──────────┬───────┬────────┬──────────────┐
│ Magic(4B)│ Algo(1B)│ KDF(1B)│ Param(4B) │SaltLen(1B)│ Salt  │NonceLen│ Ciphertext+Tag│
│   KRP1   │ 0=AES   │ 0=PBKDF2│ Big-Endian│    16     │ 16B   │  12    │  AEAD Output  │
└──────────┴─────────┴────────┴───────────┴──────────┴───────┴────────┴──────────────┘
```

Dekripsi akan **ditolak** bila:
- kata sandi salah (kunci turunan berbeda &rarr; verifikasi tag AEAD gagal), atau
- ciphertext/tag telah diubah walau hanya satu byte.

---

## Keamanan & Batasan yang Perlu Diketahui

- Kunci privat RSA pada tab **Hibrida** ditampilkan di UI **khusus untuk
  keperluan demo**; pada sistem produksi kunci privat wajib dienkripsi saat
  disimpan dan tidak pernah dikirim melalui jaringan tanpa proteksi tambahan.
- Parameter KDF default (600.000 iterasi PBKDF2 / Argon2id 64&nbsp;MiB) dipilih
  agar aman namun tetap responsif untuk demo; boleh disesuaikan di
  `crypto_core.py` (`*_DEFAULT`).
- Aplikasi ini adalah proyek tugas kuliah untuk tujuan pembelajaran, bukan
  produk yang telah diaudit keamanannya secara independen.

---

## Troubleshooting

**Error: `ModuleNotFoundError: No module named 'cryptography'`**  
- Pastikan virtual environment aktif: `source venv/bin/activate` (Linux/Mac) atau `venv\Scripts\activate` (Windows).

**Blank page setelah deploy ke Vercel**  
- Hard refresh browser (`Ctrl+Shift+R`). Jika masih blank, cek Build Logs di dashboard Vercel. Pastikan route `/static/(.*)` berada **DI ATAS** route wildcard di `vercel.json`.

**Unit test gagal**  
- Pastikan Python ≥ 3.12 dan semua dependensi terinstall: `pip install -r requirements-dev.txt`.

**File `.krp` tidak bisa didekripsi**  
- Pastikan password identik persis (*case-sensitive*). Envelope KRP1 menyimpan salt & nonce asli, sehingga dekripsi hanya berhasil jika password sama **DAN** ciphertext tidak diubah 1 bit pun.

---

## Lisensi

Proyek tugas kuliah &mdash; bebas dipakai untuk keperluan pembelajaran.
