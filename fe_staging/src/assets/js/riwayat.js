// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function showAlert(msg) { $("alert").textContent = msg; show("alert"); }

const MS_HARI = 86400000;
const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const isoDaysAgo = (n) => { const d = today(); d.setDate(d.getDate() - n); return iso(d); };
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
const selisih = (a, b) => Math.max(0, Math.round((b - a) / MS_HARI));
const fmtTanggal = (s) => (s ? toDate(s).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-");
const fmtPendek = (s) => toDate(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const fmtAngka = (n, d = 2) => Number(n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

// Umur batch: jumlah hari dari tanggal tanam sampai hari ini (dipakai showDetail)
const daysBetween = (tanggalTanam) => (tanggalTanam ? selisih(toDate(tanggalTanam), today()) : 0);

// ---------- Aturan fase ----------
const NAMA_FASE = { 1: "Semai", 2: "Peremajaan", 3: "Pendewasaan", 4: "Panen" };
const UMUR_SEMAI = 14;        // pindah di hari ke-15
const UMUR_PEREMAJAAN = 21;   // pindah di hari ke-22
const UMUR_PANEN_DEFAULT = 50, UMUR_PANEN_MIN = 45, UMUR_PANEN_MAX = 55; // nilai pasti dari fitur AI
const umurPanen = (b) => Math.min(UMUR_PANEN_MAX, Math.max(UMUR_PANEN_MIN, b.umur_panen_ai || UMUR_PANEN_DEFAULT));

const STATUS_CLASS = {
  "Normal": "badge", "Perlu Diperhatikan": "badge perlu", "Mendekati Perpindahan Fase": "badge perlu",
  "Mendekati Panen": "badge panen", "Sudah Dipanen": "badge selesai",
};

// ---------- Data palsu (FE saja) ----------
// Tambahkan ?kosong=1 di URL untuk mencoba tampilan "Belum Ada Riwayat Budidaya"
const KOSONG = new URLSearchParams(location.search).has("kosong");

function seed() {
  return [
    { id: 1, kode_pengelolaan: "SLD-001", tanggal_tanam: isoDaysAgo(9), jumlah_tanaman: 120,
      lokasi: "Meja Semai 1", kondisi_tanaman: "Daun hijau segar, pertumbuhan normal.",
      kondisi_air_nutrisi: "Nutrisi 900 ppm.", kondisi_instalasi: "Pompa dan selang normal.",
      kondisi_lingkungan: "Suhu 27 C, cahaya cukup.", nilai_ph: 6.0, catatan: "",
      status: "Normal",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(9) }],
      panen: null },
    { id: 2, kode_pengelolaan: "SLD-002", tanggal_tanam: isoDaysAgo(18), jumlah_tanaman: 80,
      lokasi: "Meja Peremajaan 2", kondisi_tanaman: "Sebagian daun menguning di tepi.",
      kondisi_air_nutrisi: "Nutrisi 1000 ppm.", kondisi_instalasi: "Satu nozzle tersumbat.",
      kondisi_lingkungan: "Lembap, suhu 29 C.", nilai_ph: 6.3, catatan: "Pantau tiap pagi.",
      status: "Perlu Diperhatikan",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(18), tanggal_selesai: isoDaysAgo(4) },
             { id_fase: 2, tanggal_mulai: isoDaysAgo(4), lokasi_tujuan: "Meja Peremajaan 2", catatan: "Bibit sehat." }],
      panen: null },
    { id: 3, kode_pengelolaan: "SLD-003", tanggal_tanam: isoDaysAgo(55), jumlah_tanaman: 110,
      lokasi: "Meja Panen 1", kondisi_tanaman: "Daun lebat, siap dipanen.",
      kondisi_air_nutrisi: "Nutrisi 1200 ppm.", kondisi_instalasi: "Semua normal.",
      kondisi_lingkungan: "Suhu 26 C.", nilai_ph: 6.1, catatan: "Batch pertama bulan ini.",
      status: "Sudah Dipanen",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(55), tanggal_selesai: isoDaysAgo(41) },
             { id_fase: 2, tanggal_mulai: isoDaysAgo(41), tanggal_selesai: isoDaysAgo(34), lokasi_tujuan: "Meja Peremajaan 1" },
             { id_fase: 3, tanggal_mulai: isoDaysAgo(34), tanggal_selesai: isoDaysAgo(5), lokasi_tujuan: "Meja Pendewasaan 1", catatan: "Pertumbuhan baik." },
             { id_fase: 4, tanggal_mulai: isoDaysAgo(5), lokasi_tujuan: "Meja Panen 1" }],
      panen: { kode_panen: "PNN-003", tanggal_panen: isoDaysAgo(3), jumlah_panen: 108, berat_panen: 24.5, kondisi_hasil_panen: "Baik" } },
  ];
}
let data = KOSONG ? [] : seed();

async function loadBudidayaFromBackend() {
  if (KOSONG) return;
  if (typeof USE_MOCK !== "undefined" && !USE_MOCK && typeof apiFetch === "function" && localStorage.getItem("token")) {
    try {
      const res = await apiFetch((typeof ENDPOINTS !== "undefined" ? ENDPOINTS.budidaya : "/pengelolaan") + "?per_page=100");
      if (res && res.ok) {
        const json = await res.json();
        const batches = Array.isArray(json.data) ? json.data : (json.data?.data || []);
        if (batches.length > 0) {
          data = batches.map((b) => {
            const rawFase = b.perpindahan_fase || [];
            const sortedFase = [...rawFase].sort((x, y) => (x.tanggal_mulai || "").localeCompare(y.tanggal_mulai || ""));
            const mappedFase = sortedFase.map((p) => ({
              id_perpindahan: p.id_perpindahan || p.id,
              id_fase: p.id_fase || p.fase?.id_fase || 1,
              tanggal_mulai: p.tanggal_mulai,
              tanggal_selesai: p.tanggal_selesai || "",
              lokasi_tujuan: p.lokasi_tujuan || "",
              catatan: p.catatan || "",
            }));

            if (mappedFase.length === 0) {
              mappedFase.push({
                id_fase: 1,
                tanggal_mulai: b.tanggal_tanam || b.seed_date || iso(today()),
                tanggal_selesai: "",
                lokasi_tujuan: b.lokasi || "",
                catatan: "Fase awal",
              });
            }

            const pList = Array.isArray(b.panen) ? b.panen : (b.panen ? [b.panen] : []);
            const pn = pList[0] || null;
            const panenObj = pn ? {
              kode_panen: pn.kode_panen || ("PNN-" + (b.kode_pengelolaan || b.id)),
              tanggal_panen: pn.tanggal_panen || pn.harvest_date || pn.created_at,
              jumlah_panen: Number(pn.jumlah_panen ?? pn.quantity ?? pn.jumlah ?? 0),
              berat_panen: Number(pn.berat_panen ?? pn.berat_total_kg ?? pn.total_weight ?? pn.berat ?? 0),
              kondisi_hasil_panen: pn.kondisi_hasil_panen || pn.kualitas || pn.quality || "Baik",
            } : null;

            const isPanen = panenObj !== null;

            return {
              id: b.id_pengelolaan || b.id,
              kode_pengelolaan: b.kode_pengelolaan || b.batch_code || "-",
              tanggal_tanam: b.tanggal_tanam || b.seed_date,
              jumlah_tanaman: Number(b.jumlah_tanaman || b.plant_quantity || 0),
              lokasi: b.lokasi || b.location || "-",
              kondisi_tanaman: b.kondisi_tanaman || "-",
              kondisi_air_nutrisi: b.kondisi_air_nutrisi || "-",
              kondisi_instalasi: b.kondisi_instalasi || "-",
              kondisi_lingkungan: b.kondisi_lingkungan || "-",
              nilai_ph: b.nilai_ph,
              catatan: b.catatan || "",
              status: isPanen ? "Sudah Dipanen" : "Normal",
              fase: mappedFase,
              panen: panenObj,
            };
          });
          return;
        }
      }
    } catch (e) {
      console.warn("[RIWAYAT BUDIDAYA] Gagal ambil data backend, menggunakan lokal:", e);
    }
  }

  // Fallback ke localStorage budidaya jika ada
  try {
    const rawLocal = localStorage.getItem("mock_budidaya_v2");
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (Array.isArray(parsed) && parsed.length > 0) {
        data = parsed.map((b) => ({
          id: b.id_budidaya || b.id,
          kode_pengelolaan: b.kode_pengelolaan || "-",
          tanggal_tanam: b.tanggal_tanam,
          jumlah_tanaman: b.jumlah_tanaman,
          lokasi: b.lokasi || "-",
          kondisi_tanaman: b.kondisi_tanaman || "-",
          kondisi_air_nutrisi: b.kondisi_air_nutrisi || "-",
          kondisi_instalasi: b.kondisi_instalasi || "-",
          kondisi_lingkungan: b.kondisi_lingkungan || "-",
          nilai_ph: b.nilai_ph,
          catatan: b.catatan || "",
          status: b.status || "Normal",
          fase: b.fase || [{ id_fase: 1, tanggal_mulai: b.tanggal_tanam }],
          panen: b.panen && b.panen.length ? b.panen[0] : null,
        }));
      }
    }
  } catch (_) {}
}

// ---------- Turunan data ----------
const faseAktif = (b) => (b && Array.isArray(b.fase) && b.fase.length ? b.fase[b.fase.length - 1] : { id_fase: 1 });
const urutanAktif = (b) => Number(faseAktif(b)?.id_fase || 1);
const faseNext = (b) => (urutanAktif(b) < 4 ? urutanAktif(b) + 1 : null);
const batasUmur = (b) => ({ 1: UMUR_SEMAI, 2: UMUR_PEREMAJAAN, 3: umurPanen(b) })[urutanAktif(b)] ?? null;
const perkiraan = (b) => (b?.tanggal_tanam && faseNext(b) && batasUmur(b) !== null ? addDays(b.tanggal_tanam, batasUmur(b)) : null);
const sisaHari = (b) => { const p = perkiraan(b); return p ? Math.max(0, Math.round((toDate(p) - today()) / MS_HARI)) : null; };
const lokasiTujuan = (b) => faseAktif(b)?.lokasi_tujuan || "-";
const selesai = (b) => b.status === "Sudah Dipanen" || !!b.panen;

// ---------- Tampilan umum ----------
const BAGIAN = ["list", "detail", "t-list", "t-detail"];
function showOnly(name) {
  BAGIAN.forEach((id) => show(id, id === name));
  show("loading", false);
  show("tabs", name === "list" || name === "t-list"); // tab disembunyikan saat melihat detail
}

function fillFacts(id, items) {
  const dl = $(id);
  dl.replaceChildren();
  items.forEach(([label, value, opsi]) => {
    const kelas = opsi === true ? "wide" : opsi || "";
    const d = el("div", undefined, kelas);
    const dd = el("dd");
    if (value instanceof Node) dd.appendChild(value); else dd.textContent = value;
    d.append(el("dt", label), dd);
    dl.appendChild(d);
  });
}

// ---------- Riwayat Budidaya: daftar batch ----------
let filter = "semua";
let kataCari = "";

function cardBatch(b) {
  const card = el("article", undefined, "r-card");

  const top = el("div", undefined, "r-top");
  const judul = el("div");
  judul.append(
    el("h2", b.kode_pengelolaan, "r-title"),
    el("p", `${b.lokasi || "-"} · Tanam ${fmtTanggal(b.tanggal_tanam)}`, "r-meta")
  );
  const isDone = selesai(b);
  const badge = el("span", isDone ? "Selesai" : "Berjalan", "r-badge " + (isDone ? "done" : "run"));
  top.append(judul, badge);

  // Timeline hanya menampilkan Semai (dari tanggal tanam) dan Panen (dari data panen)
  const line = el("ul", undefined, "r-line");
  const liSemai = el("li");
  liSemai.append(
    el("span", b.tanggal_tanam ? fmtPendek(b.tanggal_tanam) : "-", "tgl"),
    document.createTextNode("Semai")
  );
  line.appendChild(liSemai);

  const liPanen = el("li");
  const tglPanen = b.panen ? (b.panen.tanggal_panen || b.panen.created_at) : null;
  liPanen.append(
    el("span", tglPanen ? fmtPendek(tglPanen) : "Belum panen", "tgl"),
    document.createTextNode("Panen")
  );
  line.appendChild(liPanen);

  const foot = el("div", undefined, "r-foot");
  const berat = b.panen ? Number(b.panen.berat_panen ?? b.panen.berat_total_kg ?? 0) : 0;
  foot.appendChild(el("span", b.panen ? `Hasil panen ${fmtAngka(berat, 2)} kg` : "Belum panen", "r-hasil"));

  const btn = el("button", "Lihat detail", "r-detail");
  btn.type = "button";
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    showDetail(b.id);
  });
  foot.appendChild(btn);

  card.append(top, line, foot);
  return card;
}

function renderList() {
  const q = kataCari.trim().toLowerCase();
  const tampil = data.filter((b) =>
    (filter === "semua" || (filter === "selesai") === selesai(b)) &&
    b.kode_pengelolaan.toLowerCase().includes(q)
  );

  const grid = $("grid");
  grid.replaceChildren(...tampil.map(cardBatch));

  const kosong = $("empty");
  kosong.hidden = tampil.length > 0;
  if (tampil.length === 0) {
    kosong.textContent = data.length === 0 ? "Belum Ada Riwayat Budidaya" : "Tidak ada batch yang cocok.";
  }
}

function showList() {
  showOnly("list");
  renderList();
}

// ---------- Riwayat Budidaya: detail batch ----------
function showDetail(id) {
  const b = data.find((x) => String(x.id) === String(id));
  if (!b) return showList();
  const nx = faseNext(b), sisa = sisaHari(b);

  $("dt-kode").textContent = b.kode_pengelolaan;
  const st = $("dt-status");
  st.textContent = b.status;
  st.className = STATUS_CLASS[b.status] || "badge";

  fillFacts("f-budidaya", [
    ["Kode pengelolaan", b.kode_pengelolaan],
    ["Tanggal tanam", fmtTanggal(b.tanggal_tanam)],
    ["Jumlah tanaman", b.jumlah_tanaman + " tanaman"],
    ["Lokasi", b.lokasi || "-"],
    ["Nilai pH", b.nilai_ph === undefined || b.nilai_ph === null ? "-" : fmtAngka(b.nilai_ph)],
    ["Kondisi tanaman", b.kondisi_tanaman || "-", true],
    ["Nilai PPM", b.kondisi_air_nutrisi ? (String(b.kondisi_air_nutrisi).toLowerCase().includes("ppm") ? b.kondisi_air_nutrisi : b.kondisi_air_nutrisi + " ppm") : "-", true],
    ["Kondisi instalasi", b.kondisi_instalasi || "-", true],
    ["Kondisi lingkungan", b.kondisi_lingkungan || "-", true],
    ["Catatan", b.catatan || "-", true],
  ]);

  fillFacts("f-fase", [
    ["Fase berikutnya", nx ? NAMA_FASE[nx] : "-"],
    ["Perkiraan waktu perpindahan", fmtTanggal(perkiraan(b))],
    ["Sisa waktu menuju perpindahan", sisa === null ? "-" : sisa + " hari"],
    ["Lokasi/meja tujuan", lokasiTujuan(b)],
    ["Status budidaya", b.status],
  ]);

  const rows = $("hist-rows");
  rows.replaceChildren();
  const tanam = b.tanggal_tanam;
  const umur = daysBetween(tanam);
  const fList = [];

  // 1. Fase Semai (awal s/d 14 hari)
  const tglSelesaiSemai = addDays(tanam, 14);
  const lewatSemai = umur >= 14;
  fList.push({
    urutan: 1,
    nama: "Semai",
    mulai: tanam,
    selesai: lewatSemai ? tglSelesaiSemai : "",
    lama: lewatSemai ? "14 hari (awal s/d 14 hari)" : `${Math.max(1, umur)} hari (target 14 hari)`,
  });

  // 2. Fase Peremajaan (hari ke-15 s/d 21)
  if (umur >= 14) {
    const tglMulaiPeremajaan = tglSelesaiSemai;
    const tglSelesaiPeremajaan = addDays(tanam, 21);
    const lewatPeremajaan = umur >= 21;
    fList.push({
      urutan: 2,
      nama: "Peremajaan",
      mulai: tglMulaiPeremajaan,
      selesai: lewatPeremajaan ? tglSelesaiPeremajaan : "",
      lama: lewatPeremajaan ? "Sampai 21 hari (hari ke-15 s/d 21)" : `Hari ke-${umur} (target sampai 21 hari)`,
    });
  }

  // 3. Fase Pendewasaan (hari ke-22 s/d panen 45-55 hari)
  if (umur >= 21) {
    const tglMulaiPendewasaan = addDays(tanam, 21);
    const tglPanen = b.panen?.tanggal_panen || "";
    let lamaPendewasaan;
    if (tglPanen) {
      const hariPendewasaan = Math.max(1, selisih(toDate(tglMulaiPendewasaan), toDate(tglPanen)));
      lamaPendewasaan = `${hariPendewasaan} hari (panen umur ${hariPendewasaan + 21} hari)`;
    } else {
      lamaPendewasaan = `Hari ke-${umur} (panen 45 - 55 hari menyesuaikan AI)`;
    }
    fList.push({
      urutan: 3,
      nama: "Pendewasaan",
      mulai: tglMulaiPendewasaan,
      selesai: tglPanen ? tglPanen : "",
      lama: lamaPendewasaan,
    });
  }

  fList.forEach((h) => {
    const tr = el("tr");
    tr.append(
      el("td", String(h.urutan)),
      el("td", h.nama),
      el("td", fmtTanggal(h.mulai)),
      el("td", h.selesai ? fmtTanggal(h.selesai) : "Berjalan"),
      el("td", h.lama)
    );
    rows.appendChild(tr);
  });

  const p = b.panen;
  show("panen-kosong", !p);
  fillFacts("f-panen", p ? [
    ["Kode panen", p.kode_panen],
    ["Tanggal panen", fmtTanggal(p.tanggal_panen)],
    ["Jumlah panen", p.jumlah_panen + " tanaman"],
    ["Berat panen", fmtAngka(p.berat_panen) + " kg"],
    ["Kondisi hasil panen", p.kondisi_hasil_panen],
  ] : []);

  showOnly("detail");
  window.scrollTo({ top: 0 });
}

// =====================================================================
// ---------- Riwayat Transaksi (UC29) ----------
// =====================================================================
// Integrasi backend (otomatis aktif jika USE_MOCK = false di config.js)
const PAKAI_BE = typeof USE_MOCK !== "undefined" ? !USE_MOCK : true;
const DEMO = new URLSearchParams(location.search).get("demo");
const OFFLINE = !PAKAI_BE || DEMO === "contoh" || DEMO === "kosong";
const TX_PATH = (typeof ENDPOINTS !== "undefined" && ENDPOINTS.riwayatTransaksi) || "/cultivator/orders";
// Endpoint saat PAKAI_BE = true (sesuaikan dengan routes/api.php):
//   GET {TX_PATH}        daftar riwayat transaksi
//   GET {TX_PATH}/{id}   detail riwayat transaksi

function mapOrderToTx(p) {
  if (!p) return {};
  const item = (p.detail_pesanan && p.detail_pesanan[0]) || (p.items && p.items[0]) || {};
  const jml = Number(item.jumlah || p.jumlah_produk || 1);
  const harga = Number(item.harga_satuan || p.harga_produk || 15000);
  const total = Number(p.total_pembayaran || p.total_harga || (jml * harga));
  const bayar = p.pembayaran?.status_pembayaran || p.status_pembayaran || "Belum Dibayar";
  return {
    id_pesanan: p.id_pesanan || p.id,
    kode_batch: p.kode_batch || "BATCH-2026-001",
    nomor_pesanan: p.nomor_pesanan || ("ORD-" + String(p.id_pesanan || p.id).padStart(3, "0")),
    tanggal_pesanan: p.tanggal_pesanan,
    nama_pembeli: p.nama_pembeli || p.pembeli?.nama || p.buyer?.name || "-",
    nama_produk: item.nama_produk || p.nama_produk || "Selada Hijau Segar",
    jumlah_produk: jml,
    harga_produk: harga,
    subtotal_produk: Number(item.subtotal || (jml * harga)),
    total_pembayaran: total,
    metode_pembayaran: p.metode_pembayaran || "-",
    status_pembayaran: bayar,
    status_pesanan: p.status_pesanan || "-",
    tanggal_pembayaran: p.pembayaran?.waktu_pembayaran || (bayar === "Lunas" || bayar === "Sudah Dibayar" ? p.tanggal_pesanan : null),
  };
}

const rupiah = (v) => {
  const n = Number(v);
  if (v === null || v === undefined || v === "" || Number.isNaN(n)) return "-";
  return "Rp " + n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};
const kg = (v) => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || Number.isNaN(n) ? "-" : n.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + " kg";
};
function fmtWaktu(v, kosong = "-") {
  if (!v) return kosong;
  const d = new Date(String(v).replace(" ", "T"));
  if (isNaN(d)) return String(v);
  const tgl = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  return tgl + ", " + jam;
}
const idTx = (p) => p.id_pesanan ?? p.id_transaksi ?? p.id;

const norm = (s) => String(s || "").toLowerCase().replace(/_/g, " ").trim();
function badgeTx(status) {
  switch (norm(status)) {
    case "menunggu pembayaran":
    case "belum dibayar":
    case "pending":        return "badge perlu";
    case "diproses":
    case "processing":     return "badge pindah";
    case "dikirim":
    case "shipped":        return "badge panen";
    case "dibatalkan":
    case "cancelled":
    case "canceled":       return "badge batal";
    default:               return "badge"; // Selesai, Lunas, dan lainnya
  }
}
const badgeNode = (teks) => el("span", teks || "-", badgeTx(teks));

function contohTx() {
  const t = (hari) => new Date(Date.now() - hari * 86400000).toISOString().slice(0, 19).replace("T", " ");
  const baris = (id, kode, no, hari, pembeli, produk, jml, harga, metode, bayar, status) => ({
    id_pesanan: id, kode_batch: kode, nomor_pesanan: no, tanggal_pesanan: t(hari), nama_pembeli: pembeli,
    nama_produk: produk, jumlah_produk: jml, harga_produk: harga,
    subtotal_produk: (jml * harga).toFixed(2), total_pembayaran: (jml * harga).toFixed(2),
    metode_pembayaran: metode, status_pembayaran: bayar, status_pesanan: status,
    tanggal_pembayaran: bayar === "Lunas" ? t(hari - 0.05) : null,
  });
  return [
    baris(9, "SLD-001", "ORD-20261020-009", 5,  "Rina Wulandari", "Selada Hijau Segar", 3, 15000, "Transfer Bank", "Lunas",         "Selesai"),
    baris(8, "SLD-002", "ORD-20261016-008", 9,  "Budi Santoso",   "Selada Hijau Segar", 8, 15000, "QRIS",          "Lunas",         "Selesai"),
    baris(7, "SLD-001", "ORD-20261012-007", 13, "Siti Aminah",    "Selada Hijau Segar", 5, 15000, "E-Wallet",      "Lunas",         "Selesai"),
    baris(6, "SLD-003", "ORD-20261008-006", 17, "Agus Pratama",   "Selada Hijau Segar", 2, 15000, "COD",           "Lunas",         "Selesai"),
    baris(5, "SLD-002", "ORD-20261003-005", 22, "Dewi Lestari",   "Selada Hijau Segar", 4, 15000, "Transfer Bank", "Belum Dibayar", "Dibatalkan"),
  ];
}

let tx = [];
let txMuat = false; // daftar transaksi baru diambil saat tab pertama kali dibuka

async function fetchTx() {
  if (DEMO === "kosong") return [];
  if (OFFLINE) {
    await new Promise((r) => setTimeout(r, 300));
    return contohTx();
  }
  try {
    const res = await apiFetch(TX_PATH + "?per_page=100");
    if (!res) return []; // 401 -> sudah logout otomatis
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.data?.data || json.data || []);
    return list.map(mapOrderToTx);
  } catch (err) {
    console.warn("[RIWAYAT TX] Gagal fetch dari BE, fallback contoh:", err);
    return contohTx();
  }
}
async function fetchDetailTx(id) {
  if (OFFLINE) {
    await new Promise((r) => setTimeout(r, 200));
    return tx.find((p) => idTx(p) === id) || null;
  }
  try {
    const res = await apiFetch(TX_PATH + "/" + encodeURIComponent(id));
    if (!res) return null;
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const d = json.data ?? json;
    return mapOrderToTx(d);
  } catch (err) {
    return tx.find((p) => idTx(p) === id) || null;
  }
}

function renderTx() {
  showOnly("t-list");
  if (!tx.length) {
    show("tx-wrap", false);
    show("tx-empty", !txGagal); // "Belum Ada Riwayat Transaksi"
    return;
  }
  show("tx-empty", false);
  show("tx-wrap", true);
  $("tx-info").textContent = tx.length + " transaksi";

  const urut = tx.slice().sort((a, b) => String(b.tanggal_pesanan).localeCompare(String(a.tanggal_pesanan)));
  const rows = $("tx-rows");
  rows.replaceChildren();
  urut.forEach((p) => {
    const tdNomor = el("td");
    const link = el("button", p.nomor_pesanan || "-", "link-nomor");
    link.type = "button";
    link.setAttribute("aria-label", "Lihat detail riwayat transaksi " + (p.nomor_pesanan || ""));
    link.addEventListener("click", () => bukaDetailTx(idTx(p)));
    tdNomor.appendChild(link);

    const tdBayar = el("td"); tdBayar.appendChild(badgeNode(p.status_pembayaran));
    const tdStatus = el("td"); tdStatus.appendChild(badgeNode(p.status_pesanan));

    const tr = el("tr");
    tr.append(
      el("td", p.kode_batch || "-"),
      tdNomor,
      el("td", fmtWaktu(p.tanggal_pesanan)),
      el("td", p.nama_pembeli || "-"),
      el("td", rupiah(p.total_pembayaran), "num"),
      el("td", p.metode_pembayaran || "-"),
      tdBayar,
      tdStatus
    );
    rows.appendChild(tr);
  });
}

let txGagal = false;
async function bukaTabTransaksi() {
  show("alert", false);
  if (txMuat) return renderTx();

  BAGIAN.forEach((id) => show(id, false));
  show("tabs", true);
  show("loading", true);
  txGagal = false;
  try {
    tx = await fetchTx();
    txMuat = true;
  } catch (err) {
    tx = [];
    txGagal = true;
    showAlert("Riwayat transaksi belum bisa dimuat (" + err.message + "). Pastikan BE sudah jalan dan path endpoint riwayat transaksi sudah benar di config.js.");
  }
  renderTx();
}

async function bukaDetailTx(id) {
  show("alert", false);
  BAGIAN.forEach((x) => show(x, false));
  show("tabs", false);
  show("loading", true);
  try {
    const p = await fetchDetailTx(id);
    if (!p) { renderTx(); return showAlert("Riwayat transaksi tidak ditemukan."); }
    renderDetailTx(p);
  } catch (err) {
    renderTx();
    showAlert("Detail riwayat transaksi belum bisa dimuat (" + err.message + ").");
  }
}

function renderDetailTx(p) {
  showOnly("t-detail");
  $("tx-nomor").textContent = p.nomor_pesanan || "-";
  const b = $("tx-badge");
  b.textContent = p.status_pesanan || "-";
  b.className = badgeTx(p.status_pesanan);

  fillFacts("tx-facts", [
    ["Nomor pesanan", p.nomor_pesanan || "-"],
    ["Tanggal pesanan", fmtWaktu(p.tanggal_pesanan)],
    ["Nama pembeli", p.nama_pembeli || "-"],
    ["Nama produk", p.nama_produk || "-"],
    ["Jumlah produk", kg(p.jumlah_produk)],
    ["Harga produk", rupiah(p.harga_produk)],
    ["Subtotal produk", rupiah(p.subtotal_produk)],
    ["Total pembayaran", rupiah(p.total_pembayaran), "total"],
    ["Metode pembayaran", p.metode_pembayaran || "-"],
    ["Status pembayaran", badgeNode(p.status_pembayaran)],
    ["Status pesanan", badgeNode(p.status_pesanan)],
    ["Tanggal pembayaran", fmtWaktu(p.tanggal_pembayaran, "Belum dibayar")],
  ]);
  $("tx-nomor").focus();
}

// ---------- Tab ----------
function pilihTab(nama) {
  const tr = nama === "transaksi";
  $("tab-transaksi").setAttribute("aria-selected", String(tr));
  $("tab-budidaya").setAttribute("aria-selected", String(!tr));
  $("tab-transaksi").tabIndex = tr ? 0 : -1;
  $("tab-budidaya").tabIndex = tr ? -1 : 0;
  if (tr) bukaTabTransaksi();
  else { show("alert", false); showList(); }
}
const tabAktif = () => ($("tab-transaksi").getAttribute("aria-selected") === "true" ? "transaksi" : "budidaya");

$("tab-transaksi").addEventListener("click", () => pilihTab("transaksi"));
$("tab-budidaya").addEventListener("click", () => pilihTab("budidaya"));
$("tabs").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const ke = tabAktif() === "transaksi" ? "budidaya" : "transaksi";
  pilihTab(ke);
  $("tab-" + ke).focus();
});

// ---------- Aksi ----------
$("cari").addEventListener("input", (e) => { kataCari = e.target.value; renderList(); });
document.querySelectorAll(".r-chip").forEach((c) => {
  c.addEventListener("click", () => {
    filter = c.dataset.filter;
    document.querySelectorAll(".r-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    renderList();
  });
});
$("btn-back-list").addEventListener("click", showList);
$("btn-back-tx").addEventListener("click", renderTx);
$("btn-logout").addEventListener("click", logout);

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}
  await loadBudidayaFromBackend();
  // riwayat.html?tab=transaksi langsung membuka tab Riwayat Transaksi
  pilihTab(new URLSearchParams(location.search).get("tab") === "transaksi" ? "transaksi" : "budidaya");
})();