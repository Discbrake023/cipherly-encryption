"""
testing/sample_files.py
========================
Menghasilkan berkas contoh (PNG kecil & PDF minimal) tanpa dependensi
tambahan (Pillow/reportlab), agar skrip pengujian dapat langsung dijalankan
setelah `pip install -r requirements.txt`.

CATATAN UNTUK MAHASISWA: berkas yang dihasilkan di sini sengaja sangat kecil
dan sintetis, hanya agar ada representasi "citra" dan "PDF" pada uji
korektnas 10 masukan. Untuk laporan yang lebih meyakinkan, SILAKAN ganti/
tambahkan berkas gambar dan PDF asli pada folder sample_data/ sebelum
menjalankan benchmark.py.
"""

from __future__ import annotations

import struct
import zlib


def make_png(width: int = 64, height: int = 64) -> bytes:
    """Membuat PNG grayscale sederhana berisi gradien, murni dengan zlib+struct."""

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0)  # 8-bit grayscale

    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 (none) per scanline
        for x in range(width):
            raw.append((x * 4 + y * 4) % 256)
    compressed = zlib.compress(bytes(raw), 9)

    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")


def make_pdf(text: str = "Berkas PDF contoh untuk uji Topik A - Aplikasi Kriptografi") -> bytes:
    """Membuat PDF satu halaman yang valid secara minimal (tanpa reportlab)."""
    objects = []

    objects.append("<< /Type /Catalog /Pages 2 0 R >>")
    objects.append("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(
        "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> "
        "/MediaBox [0 0 300 150] /Contents 5 0 R >>"
    )
    objects.append("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    stream_content = f"BT /F1 12 Tf 20 100 Td ({text}) Tj ET"
    stream = f"<< /Length {len(stream_content)} >>\nstream\n{stream_content}\nendstream"
    objects.append(stream)

    pdf = "%PDF-1.4\n"
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf.encode("latin-1")))
        pdf += f"{i} 0 obj\n{obj}\nendobj\n"

    xref_offset = len(pdf.encode("latin-1"))
    pdf += f"xref\n0 {len(objects) + 1}\n"
    pdf += "0000000000 65535 f \n"
    for off in offsets[1:]:
        pdf += f"{off:010d} 00000 n \n"
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF"

    return pdf.encode("latin-1")
