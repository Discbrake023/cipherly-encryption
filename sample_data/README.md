# sample_data/

Taruh berkas uji **asli** di folder ini sebelum menjalankan `python -m testing.benchmark`
untuk memperkuat hasil pengujian pada laporan, misalnya:

- 2-3 berkas citra (`.png`, `.jpg`, `.bmp`)
- 1-2 berkas PDF asli (bukan hasil sintetis)
- berkas dokumen lain yang relevan dengan ide aplikasi kelompok Anda

Skrip `testing/benchmark.py` akan otomatis membaca semua berkas di folder ini
dan mengikutsertakannya pada uji korektnas, di samping berkas sintetis
(teks, biner acak, PNG & PDF kecil) yang sudah dihasilkan otomatis.

Folder ini boleh dikosongkan kembali (atau ditambah `.gitkeep`) sebelum
dikumpulkan bila berkas uji bersifat sensitif/privat.
