const $ = (id) => document.getElementById(id);
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

// ---------- Aturan (harus sama dengan budidaya.js) ----------
const FASE = [
  { id: 1, nama: "Semai",      durasi: 7,  warna: "#8fbf4d" },
  { id: 2, nama: "Pembibitan", durasi: 14, warna: "#3f9d6a" },
  { id: 3, nama: "Pembesaran", durasi: 21, warna: "#2f6f3e" },
  { id: 4, nama: "Panen",      durasi: 7,  warna: "#e0a526" },
];
const MASA_TANAM = FASE.reduce((t, f) => t + f.durasi, 0); // 49 hari dari tanam sampai panen
const BUDIDAYA_KEYS = ["mock_budidaya", "mock_budidaya_v2"]; // kunci penyimpanan Data Budidaya
const PH_MIN = 5.5, PH_MAX = 6.5; // di luar rentang ini = Perlu Diperhatikan

const N = "Normal", P = "Perlu Diperhatikan", M = "Mendekati Perpindahan Fase",
      K = "Mendekati Panen", S = "Sudah Dipanen";

// ---------- Data contoh (belum ada BE-nya) ----------
const MS_HARI = 86400000;
const CONTOH = {
  jumlah_pesanan: 14,
  prediksi: { periode: new Date(Date.now() + 30 * MS_HARI).toISOString().slice(0, 10), hasil: 245.5, satuan: "kg" },
  stok: [
    { nama_produk: "Selada keriting",   jumlah_stok: 62.5,  satuan: "kg" },
    { nama_produk: "Selada romaine",    jumlah_stok: 38,    satuan: "kg" },
    { nama_produk: "Selada butterhead", jumlah_stok: 20.25, satuan: "kg" },
  ],
};

// ---------- Tanggal ----------
const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysBetween = (s) => Math.max(0, Math.floor((today() - toDate(s)) / MS_HARI));
const fmtTanggal = (d) => d.toLocaleDateString("id-ID", { dateStyle: "long" });
const fmtAngka = (n) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 });

// ---------- Baca data dari Data Budidaya ----------
function loadData() {
  for (const key of BUDIDAYA_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length) return arr;
    } catch (_) {}
  }
  return [];
}

// Ubah satu batch jadi bentuk ringkas untuk dashboard
function ringkas(b) {
  const riwayat = b.fase || [];
  const terakhir = riwayat[riwayat.length - 1];
  const idx = terakhir ? FASE.findIndex((f) => f.id === terakhir.id_fase) : -1;
  if (idx < 0) return null; // data tanpa fase tidak bisa dihitung

  const f = FASE[idx];
  const hari = daysBetween(terakhir.tanggal_mulai);
  const bukanTerakhir = idx < FASE.length - 1;
  const perluPindah = b.status === "Aktif" && bukanTerakhir && hari >= f.durasi - 2;
  const ph = b.nilai_ph;
  const phBermasalah = ph !== null && ph !== undefined && ph !== "" && (Number(ph) < PH_MIN || Number(ph) > PH_MAX);

  let status;
  if (b.status === "Selesai") status = S;
  else if (phBermasalah) status = P;
  else if (b.status === "Panen" || !bukanTerakhir || (perluPindah && idx === FASE.length - 2)) status = K;
  else if (perluPindah) status = M;
  else status = N;

  return {
    kode: b.kode_pengelolaan || b.kode_budidaya || "-",
    tanam: b.tanggal_tanam, fase: idx, hari, durasi: f.durasi, status, ph,
    dipanen: b.status === "Panen" || b.status === "Selesai",
  };
}

const SEMUA = loadData().map(ringkas).filter(Boolean);
const BATCH = SEMUA.filter((b) => b.status !== S); // batch aktif

// ---------- Sapaan ----------
let nama = "Pembudidaya";
try {
  const u = JSON.parse(localStorage.getItem("user") || "{}");
  $("user-email").textContent = u.email || "";
  nama = (u.nama || u.name || nama).split(" ")[0];
} catch (_) {}
$("hero-title").textContent = "Halo, " + nama;

const perlu = BATCH.filter((b) => b.status !== N).length;
$("hero-sub").textContent = BATCH.length === 0
  ? "Belum ada batch yang berjalan. Tambahkan batch pertamamu di Data Budidaya."
  : BATCH.length + " batch sedang berjalan. " +
    (perlu ? perlu + " di antaranya perlu kamu cek hari ini." : "Semuanya aman hari ini.");
$("btn-logout").addEventListener("click", logout);

// ---------- Ringkasan ----------
$("s-batch").textContent = BATCH.length;
$("s-pesanan").textContent = CONTOH.jumlah_pesanan;
$("s-prediksi").textContent = fmtAngka(CONTOH.prediksi.hasil);
$("s-satuan").textContent = CONTOH.prediksi.satuan;
$("s-periode").textContent = "Periode sampai " + fmtTanggal(toDate(CONTOH.prediksi.periode));

// ---------- Jalur tanam ----------
FASE.forEach((f, i) => {
  const jml = BATCH.filter((b) => b.fase === i).length;
  const li = el("li", undefined, "step");
  li.style.setProperty("--c", f.warna);
  li.append(el("div", jml, "dot"), el("b", f.nama), el("span", jml + " batch"));
  $("jalur").appendChild(li);
});

// ---------- Batch berjalan (yang paling dekat selesai fase) ----------
const pct = (b) => Math.min(100, Math.round((b.hari / b.durasi) * 100));
if (BATCH.length === 0) {
  $("batch-list").appendChild(el("p", "Belum ada batch.", "kosong"));
}
[...BATCH].sort((a, b) => pct(b) - pct(a)).slice(0, 4).forEach((b) => {
  const f = FASE[b.fase];
  const card = el("article", undefined, "batch");
  card.style.setProperty("--c", f.warna);
  const mid = el("div");
  mid.append(el("h3", b.kode), el("small", f.nama + ", hari ke-" + b.hari + " dari " + b.durasi));
  const bar = el("div", undefined, "bar");
  const fill = el("i");
  fill.style.width = pct(b) + "%";
  bar.appendChild(fill);
  mid.appendChild(bar);
  card.append(mid, el("div", pct(b) + "%", "pct"));
  $("batch-list").appendChild(card);
});

// ---------- Perlu dicek ----------
const warnaStatus = { [P]: "#c8512f", [M]: "#3f9d6a", [K]: "#e0a526" };
const saran = {
  [P]: "Periksa kondisi tanaman, air, dan nutrisi.",
  [M]: "Siapkan perpindahan ke fase berikutnya.",
  [K]: "Siapkan tempat dan alat panen.",
};
const cek = BATCH.filter((b) => b.status !== N);
if (!cek.length) {
  const li = el("li", undefined, "kosong");
  li.append(
    el("b", BATCH.length ? "Tidak ada yang perlu dicek" : "Belum ada data"),
    el("span", BATCH.length ? "Semua batch dalam kondisi normal." : "Catatan akan muncul setelah ada batch.")
  );
  $("todo").appendChild(li);
}
cek.forEach((b) => {
  const li = el("li");
  li.style.setProperty("--c", warnaStatus[b.status]);
  const alasan = b.status === P && b.ph !== null && b.ph !== undefined && b.ph !== ""
    ? " (pH " + String(b.ph).replace(".", ",") + ")" : "";
  li.append(el("b", b.kode + ": " + b.status + alasan), el("span", saran[b.status]));
  $("todo").appendChild(li);
});

// ---------- Kesiapan panen ----------
function kesiapan(b) {
  if (b.dipanen || b.status === S) return { teks: "Sudah dipanen", cls: "selesai" };
  if (b.fase === FASE.length - 1) return { teks: "Siap panen", cls: "panen" };
  if (b.status === K) return { teks: "Mendekati panen", cls: "pindah" };
  return { teks: "Belum siap", cls: "" };
}
const estimasi = (b) => new Date(toDate(b.tanam).getTime() + MASA_TANAM * MS_HARI);
const urut = [...SEMUA].sort((a, b) => estimasi(a) - estimasi(b));
urut.forEach((b) => {
  const k = kesiapan(b);
  const tdStatus = el("td");
  tdStatus.appendChild(el("span", k.teks, "badge " + k.cls));
  const tr = el("tr");
  tr.append(el("td", b.kode), el("td", FASE[b.fase].nama), tdStatus, el("td", b.tanam ? fmtTanggal(estimasi(b)) : "-"));
  $("siap-rows").appendChild(tr);
});
$("siap-empty").hidden = SEMUA.length > 0;

// ---------- Stok ----------
CONTOH.stok.forEach((s) => {
  const li = el("li");
  li.append(el("span", s.nama_produk), el("b", fmtAngka(s.jumlah_stok) + " " + s.satuan));
  $("stok-list").appendChild(li);
});

// ---------- Ringkasan status ----------
[N, P, M, K].forEach((s) => {
  const chip = el("span", undefined, "chip");
  chip.append(el("b", BATCH.filter((b) => b.status === s).length), document.createTextNode(s));
  $("status-chips").appendChild(chip);
});

// ---------- Grafik (SVG sederhana) ----------
// TODO: data grafik masih contoh, belum dihubungkan ke data sungguhan
const CATATAN = [["Sen", 2], ["Sel", 5], ["Rab", 3], ["Kam", 6], ["Jum", 4], ["Sab", 7], ["Min", 5]];
(function chart() {
  const W = 640, H = 200, padX = 30, top = 20, bottom = 170;
  const max = Math.max(...CATATAN.map((c) => c[1])) + 1;
  const pts = CATATAN.map((c, i) => [
    padX + (i * (W - padX * 2)) / (CATATAN.length - 1),
    bottom - (c[1] / max) * (bottom - top),
  ]);
  let d = "M" + pts[0];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  const NS = "http://www.w3.org/2000/svg";
  const svg = $("chart");
  const add = (tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (text !== undefined) e.textContent = text;
    svg.appendChild(e);
  };
  add("path", { d: d + ` L${pts[pts.length - 1][0]},${bottom} L${pts[0][0]},${bottom} Z`, fill: "#dde8b0", opacity: ".7" });
  add("path", { d, fill: "none", stroke: "#2f5230", "stroke-width": 3, "stroke-linecap": "round" });
  pts.forEach((p, i) => {
    add("circle", { cx: p[0], cy: p[1], r: 5, fill: "#fff", stroke: "#2f5230", "stroke-width": 3 });
    add("text", { x: p[0], y: p[1] - 12, "text-anchor": "middle", "font-weight": 600 }, CATATAN[i][1]);
    add("text", { x: p[0], y: 192, "text-anchor": "middle" }, CATATAN[i][0]);
  });
})();

// Kalau kembali ke halaman ini lewat tombol Back, muat ulang supaya angka terbaru
window.addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });