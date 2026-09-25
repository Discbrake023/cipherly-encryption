# Cipherly &mdash; Aplikasi Enkripsi Modern (Topik A)

Aplikasi web untuk mengenkripsi dan mendekripsi teks maupun berkas memakai
algoritma kriptografi modern **AES-256-GCM** dan **ChaCha20-Poly1305**,
dibuat untuk Tugas Proyek Aplikasi Kriptografi &mdash; mata kuliah Keamanan
Informasi, Program Studi Informatika, Universitas Siliwangi.

## Anggota Kelompok

| Nama | NPM |
|---|---|
| _(isi nama anggota 1)_ | _(isi NPM)_ |
| _(isi nama anggota 2)_ | _(isi NPM)_ |
| _(isi nama anggota 3)_ | _(isi NPM)_ |

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
  tabel Excel (`laporan/hasil_pengujian.xlsx`) berisi: uji korektnas
  (>=10 masukan berbeda termasuk citra & PDF), waktu enkripsi/dekripsi untuk
  1&nbsp;KB/1&nbsp;MB/10&nbsp;MB, avalanche effect, entropi, dan perbandingan
  dua algoritma &mdash; beserta grafik histogram byte (PNG).

## Struktur Proyek

```
tugas-kripto/
├── app.py                  # Backend Flask (routing & API)
├── crypto_core.py          # Modul inti kriptografi (AEAD, KDF, hibrida RSA)
├── requirements.txt
├── templates/index.html    # Antarmuka web (5 tab)
├── static/style.css
├── static/script.js
├── testing/
│   ├── metrics.py           # Avalanche effect, entropi, histogram
│   ├── sample_files.py      # Generator PNG & PDF sintetis untuk uji korektnas
│   └── benchmark.py         # Skrip pengujian menyeluruh -> laporan/hasil_pengujian.xlsx
├── tests/
│   └── test_crypto_core.py  # Unit test (pytest, 8 test)
├── sample_data/              # (opsional) taruh berkas gambar/PDF asli di sini
└── laporan/                  # Keluaran benchmark: xlsx + histogram PNG
```

## Cara Instalasi

Membutuhkan **Python 3.10+**.

```bash
# 1. Clone repositori
git clone <url-repositori-anda>
cd tugas-kripto

# 2. (Disarankan) buat virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Pasang dependensi
pip install -r requirements.txt
```

## Cara Menjalankan Aplikasi

```bash
python app.py
```

Buka **http://127.0.0.1:5000** di browser. Antarmuka memiliki 5 tab:

1. **Enkripsi Teks** &mdash; enkripsi/dekripsi teks, hasil Base64/hex.
2. **Enkripsi Berkas** &mdash; unggah berkas apa pun, unduh hasil `.krp`
   (atau berkas asli setelah didekripsi).
3. **Demo Skenario UTS** &mdash; menjalankan skenario demo wajib secara
   otomatis dalam satu klik.
4. **Analisis Cepat** &mdash; pratinjau avalanche effect & entropi secara
   interaktif.
5. **Hibrida (RSA + AES)** &mdash; demonstrasi enkripsi hibrida (fitur
   pengayaan).

## Cara Menjalankan Pengujian

### Unit test

```bash
pytest -v
```

### Pengujian menyeluruh (menghasilkan data untuk laporan)

```bash
python -m testing.benchmark
```

Hasilnya akan tersimpan di folder `laporan/`:

- `hasil_pengujian.xlsx` &mdash; 5 sheet: Uji Korektnas, Uji Waktu, Avalanche
  Effect, Entropi, dan Perbandingan Algoritma.
- `histogram_plaintext.png`, `histogram_ciphertext.png`.

> **Catatan:** `testing/sample_files.py` membuat citra PNG dan dokumen PDF
> sintetis secara otomatis (tanpa dependensi tambahan) agar skrip dapat
> langsung dijalankan. Untuk hasil yang lebih meyakinkan pada laporan,
> silakan tambahkan berkas gambar/PDF asli ke folder `sample_data/` sebelum
> menjalankan `benchmark.py` &mdash; berkas tersebut akan otomatis ikut diuji.

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

## Format Envelope (`.krp`)

Setiap hasil enkripsi disimpan sebagai satu blok biner mandiri sehingga
tidak perlu menyimpan salt/nonce terpisah:

```
[ "KRP1" | algo_id(1B) | kdf_id(1B) | kdf_param(4B) |
  salt_len(1B) | salt | nonce_len(1B) | nonce | ciphertext+tag ]
```

Dekripsi akan **ditolak** bila:
- kata sandi salah (kunci turunan berbeda &rarr; verifikasi tag AEAD gagal), atau
- ciphertext/tag telah diubah walau hanya satu byte.

## Keamanan & Batasan yang Perlu Diketahui

- Kunci privat RSA pada tab **Hibrida** ditampilkan di UI **khusus untuk
  keperluan demo**; pada sistem produksi kunci privat wajib dienkripsi saat
  disimpan dan tidak pernah dikirim melalui jaringan tanpa proteksi tambahan.
- Parameter KDF default (600.000 iterasi PBKDF2 / Argon2id 64&nbsp;MiB) dipilih
  agar aman namun tetap responsif untuk demo; boleh disesuaikan di
  `crypto_core.py` (`*_DEFAULT`).
- Aplikasi ini adalah proyek tugas kuliah untuk tujuan pembelajaran, bukan
  produk yang telah diaudit keamanannya secara independen.

## Penggunaan Asisten AI

Sebagian kode pada proyek ini dibantu oleh asisten AI (Claude) untuk
mempercepat penulisan boilerplate Flask, styling antarmuka, dan struktur
skrip pengujian. Seluruh logika kriptografi inti (pemilihan algoritma,
parameter KDF, desain format envelope) telah ditinjau dan dipahami oleh
anggota kelompok.

## Lisensi

Proyek tugas kuliah &mdash; bebas dipakai untuk keperluan pembelajaran.
