// ---------- Konstanta ----------
const STATUS_AKHIR = "Sudah Dipanen";

// Fase master (ikon sama dengan bagian "Kebun" di landing page)
const FASE = {
  1: { nama: "Semai",       urutan: 1, ikon: "🌱" },
  2: { nama: "Peremajaan",  urutan: 2, ikon: "🪴" },
  3: { nama: "Pendewasaan", urutan: 3, ikon: "🥬" },
  4: { nama: "Panen",       urutan: 4, ikon: "🧺" },
};

// Aturan status (samakan dengan budidaya.js dan riwayat.js)
const PH_MIN = 5.5, PH_MAX = 6.5;
const BATAS_HARI_PINDAH = 2;
const MS_HARI = 86400000;
const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysBetween = (s) => Math.max(0, Math.round((today() - toDate(s)) / MS_HARI));

// Umur tanaman (hari sejak tanam) saat fase berakhir
const UMUR_SEMAI = 14;        // pindah di hari ke-15
const UMUR_PEREMAJAAN = 21;   // pindah di hari ke-22
// Pendewasaan sampai panen: 45-55 hari, nilai pastinya dari fitur AI
const UMUR_PANEN_DEFAULT = 50, UMUR_PANEN_MIN = 45, UMUR_PANEN_MAX = 55;
const umurPanen = (ai) => Math.min(UMUR_PANEN_MAX, Math.max(UMUR_PANEN_MIN, Number(ai) || UMUR_PANEN_DEFAULT));
const batasUmur = (idFase, ai) => ({ 1: UMUR_SEMAI, 2: UMUR_PEREMAJAAN, 3: umurPanen(ai) })[idFase] ?? null;

// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
function showAlert(message) { const e = $("alert"); e.textContent = message; e.hidden = false; }
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------- Mapping data batch dari BE ----------
// BE mengirim CultivationBatchResource dengan perpindahan_fase (PhaseHistoryResource[])
function mapBatch(b) {
  const tanam = b.tanggal_tanam || b.seed_date;
  const hasPanen = Array.isArray(b.panen) && b.panen.length > 0;
  const umurHari = tanam ? daysBetween(tanam) : 0;

  // Fase otomatis sesuai umur dan panen
  let idFase = 1;
  if (hasPanen) {
    idFase = 4; // Panen
  } else if (umurHari <= UMUR_SEMAI) {
    idFase = 1; // 0 - 14 hari: Semai
  } else if (umurHari <= UMUR_PEREMAJAAN) {
    idFase = 2; // 15 - 21 hari: Peremajaan
  } else {
    idFase = 3; // > 21 hari: Pendewasaan
  }

  // Jika ada perpindahan_fase tercatat lebih tinggi, gunakan yang lebih tinggi
  const faseArr = b.perpindahan_fase || [];
  const sorted = [...faseArr].sort((a, c) => (a.tanggal_mulai || "").localeCompare(c.tanggal_mulai || ""));
  const terakhir = sorted[sorted.length - 1];
  if (!hasPanen && terakhir && terakhir.id_fase > idFase) {
    idFase = terakhir.id_fase;
  }

  const info = FASE[idFase] || FASE[1];

  // Hitung status berdasarkan data
  const ph = b.nilai_ph;
  const phDiLuar = ph !== null && ph !== undefined && ph !== "" && (Number(ph) < PH_MIN || Number(ph) > PH_MAX);

  let status = "Normal";
  if (hasPanen) {
    status = "Sudah Dipanen";
  } else if (phDiLuar) {
    status = "Perlu Diperhatikan";
  } else if (idFase === 3 && umurHari >= 43) {
    status = "Mendekati Panen";
  } else if ((idFase === 1 && umurHari >= 12) || (idFase === 2 && umurHari >= 19)) {
    status = "Mendekati Perpindahan Fase";
  }

  return {
    id_budidaya: b.id_pengelolaan || b.id,
    kode_budidaya: b.kode_pengelolaan || b.batch_code || "-",
    status,
    id_fase: idFase,
    nama_fase: info.nama,
    urutan_fase: info.urutan,
    hasPanen,
  };
}

// ---------- Ambil data ----------
async function fetchBatches() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return [];
  }
  // Ambil semua batch dengan per_page besar agar tidak terpagination
  const res = await apiFetch(ENDPOINTS.budidaya + "?per_page=100");
  if (!res) return [];
  if (!res.ok) throw new Error("Gagal mengambil data");
  const json = await res.json();
  const raw = Array.isArray(json.data) ? json.data : (json.data?.data || []);
  return raw.map(mapBatch);
}

// [BARU] Jumlah pesanan: memakai endpoint yang sama dengan pesanan.js
async function fetchJumlahPesanan() {
  if (USE_MOCK) return 0;
  const path = (typeof ENDPOINTS !== "undefined" && ENDPOINTS.pesanan) || "/cultivator/orders";
  const res = await apiFetch(path + "?per_page=100");
  if (!res) return null; // 401 -> sudah logout otomatis
  if (!res.ok) throw new Error("Gagal mengambil data pesanan");
  const json = await res.json();
  const list = Array.isArray(json) ? json : (json.data?.data || json.data || []);
  // Kalau BE memakai pagination, pakai total dari BE; kalau tidak, hitung isi daftar
  const total = json.meta?.total ?? json.data?.total ?? json.total;
  return Number(total ?? list.length);
}

// [BARU] Produk dan stok: memakai endpoint yang sama dengan produk.js
function mapProduk(p) {
  return {
    nama: p.nama_produk || p.name || "-",
    stok: Number(p.jumlah_stok ?? p.stock ?? p.stok ?? 0),
    satuan: p.satuan === "pcs" ? "pcs" : "kg", // kolom satuan menyusul dari BE; sementara semua dianggap kg
  };
}
async function fetchProduk() {
  if (USE_MOCK) {
    try { return JSON.parse(localStorage.getItem("mock_produk") || "[]").map(mapProduk); }
    catch (_) { return []; }
  }
  const path = (typeof ENDPOINTS !== "undefined" && ENDPOINTS.produk) || "/produk";
  const res = await apiFetch(path + "?per_page=50");
  if (!res) return [];
  if (!res.ok) throw new Error("Gagal mengambil data produk");
  const json = await res.json();
  const items = Array.isArray(json.data) ? json.data : (json.data?.data || []);
  return items.map(mapProduk);
}

// ---------- State ----------
let batches = [];

const aktif = () => batches.filter((b) => b.status !== STATUS_AKHIR);
const jumlahFase = (id) => {
  if (id === 4) {
    return batches.filter((b) => b.id_fase === 4 || b.hasPanen || b.status === STATUS_AKHIR).length;
  }
  return aktif().filter((b) => b.id_fase === id).length;
};

// ---------- Tampilan ----------
const fmtAngka = (n, maxDesimal) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: maxDesimal });
const fmtStok = (p) => fmtAngka(p.stok, p.satuan === "pcs" ? 0 : 2) + " " + p.satuan;

// ada = false -> data belum/tidak berhasil dimuat, tampilkan "-"
function renderBatch(ada) {
  $("s-batch").textContent = ada ? String(aktif().length) : "-";

  const jalur = $("jalur");
  jalur.replaceChildren();
  Object.entries(FASE).sort((x, y) => x[1].urutan - y[1].urutan).forEach(([id, f]) => {
    const n = ada ? jumlahFase(Number(id)) : null;
    const li = el("li", "step" + (n > 0 ? " on" : ""));
    const ikon = el("i", "", f.ikon);
    ikon.setAttribute("aria-hidden", "true");
    li.append(ikon, el("b", "", f.nama), el("span", "ct", (n === null ? "-" : n) + " batch"));
    jalur.appendChild(li);
  });
}

function renderPesanan(n) {
  $("s-pesanan").textContent = n === null || n === undefined || Number.isNaN(n) ? "-" : String(n);
}

function renderStok(list, pesanKosong) {
  const body = $("stok-body");
  body.replaceChildren();
  $("stok-table").hidden = list.length === 0;
  const kosong = $("stok-empty");
  kosong.hidden = list.length > 0;
  kosong.textContent = pesanKosong || "Belum ada produk. Tambahkan lewat Manajemen Produk.";
  list.forEach((p) => {
    const tr = el("tr");
    tr.append(el("td", "", p.nama), el("td", "r", fmtStok(p)));
    body.appendChild(tr);
  });
}

// ---------- Mulai ----------
(async function init() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = user.email || "";
  } catch (_) {}
  $("btn-logout").addEventListener("click", logout);

  renderBatch(false);

  // Tiga data diambil bersamaan, dan kegagalan satu data tidak mengganggu yang lain
  const [rBatch, rPesanan, rProduk] = await Promise.allSettled([fetchBatches(), fetchJumlahPesanan(), fetchProduk()]);

  if (rBatch.status === "fulfilled") {
    batches = rBatch.value;
    renderBatch(true);
  } else {
    showAlert("Data budidaya belum bisa dimuat. Coba muat ulang halaman.");
  }

  if (rPesanan.status === "fulfilled") renderPesanan(rPesanan.value);
  else { console.warn("[DASHBOARD] Jumlah pesanan gagal dimuat:", rPesanan.reason); renderPesanan(null); }

  if (rProduk.status === "fulfilled") renderStok(rProduk.value);
  else { console.warn("[DASHBOARD] Stok produk gagal dimuat:", rProduk.reason); renderStok([], "Data stok produk belum bisa dimuat."); }

  window.addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });
})();