// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
function showAlert(id, message) { $(id).textContent = message; show(id); }
function hideAlert(id) { show(id, false); }
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

const MS_HARI = 86400000;
const MSG_FORMAT = "Format data tidak sesuai";
const MSG_LENGKAP = "Data perlu dilengkapi";

const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const isoDaysAgo = (n) => { const d = today(); d.setDate(d.getDate() - n); return iso(d); };
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
const selisih = (a, b) => Math.max(0, Math.round((b - a) / MS_HARI));
const daysBetween = (s) => selisih(toDate(s), today());
const fmtTanggal = (s) => (s ? toDate(s).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-");
const fmtAngka = (n, d = 2) => Number(n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- Aturan status (TEBAKAN, ubah angkanya di sini) ----------
// UC6 dan UC8 tidak punya field status di form, jadi status dihitung otomatis.
const PH_MIN = 5.5, PH_MAX = 6.5;   // di luar rentang ini -> "Perlu Diperhatikan"
const BATAS_HARI_PINDAH = 2;        // sisa <= 2 hari -> "Mendekati Perpindahan Fase" / "Mendekati Panen"

// ---------- Data (data palsu dulu; sambungkan ke BE nanti) ----------
// Rotasi: Semai 14 hari -> Peremajaan s/d 21 hari -> Pendewasaan -> Panen 45-55 hari
const FASE = [
  { id_fase: 1, nama_fase: "Semai", urutan_fase: 1, durasi: 14, meja: "Meja Semai", rentang: "1 - 14 hari" },              // sampai umur 14 hari
  { id_fase: 2, nama_fase: "Peremajaan", urutan_fase: 2, durasi: 7, meja: "Meja Peremajaan", rentang: "15 - 21 hari" },      // pindah hari ke-15, sampai umur 21 hari
  { id_fase: 3, nama_fase: "Pendewasaan", urutan_fase: 3, durasi: 24, meja: "Meja Pendewasaan", rentang: "22 - 45/55 hari" },   // sampai panen fleksibel 45-55 hari
  { id_fase: 4, nama_fase: "Panen", urutan_fase: 4, durasi: 10, meja: "Meja Panen", rentang: "45 - 55 hari (Fleksibel Pasar/AI)" },
];
const faseById = (id) => FASE.find((f) => f.id_fase === Number(id));

// Helper: Auto-generate kode batch dengan format konsisten SLD-xxx (contoh: SLD-001, SLD-002, dst)
function generateBatchCode() {
  let maxNum = 0;
  if (data && Array.isArray(data)) {
    data.forEach((b) => {
      const kode = String(b.kode_pengelolaan || b.batch_code || "").trim();
      const match = kode.match(/SLD[-_]?(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
  }
  const nextNum = maxNum + 1;
  return `SLD-${String(nextNum).padStart(3, "0")}`;
}

// Helper: Ambil data suhu real-time dari API Cuaca publik (Open-Meteo)
// Lokasi: Sepasang Petani farm (Kebonsari, Sumbersari, Jember) [RM6X+MM5]
async function fetchCurrentTemperature() {
  const lat = (typeof FARM_LOCATION !== "undefined" && FARM_LOCATION.latitude) ? FARM_LOCATION.latitude : -8.1883;
  const lon = (typeof FARM_LOCATION !== "undefined" && FARM_LOCATION.longitude) ? FARM_LOCATION.longitude : 113.6992;
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`);
    if (!res.ok) throw new Error("Gagal mengambil data cuaca");
    const json = await res.json();
    return {
      temp: json.current?.temperature_2m ?? 24.5,
      humidity: json.current?.relative_humidity_2m ?? 70,
    };
  } catch (e) {
    console.warn("[API CUACA JEMBER] Menggunakan suhu default hidroponik:", e);
    return { temp: 24.5, humidity: 70 };
  }
}

async function applyApiSuhu() {
  const btn = $("btn-api-suhu");
  if (btn) { btn.disabled = true; btn.textContent = "Mengambil..."; }
  try {
    const w = await fetchCurrentTemperature();
    if (w && w.temp !== undefined) {
      const fSuhu = $("f-suhu");
      if (fSuhu) fSuhu.value = w.temp;
      const fLingkungan = $("f-lingkungan");
      if (fLingkungan) {
        const textLingkungan = fLingkungan.value.trim();
        const suhuStr = `Suhu ${w.temp}°C, Kelembaban ${w.humidity}%`;
        if (!textLingkungan) {
          fLingkungan.value = `${suhuStr}, DLI dan sirkulasi udara baik`;
        } else if (!textLingkungan.toLowerCase().includes("suhu")) {
          fLingkungan.value = `${suhuStr}. ${textLingkungan}`;
        }
      }
    }
  } catch (_) {
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "API Suhu"; }
  }
}
const STATUS_CLASS = {
  "Normal": "badge", "Perlu Diperhatikan": "badge perlu", "Mendekati Perpindahan Fase": "badge perlu",
  "Mendekati Panen": "badge panen", "Sudah Dipanen": "badge selesai",
};

const MOCK_KEY = "mock_budidaya_v2";   // dibaca juga oleh dashboard.js
const PANEN_KEY = "mock_panen_v1";     // dikelola panen.js

function seed() {
  return [
    {
      id_budidaya: 1, kode_pengelolaan: "SLD-005", tanggal_tanam: isoDaysAgo(11), jumlah_tanaman: 120,
      lokasi: "Meja Semai 1", kondisi_tanaman: "Daun hijau segar, pertumbuhan normal.",
      kondisi_air_nutrisi: "900 ppm", kondisi_instalasi: "Pompa dan selang normal.",
      kondisi_lingkungan: "Suhu 24.5 °C, kelembaban 65%.", nilai_ph: 6.0, catatan: "Varietas Selada Hijau Segar",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(11) }]
    },
    {
      id_budidaya: 2, kode_pengelolaan: "SLD-004", tanggal_tanam: isoDaysAgo(12), jumlah_tanaman: 100,
      lokasi: "Meja Semai 2", kondisi_tanaman: "Pertumbuhan seragam.",
      kondisi_air_nutrisi: "950 ppm", kondisi_instalasi: "Aliran NFT normal.",
      kondisi_lingkungan: "Suhu 25.0 °C, kelembaban 68%.", nilai_ph: 6.2, catatan: "",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(12) }]
    },
    {
      id_budidaya: 3, kode_pengelolaan: "SLD-003", tanggal_tanam: isoDaysAgo(13), jumlah_tanaman: 110,
      lokasi: "Meja Semai 1", kondisi_tanaman: "Daun sejati 4 helai, sangat sehat.",
      kondisi_air_nutrisi: "920 ppm", kondisi_instalasi: "Semua instalasi normal.",
      kondisi_lingkungan: "Suhu 24.0 °C.", nilai_ph: 6.1, catatan: "",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(13) }]
    },
    {
      id_budidaya: 4, kode_pengelolaan: "SLD-002", tanggal_tanam: isoDaysAgo(14), jumlah_tanaman: 90,
      lokasi: "Meja Semai 3", kondisi_tanaman: "Siap pindah meja peremajaan.",
      kondisi_air_nutrisi: "1000 ppm", kondisi_instalasi: "Normal.",
      kondisi_lingkungan: "Suhu 24.5 °C.", nilai_ph: 6.3, catatan: "",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(14) }]
    },
    {
      id_budidaya: 5, kode_pengelolaan: "SLD-001", tanggal_tanam: isoDaysAgo(18), jumlah_tanaman: 150,
      lokasi: "Meja Peremajaan 1", kondisi_tanaman: "Klorofil pekat, tajuk berkembang baik.",
      kondisi_air_nutrisi: "1100 ppm", kondisi_instalasi: "Aerasi gelembung lancar.",
      kondisi_lingkungan: "Suhu 24.5 °C.", nilai_ph: 6.2, catatan: "Hari ke-4 di fase peremajaan",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(18), tanggal_selesai: isoDaysAgo(4) },
             { id_fase: 2, tanggal_mulai: isoDaysAgo(4), lokasi_tujuan: "Meja Peremajaan 1" }]
    },
    {
      id_budidaya: 6, kode_pengelolaan: "SLD-006", tanggal_tanam: isoDaysAgo(35), jumlah_tanaman: 120,
      lokasi: "Meja Pendewasaan 1", kondisi_tanaman: "Daun lebat, masuk pembesaran akhir.",
      kondisi_air_nutrisi: "1250 ppm", kondisi_instalasi: "Aliran NFT optimal.",
      kondisi_lingkungan: "Suhu 24.0 °C.", nilai_ph: 6.2, catatan: "Masa pendewasaan",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(35), tanggal_selesai: isoDaysAgo(21) },
             { id_fase: 2, tanggal_mulai: isoDaysAgo(21), tanggal_selesai: isoDaysAgo(14) },
             { id_fase: 3, tanggal_mulai: isoDaysAgo(14), lokasi_tujuan: "Meja Pendewasaan 1" }]
    },
  ];
}
const load = (key, fallback) => {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (_) { }
  return fallback;
};
const save = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { } };

let data = load(MOCK_KEY, null) || seed();
let panenList = load(PANEN_KEY, []);

// ---------- Turunan data & Siklus Otomatis ----------
const sudahPanen = (b) => (Array.isArray(b.panen) && b.panen.length > 0) || (b.panen && b.panen.id_panen) || panenList.some((p) => p.id_budidaya === b.id_budidaya);
const phDiLuar = (b) => Number(b.nilai_ph) < PH_MIN || Number(b.nilai_ph) > PH_MAX;

function hitungStatus(b) {
  if (sudahPanen(b)) return "Sudah Dipanen";
  if (phDiLuar(b)) return "Perlu Diperhatikan";
  const umur = daysBetween(b.tanggal_tanam);
  if (umur >= 45) return "Mendekati Panen";
  if ((umur >= 12 && umur <= 14) || (umur >= 19 && umur <= 21)) return "Mendekati Perpindahan Fase";
  return "Normal";
}

function persist() {
  data.forEach((b) => { b.status = hitungStatus(b); });
  save(MOCK_KEY, data);
}

// ── Logika Pengingat Perpindahan Fase Sesuai Permintaan ──
// Semai: awal s/d 14 hari → pindah ke Peremajaan
// Peremajaan: hari ke-15 s/d 21 → pindah ke Pendewasaan
// Pendewasaan: hari ke-22 s/d panen (45-55 hari, menyesuaikan AI)
function getPengingatFase(b) {
  if (!b || !b.tanggal_tanam) return null;
  if (sudahPanen(b)) return null;
  const umur = daysBetween(b.tanggal_tanam);
  const kode = b.kode_pengelolaan || "-";

  // 1. Fase Semai (awal s/d 14 hari) → pindah ke Peremajaan
  if (umur <= 14) {
    const sisa = 14 - umur;
    if (sisa === 3) {
      return `H-3: Batch ${kode}: 3 hari lagi waktunya pindah dari fase Semai ke Peremajaan (durasi 14 hari).`;
    } else if (sisa === 2) {
      return `H-2: Batch ${kode}: 2 hari lagi waktunya pindah ke fase Peremajaan (durasi 14 hari).`;
    } else if (sisa === 1) {
      return `H-1: Batch ${kode}: Besok waktunya pindah ke fase Peremajaan (durasi 14 hari).`;
    } else if (sisa === 0) {
      return `H: Batch ${kode}: Hari ini waktunya pindah ke fase Peremajaan (durasi 14 hari).`;
    }
    return null;
  }

  // 2. Fase Peremajaan (hari ke-15 s/d 21) → pindah ke Pendewasaan
  if (umur <= 21) {
    const sisa = 21 - umur;
    if (sisa === 3) {
      return `H-3: Batch ${kode}: 3 hari lagi waktunya pindah ke fase Pendewasaan (sampai 21 hari).`;
    } else if (sisa === 2) {
      return `H-2: Batch ${kode}: 2 hari lagi waktunya pindah ke fase Pendewasaan (sampai 21 hari).`;
    } else if (sisa === 1) {
      return `H-1: Batch ${kode}: Besok waktunya pindah ke fase Pendewasaan (sampai 21 hari).`;
    } else if (sisa === 0) {
      return `H: Batch ${kode}: Hari ini waktunya pindah ke fase Pendewasaan (sampai 21 hari).`;
    }
    return null;
  }

  // 3. Fase Pendewasaan → menuju Panen (45-55 hari menyesuaikan AI)
  const sisaPanen = 45 - umur;
  if (sisaPanen === 3) {
    return `${kode}: 3 hari lagi estimasi masuk masa panen.`;
  } else if (sisaPanen === 2) {
    return `${kode}: 2 hari lagi estimasi masuk masa panen.`;
  } else if (sisaPanen === 1) {
    return `${kode}: Besok estimasi masuk masa panen.`;
  } else if (umur >= 45 && umur <= 55) {
    return `${kode}: Sudah masuk masa panen.`;
  } else if (umur > 55) {
    return `${kode}: Sudah melewati 55 hari, segera lakukan panen.`;
  }
  return null;
}

// ── Logika Riwayat Perpindahan Fase Otomatis (3 Fase Bertahap) ──
// Semai: awal s/d 14 hari | Peremajaan: hari ke-15 s/d 21 | Pendewasaan: hari ke-22 s/d panen (45-55 hari)
// Kolom "Lama" dibuat tetap: Semai = 14 hari, Peremajaan = 7 hari, Pendewasaan = 24 hari
function getFaseOtomatisList(b) {
  if (!b || !b.tanggal_tanam) return [];
  const tanam = b.tanggal_tanam;
  const umur = daysBetween(tanam);
  const list = [];

  // 1. Fase Semai (awal s/d 14 hari)
  const tglSelesaiSemai = addDays(tanam, 14);
  const sudahLewatSemai = umur >= 14;

  list.push({
    urutan: 1,
    nama_fase: "Semai",
    tanggal_mulai: tanam,
    tanggal_selesai: sudahLewatSemai ? tglSelesaiSemai : "",
    lama: "14 hari",
  });

  // 2. Fase Peremajaan (hari ke-15 s/d 21) — muncul bertahap jika umur >= 14
  if (umur >= 14) {
    const tglMulaiPeremajaan = tglSelesaiSemai;
    const tglSelesaiPeremajaan = addDays(tanam, 21);
    const sudahLewatPeremajaan = umur >= 21;

    list.push({
      urutan: 2,
      nama_fase: "Peremajaan",
      tanggal_mulai: tglMulaiPeremajaan,
      tanggal_selesai: sudahLewatPeremajaan ? tglSelesaiPeremajaan : "",
      lama: "7 hari",
    });
  }

  // 3. Fase Pendewasaan (hari ke-22 s/d panen 45-55 hari) — muncul bertahap jika umur >= 21
  if (umur >= 21) {
    const tglMulaiPendewasaan = addDays(tanam, 21);
    const hasPanen = panenList.find((p) => p.id_budidaya === b.id_budidaya) || (Array.isArray(b.panen) && b.panen.length ? b.panen[0] : null);
    const tglPanen = hasPanen?.tanggal_panen || (hasPanen?.harvest_date ? hasPanen.harvest_date.slice(0, 10) : "");

    list.push({
      urutan: 3,
      nama_fase: "Pendewasaan",
      tanggal_mulai: tglMulaiPendewasaan,
      tanggal_selesai: tglPanen ? tglPanen : "",
      lama: "24 hari",
    });
  }

  return list;
}

// ---------- Integrasi API Backend ----------
async function loadDataFromBackend() {
  if (USE_MOCK) return;
  try {
    const res = await apiFetch(ENDPOINTS.budidaya + "?per_page=100");
    if (!res || !res.ok) return;
    const json = await res.json();
    const rawBatches = Array.isArray(json.data) ? json.data : (json.data?.data || []);

    data = rawBatches.map((b) => {
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
          catatan: "Fase awal"
        });
      }

      return {
        id_budidaya: b.id_pengelolaan || b.id,
        kode_pengelolaan: b.kode_pengelolaan || b.batch_code || "-",
        tanggal_tanam: b.tanggal_tanam || b.seed_date,
        jumlah_tanaman: b.jumlah_tanaman || b.plant_quantity || 0,
        lokasi: b.lokasi || b.location || "",
        nilai_ph: b.nilai_ph,
        kondisi_tanaman: b.kondisi_tanaman || "",
        kondisi_air_nutrisi: b.kondisi_air_nutrisi || "",
        kondisi_instalasi: b.kondisi_instalasi || "",
        kondisi_lingkungan: b.kondisi_lingkungan || "",
        catatan: b.catatan || "",
        fase: mappedFase,
        panen: b.panen || [],
      };
    });
    persist();
  } catch (err) {
    console.error("[BUDIDAYA] Gagal memuat data dari API:", err);
  }
}

const badgeClass = (b) => STATUS_CLASS[hitungStatus(b)] || "badge";

let current = null;  // batch yang sedang dibuka
let mode = "add";    // "add" atau "edit"
let moveIdx = -1;
let hDel = -1;

// ---------- Tampilan ----------
function showOnly(name) { ["list", "detail", "form"].forEach((id) => show(id, id === name)); }
function notify(msg) { showAlert("notice", msg); $("notice").focus(); }

function setLoading(on) {
  show("loading", on);
}

// [BARU] Fase batch saat ini untuk kolom "Fase" di daftar
// (aturan umur sama dengan "Fase saat ini" di halaman detail)
function faseSaatIni(b) {
  if (!b.tanggal_tanam) return "-";
  const umur = daysBetween(b.tanggal_tanam);
  if (umur < 14) return "Semai";
  if (umur < 21) return "Peremajaan";
  return sudahPanen(b) ? "Panen" : "Pendewasaan";
}

// Halaman Daftar Batch Pengelolaan: kode_pengelolaan dan fase
function showList() {
  current = null;
  showOnly("list");
  $("list-info").textContent = data.length + " batch";
  $("empty").hidden = data.length > 0;

  const rows = $("rows");
  rows.replaceChildren();
  data.forEach((b) => {
    // Seluruh baris bisa diklik (bukan hanya teks kode pengelolaan)
    const tr = el("tr", undefined, "row-klik");
    tr.tabIndex = 0; // bisa difokus pakai keyboard
    tr.appendChild(el("td", b.kode_pengelolaan));

    // [UBAH] sebelumnya menampilkan badge status; sekarang fase batch
    const tdFase = el("td");
    tdFase.appendChild(el("span", faseSaatIni(b), "badge"));
    tr.appendChild(tdFase);

    const buka = () => showDetail(b.id_budidaya);
    tr.addEventListener("click", buka);
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); buka(); }
    });

    rows.appendChild(tr);
  });

  // Pengingat perpindahan fase otomatis sesuai format H-3 s/d H
  const reminders = [];
  data.forEach((b) => {
    const text = getPengingatFase(b);
    if (text) reminders.push(text);
  });

  show("reminder", reminders.length > 0);
  const ul = $("reminder-list");
  ul.replaceChildren();
  reminders.forEach((msg) => {
    ul.appendChild(el("li", msg));
  });
}

// Halaman Pengelolaan Data Budidaya (UC7)
function showDetail(id) {
  current = data.find((b) => b.id_budidaya === id);
  if (!current) return showList();

  const b = current;
  const umur = daysBetween(b.tanggal_tanam);
  const st = hitungStatus(b);

  $("dt-kode").textContent = b.kode_pengelolaan;

  $("dt-tanam").textContent = fmtTanggal(b.tanggal_tanam);
  $("dt-umur").textContent = umur + " hari";
  $("dt-jumlah").textContent = b.jumlah_tanaman + " tanaman";
  $("dt-lokasi").textContent = b.lokasi || "-";
  $("dt-ph").textContent = b.nilai_ph === undefined || b.nilai_ph === "" || b.nilai_ph === null ? "-" : fmtAngka(b.nilai_ph);

  const suhuMatch = String(b.kondisi_lingkungan || "").match(/(\d+(\.\d+)?)\s*°?C/i);
  const suhuVal = suhuMatch ? suhuMatch[1] + " °C" : (b.suhu ? b.suhu + " °C" : "24.5 °C (Optimal)");
  const dtSuhu = $("dt-suhu");
  if (dtSuhu) dtSuhu.textContent = suhuVal;

  $("dt-kondisi").textContent = b.kondisi_tanaman || "-";

  // Tampilkan Nilai PPM
  const airVal = b.kondisi_air_nutrisi 
    ? (String(b.kondisi_air_nutrisi).toLowerCase().includes("ppm") ? b.kondisi_air_nutrisi : b.kondisi_air_nutrisi + " ppm")
    : "-";
  $("dt-air").textContent = airVal;

  $("dt-instalasi").textContent = b.kondisi_instalasi || "-";
  $("dt-lingkungan").textContent = b.kondisi_lingkungan || "-";
  $("dt-catatan").textContent = b.catatan || "-";

  // Data fase otomatis — Semai: awal s/d 14 hari | Peremajaan: s/d 21 hari | Pendewasaan: s/d panen 45-55 hari
  let namaFase = "Semai";
  let nextFase = "Peremajaan";
  let perkiraanTgl = addDays(b.tanggal_tanam, 14);
  let sisaHari = Math.max(0, 14 - umur);
  let mejaTujuan = "Meja Peremajaan";

  if (umur >= 14 && umur < 21) {
    namaFase = "Peremajaan";
    nextFase = "Pendewasaan";
    perkiraanTgl = addDays(b.tanggal_tanam, 21);
    sisaHari = Math.max(0, 21 - umur);
    mejaTujuan = "Meja Pendewasaan";
  } else if (umur >= 21) {
    const isPanen = sudahPanen(b);
    namaFase = isPanen ? "Panen" : "Pendewasaan";
    nextFase = isPanen ? "-" : "Panen (45 - 55 hari menyesuaikan AI)";
    perkiraanTgl = addDays(b.tanggal_tanam, 45);
    sisaHari = isPanen ? 0 : Math.max(0, 45 - umur);
    mejaTujuan = isPanen ? "-" : "Meja Panen";
  }


  $("dt-dasar").replaceChildren(
    el("li", phDiLuar(b)
      ? `Nilai pH ${fmtAngka(b.nilai_ph)} di luar rentang ${fmtAngka(PH_MIN, 1)} sampai ${fmtAngka(PH_MAX, 1)}.`
      : `Nilai pH ${b.nilai_ph !== "" && b.nilai_ph !== null ? fmtAngka(b.nilai_ph) : "-"} masih dalam rentang normal.`),
    el("li", `Umur tanaman saat ini ${umur} hari (berada di fase ${namaFase}).`),
    el("li", nextFase !== "-" ? `Sisa waktu menuju fase ${nextFase}: ${sisaHari} hari.` : "Batch budidaya sudah dipanen."),
  );

  if ($("btn-move")) $("btn-move").hidden = true;
  ["confirm", "h-confirm", "move"].forEach((x) => show(x, false));
  ["h-alert", "move-alert"].forEach(hideAlert);
  renderHist();
  showOnly("detail");
}

// ---------- Riwayat perpindahan fase (Otomatis 3 Fase, tanpa Catatan & Aksi) ----------
function renderHist() {
  const rows = $("hist-rows");
  rows.replaceChildren();
  const fList = getFaseOtomatisList(current);
  fList.forEach((h) => {
    const tr = el("tr");
    tr.append(
      el("td", String(h.urutan)),
      el("td", h.nama_fase),
      el("td", fmtTanggal(h.tanggal_mulai)),
      el("td", h.tanggal_selesai ? fmtTanggal(h.tanggal_selesai) : "Berjalan"),
      el("td", h.lama)
    );
    rows.appendChild(tr);
  });
}

function openMove(idx) {
  if (!$("move")) return;
  moveIdx = idx;
  hideAlert("move-alert"); hideAlert("h-alert"); hideAlert("notice"); show("h-confirm", false);
  const h = idx >= 0 ? (current.fase?.[idx] || {}) : {};
  $("m-title").textContent = idx >= 0 ? "Ubah perpindahan fase" : "Tambah perpindahan fase";
  const sel = $("m-fase");
  sel.replaceChildren();
  FASE.forEach((f) => { const o = el("option", f.nama_fase); o.value = f.id_fase; sel.appendChild(o); });
  sel.value = idx >= 0 ? h.id_fase : (faseNext(current) || infoFase(current)).id_fase;
  $("m-tgl").value = h.tanggal_mulai || iso(today());
  $("m-selesai").value = h.tanggal_selesai || "";
  show("m-selesai-field", idx >= 0);
  $("m-lokasi").value = idx >= 0 ? (h.lokasi_tujuan || "") : faseById(Number(sel.value))?.meja ?? "";
  $("m-cat").value = h.catatan || "";
  show("move");
  sel.focus();
}

function askDelHist(i) {
  if (!$("h-confirm")) return;
  hDel = i;
  const namaFase = faseById(current.fase?.[i]?.id_fase)?.nama_fase ?? "fase";
  $("h-confirm-text").textContent = `Hapus riwayat fase ${namaFase}?`;
  show("h-confirm");
}

// ---------- Form tambah (UC6) / ubah (UC8) ----------
const fld = (id) => $(id).closest(".field");

function showForm(editing) {
  mode = editing ? "edit" : "add";
  hideAlert("form-alert");
  $("form-title").textContent = editing ? "Ubah data budidaya" : "Tambah budidaya";
  const b = editing ? current : {};

  $("f-kode").value = b.kode_pengelolaan || "";
  $("f-tanam").value = b.tanggal_tanam || iso(today());
  $("f-jumlah").value = b.jumlah_tanaman || "";
  $("f-lokasi").value = b.lokasi || "";
  $("f-ph").value = b.nilai_ph === undefined || b.nilai_ph === null ? "" : b.nilai_ph;
  $("f-kondisi").value = b.kondisi_tanaman || "";
  $("f-air").value = b.kondisi_air_nutrisi || "";
  $("f-instalasi").value = b.kondisi_instalasi || "";
  $("f-lingkungan").value = b.kondisi_lingkungan || "";
  $("f-catatan").value = b.catatan || "";

  const fSuhu = $("f-suhu");
  if (!editing) {
    if (!$("f-kode").value) {
      $("f-kode").value = generateBatchCode();
    }
    applyApiSuhu();
  } else {
    const suhuMatch = String(b.kondisi_lingkungan || "").match(/(\d+(\.\d+)?)\s*°?C/i);
    if (fSuhu) fSuhu.value = suhuMatch ? suhuMatch[1] : (b.suhu || "");
  }

  fld("f-kode").hidden = editing;
  fld("f-tanam").hidden = editing;

  showOnly("form");
  (editing ? $("f-jumlah") : $("f-kode")).focus();
}

// Event listener tombol otomatis kode & api suhu
$("btn-auto-kode")?.addEventListener("click", () => {
  $("f-kode").value = generateBatchCode();
});
$("btn-api-suhu")?.addEventListener("click", applyApiSuhu);

// ---------- Aksi ----------
$("btn-add").addEventListener("click", () => { hideAlert("notice"); showForm(false); });
$("btn-edit").addEventListener("click", () => { hideAlert("notice"); showForm(true); });
$("btn-back").addEventListener("click", showList);
$("btn-cancel").addEventListener("click", () => (mode === "edit" && current ? showDetail(current.id_budidaya) : showList()));
$("btn-logout").addEventListener("click", logout);

// Hapus batch (UC9)
$("btn-delete").addEventListener("click", () => {
  $("confirm-text").textContent = `Hapus batch ${current.kode_pengelolaan}? Riwayat fase dan data panennya ikut terhapus.`;
  show("confirm");
});
$("btn-no").addEventListener("click", () => show("confirm", false));
$("btn-yes").addEventListener("click", async () => {
  const id = current.id_budidaya;
  if (!USE_MOCK) {
    try {
      const res = await apiFetch(`${ENDPOINTS.budidaya}/${id}`, { method: "DELETE" });
      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({}));
        return showAlert("notice", err?.message || "Gagal menghapus data budidaya dari server.");
      }
      await loadDataFromBackend();
    } catch (e) {
      return showAlert("notice", "Error koneksi: " + e.message);
    }
  } else {
    data = data.filter((b) => b.id_budidaya !== id);
    panenList = panenList.filter((p) => p.id_budidaya !== id);
    save(PANEN_KEY, panenList);
    persist();
  }
  show("confirm", false);
  showList();
  notify("Data budidaya berhasil dihapus.");
});

// Perpindahan fase (opsional / manual jika elemen ada)
$("btn-move")?.addEventListener("click", () => openMove(-1));
$("m-cancel")?.addEventListener("click", () => show("move", false));
$("m-fase")?.addEventListener("change", () => {
  if (moveIdx < 0) $("m-lokasi").value = faseById(Number($("m-fase").value))?.meja ?? "";
});
$("h-no")?.addEventListener("click", () => show("h-confirm", false));
$("h-yes")?.addEventListener("click", () => {
  if (!current.fase) return;
  const prev = current.fase[hDel - 1];
  if (prev) prev.tanggal_selesai = "";
  current.fase.splice(hDel, 1);
  persist();
  show("h-confirm", false);
  showDetail(current.id_budidaya);
  notify("Riwayat perpindahan fase berhasil dihapus.");
});

$("move")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("move-alert");
  const add = moveIdx < 0;
  const idFase = parseInt($("m-fase").value, 10), tgl = $("m-tgl").value, sel = $("m-selesai").value;
  const lok = $("m-lokasi").value.trim();
  const cat = $("m-cat").value.trim();
  if (!tgl) return showAlert("move-alert", MSG_LENGKAP);

  const prev = add ? faseAktif(current) : current.fase[moveIdx - 1];
  const nxt = add ? null : current.fase[moveIdx + 1];
  const salah = toDate(tgl) > today() || (prev && tgl < prev.tanggal_mulai) || (nxt && nxt.tanggal_mulai < tgl) ||
    (add && idFase === prev?.id_fase) || (!add && sel && sel < tgl);
  if (salah) return showAlert("move-alert", MSG_FORMAT);

  if (!USE_MOCK) {
    try {
      if (add) {
        const res = await apiFetch(`/pengelolaan/${current.id_budidaya}/fase`, {
          method: "POST",
          body: JSON.stringify({
            id_fase: idFase,
            tanggal_mulai: tgl,
            catatan: cat || undefined,
          }),
        });
        if (!res || !res.ok) {
          const err = await res?.json().catch(() => ({}));
          return showAlert("move-alert", err?.message || "Gagal mencatat perpindahan fase di backend.");
        }
      }
      await loadDataFromBackend();
      show("move", false);
      showDetail(current.id_budidaya);
      notify(add ? "Data perpindahan fase berhasil ditambahkan." : "Data perpindahan fase berhasil diubah.");
      return;
    } catch (err) {
      return showAlert("move-alert", "Error: " + err.message);
    }
  }

  // Mock fallback
  if (add) {
    prev.tanggal_selesai = tgl;
    current.fase.push({ id_fase: idFase, tanggal_mulai: tgl, lokasi_tujuan: lok, catatan: cat });
    current.lokasi = lok;
  } else {
    Object.assign(current.fase[moveIdx], { id_fase: idFase, tanggal_mulai: tgl, tanggal_selesai: sel, lokasi_tujuan: lok, catatan: cat });
  }
  persist();
  show("move", false);
  showDetail(current.id_budidaya);
  notify(add ? "Data perpindahan fase berhasil ditambahkan." : "Data perpindahan fase berhasil diubah.");
});

// Simpan form tambah (UC6) / ubah (UC8)
$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("form-alert");

  const raw = {
    kode: $("f-kode").value.trim(), tanam: $("f-tanam").value, jumlah: $("f-jumlah").value.trim(),
    lokasi: $("f-lokasi").value.trim(), ph: $("f-ph").value.trim(),
    kondisi: $("f-kondisi").value.trim(), air: $("f-air").value.trim(),
    instalasi: $("f-instalasi").value.trim(), lingkungan: $("f-lingkungan").value.trim(),
  };
  const wajib = [raw.jumlah, raw.lokasi, raw.ph, raw.kondisi, raw.air, raw.instalasi, raw.lingkungan];
  if (mode === "add") wajib.push(raw.kode, raw.tanam);
  if (wajib.some((x) => !x)) return showAlert("form-alert", MSG_LENGKAP);

  if (mode === "add") {
    // Validasi format kode pengelolaan: huruf, angka, strip, underscore (3-50 karakter)
    const validKode = /^[A-Za-z0-9\-_]{3,50}$/.test(raw.kode);
    if (!validKode) {
      return showAlert("form-alert", "Format kode batch tidak sesuai (gunakan format seperti BATCH-2026-001 atau SLD-001).");
    }
  }

  const jumlah = Number(raw.jumlah), ph = Number(raw.ph);
  let salah = !Number.isInteger(jumlah) || jumlah < 1 || !/^\d{1,2}(\.\d{1,2})?$/.test(raw.ph) || ph > 14;
  if (mode === "add") {
    salah = salah || toDate(raw.tanam) > today() ||
      data.some((b) => b.kode_pengelolaan.toLowerCase() === raw.kode.toLowerCase());
  }
  if (salah) return showAlert("form-alert", MSG_FORMAT);

  const body = {
    jumlah_tanaman: jumlah,
    lokasi: raw.lokasi,
    nilai_ph: ph,
    kondisi_tanaman: raw.kondisi,
    kondisi_air_nutrisi: raw.air,
    kondisi_instalasi: raw.instalasi,
    kondisi_lingkungan: raw.lingkungan,
    catatan: $("f-catatan").value.trim(),
  };

  if (!USE_MOCK) {
    const btn = $("btn-save");
    if (btn) { btn.disabled = true; btn.textContent = "Menyimpan..."; }
    try {
      if (mode === "add") {
        const payload = {
          kode_pengelolaan: raw.kode,
          tanggal_tanam: raw.tanam,
          ...body,
        };
        const res = await apiFetch(ENDPOINTS.budidaya, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res || !res.ok) {
          const err = await res?.json().catch(() => ({}));
          const errMsg = err?.message || (err?.errors ? Object.values(err.errors).flat()[0] : null) || "Gagal menyimpan data budidaya ke backend.";
          return showAlert("form-alert", errMsg);
        }
        const json = await res.json();
        const createdId = json.data?.id_pengelolaan || json.data?.id;

        // Otomatis buat fase awal Semai di backend
        try {
          await apiFetch(`/pengelolaan/${createdId}/fase`, {
            method: "POST",
            body: JSON.stringify({
              id_fase: 1,
              tanggal_mulai: raw.tanam,
              catatan: "Fase awal semai"
            })
          });
        } catch (_) {}

        await loadDataFromBackend();
        showDetail(createdId);
        notify("Data budidaya berhasil ditambahkan ke database.");
      } else {
        const res = await apiFetch(`${ENDPOINTS.budidaya}/${current.id_budidaya}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (!res || !res.ok) {
          const err = await res?.json().catch(() => ({}));
          const errMsg = err?.message || (err?.errors ? Object.values(err.errors).flat()[0] : null) || "Gagal mengubah data budidaya di backend.";
          return showAlert("form-alert", errMsg);
        }
        await loadDataFromBackend();
        showDetail(current.id_budidaya);
        notify("Data budidaya berhasil diubah.");
      }
      return;
    } catch (err) {
      console.error("[FORM ERROR]", err);
      return showAlert("form-alert", "Error: " + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Simpan"; }
    }
  }

  // Mock fallback
  if (mode === "add") {
    const id = data.reduce((m, b) => Math.max(m, b.id_budidaya), 0) + 1;
    data.push({
      id_budidaya: id, kode_pengelolaan: raw.kode, tanggal_tanam: raw.tanam, ...body,
      fase: [{ id_fase: FASE[0].id_fase, tanggal_mulai: raw.tanam }]
    });
    persist();
    showDetail(id);
    notify("Data budidaya berhasil ditambahkan.");
  } else {
    Object.assign(current, body);
    persist();
    showDetail(current.id_budidaya);
    notify("Data budidaya berhasil diubah.");
  }
});

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) { }

  if (!USE_MOCK) {
    await loadDataFromBackend();
  } else {
    persist();
  }

  const id = parseInt(new URLSearchParams(location.search).get("id"), 10);
  if (id) showDetail(id); else showList();
})();