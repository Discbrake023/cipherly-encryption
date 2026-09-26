/**
 * Headless DOM selftest runner — zero dependencies.
 * Menjalankan static/tests/selftest.html di Edge headless lalu melaporkan hasil.
 *
 * Pakai:  node static/tests/run.mjs [groups...]   (contoh: t1 t4)
 * Prasyarat: server Flask berjalan di BASE_URL (default http://127.0.0.1:5000)
 */
import { execFileSync } from "node:child_process";

const EDGE =
  process.env.EDGE_PATH ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = process.env.BASE_URL || "http://127.0.0.1:5000";
const groups = process.argv.slice(2);
const url = `${BASE}/static/tests/selftest.html?groups=${encodeURIComponent(
  groups.length ? groups.join(",") : "all",
)}&t=${Date.now()}`;

let html;
try {
  html = execFileSync(
    EDGE,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--disable-extensions",
      "--virtual-time-budget=45000",
      "--dump-dom",
      url,
    ],
    { encoding: "utf8", timeout: 120000, maxBuffer: 32 * 1024 * 1024 },
  );
} catch (e) {
  console.error("Edge headless gagal:", e.message);
  process.exit(2);
}

const m = html.match(/<pre id="results">([\s\S]*?)<\/pre>/);
if (!m || m[1].trim() === "PENDING") {
  console.error("Hasil tidak ditemukan (selftest tidak selesai dalam budget virtual time).");
  process.exit(2);
}

let data;
try {
  const json = m[1]
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  data = JSON.parse(json);
} catch (e) {
  console.error("JSON hasil tidak valid:", e.message, "\n", m[1].slice(0, 300));
  process.exit(2);
}

for (const r of data.results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : `  — ${r.detail}`}`);
}
console.log(`\n${data.total - data.failed}/${data.total} lulus`);
process.exit(data.failed > 0 ? 1 : 0);
