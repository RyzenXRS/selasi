// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};

const MS_HARI = 86400000;
const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
const umurHari = (s) => Math.max(0, Math.floor((today() - toDate(s)) / MS_HARI));
const fmtTanggal = (s) => toDate(s).toLocaleDateString("id-ID", { dateStyle: "long" });
const fmtAngka = (n) => Number(n).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

const MESSAGES = { KOSONG: "Belum ada batch pada fase pendewasaan untuk diprediksi." };

// ---------- Data budidaya (dibaca dari data yang sama dengan budidaya.js) ----------
const BUDIDAYA_KEY = "mock_budidaya_v2";
const PANEN_KEY = "mock_panen_v1";
const ID_FASE_PENDEWASAAN = 3;

const load = (key, fallback) => {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (_) { }
  return fallback;
};

// Batch yang HANYA berada pada fase Pendewasaan (umur >= 21 hari atau id_fase === 3) dan belum dipanen
function batchPendewasaan() {
  const panen = load(PANEN_KEY, []);
  return load(BUDIDAYA_KEY, []).filter((b) => {
    const isPanen = (Array.isArray(b.panen) && b.panen.length > 0) || (b.panen && b.panen.id_panen) || panen.some((p) => p.id_budidaya === b.id_budidaya);
    if (isPanen) return false;

    const tanam = b.tanggal_tanam || b.seed_date;
    const umur = tanam ? umurHari(tanam) : 0;
    const faseArr = b.fase || b.perpindahan_fase || [];
    const faseTerakhir = faseArr.length ? (faseArr[faseArr.length - 1].id_fase || 1) : 1;

    // FASE SEMAI (< 15 hari) DAN FASE PEREMAJAAN (15-20 hari) DILARANG MASUK
    return umur >= 21 || faseTerakhir === ID_FASE_PENDEWASAAN;
  });
}

// ---------- Prediksi via AI FastAPI (Gradient Boosting Regressor) ----------
const UMUR_PANEN_MIN = 45, UMUR_PANEN_MAX = 55;  // rentang umur panen standar

// Helper: Ekstrak angka PPM dari teks (misal "750 ppm" -> 750)
function parsePpm(val) {
  if (!val) return 700;
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0], 10) : 700;
}

// Helper: Ekstrak suhu dari kondisi lingkungan (misal "Suhu 28.5 °C" -> 28.5)
function parseSuhu(val) {
  if (!val) return 28.0;
  const match = String(val).match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 28.0; hesp
}

// Helper: Normalisasi kondisi tanaman untuk AI model
function parseKondisiTanaman(val) {
  const s = String(val || "").toLowerCase();
  if (s.includes("kuning") || s.includes("menguning")) return "daun_menguning";
  if (s.includes("lambat")) return "pertumbuhan_lambat";
  if (s.includes("layu")) return "layu";
  if (s.includes("kutilang")) return "kutilang";
  return "sehat";
}

// Helper: Normalisasi kondisi instalasi untuk AI model
function parseKondisiInstalasi(val) {
  const s = String(val || "").toLowerCase();
  if (s.includes("rusak") || s.includes("bocor")) return "rusak";
  if (s.includes("gangguan") || s.includes("terganggu") || s.includes("tersumbat")) return "terganggu";
  return "normal";
}

async function prediksiAI(b) {
  const umur = umurHari(b.tanggal_tanam);
  const ppm = parsePpm(b.kondisi_air_nutrisi);
  const ph = Number(b.nilai_ph) || 6.2;
  const suhu = parseSuhu(b.kondisi_lingkungan || b.suhu);
  const kondisiTanaman = parseKondisiTanaman(b.kondisi_tanaman);
  const kondisiInstalasi = parseKondisiInstalasi(b.kondisi_instalasi);
  const cuaca = "cerah"; // default cuaca hidroponik

  const payload = {
    umur_tanaman_hari: Math.max(21, Math.min(55, umur)),
    jumlah_tanaman: Number(b.jumlah_tanaman) || 100,
    nilai_ppm: Math.max(200, Math.min(1500, ppm)),
    nilai_ph: Math.max(4.0, Math.min(8.0, ph)),
    suhu: Math.max(15.0, Math.min(40.0, suhu)),
    kondisi_tanaman: kondisiTanaman,
    kondisi_instalasi: kondisiInstalasi,
    kondisi_cuaca: cuaca,
  };

  const aiUrl = (typeof AI_API_URL !== "undefined" ? AI_API_URL : "http://127.0.0.1:8000") + "/predict";

  try {
    const res = await fetch(aiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const sisaHari = Math.max(0, Math.round(Number(data.sisa_hari_panen || 0)));
      const tglPrediksiMulai = addDays(iso(today()), sisaHari);
      const tglPrediksiSelesai = addDays(tglPrediksiMulai, 5); // jendela panen optimal ~5 hari
      const totalUmur = umur + sisaHari;

      let status = "Belum siap panen";
      let kesiapanSub = "Pertumbuhan tahap pendewasaan";
      if (sisaHari <= 0 || data.status_kesiapan === "Siap Panen" || data.status_kesiapan === "Segera Panen") {
        status = "Siap panen";
        kesiapanSub = "Siap untuk dipanen hari ini";
      } else if (sisaHari <= 5 || data.status_kesiapan === "Mendekati Panen") {
        status = "Mendekati siap panen";
        kesiapanSub = "Kurang dari 5 hari lagi";
      }

      return {
        status: status,
        sisaHari: sisaHari,
        totalUmur: totalUmur,
        kesiapanSub: kesiapanSub,
        mulai: tglPrediksiMulai,
        selesai: tglPrediksiSelesai,
        ph: String(ph),
        ppm: ppm + " ppm",
        suhu: suhu + " °C",
        kondisiTanaman: b.kondisi_tanaman || "Normal",
        kondisiInstalasi: b.kondisi_instalasi || "Normal",
        cuaca: "Cerah",
        info: `[Model AI Aktif: Gradient Boosting Regressor] ${data.keterangan || "Model memprediksi panen optimal berdasarkan parameter air nutrisi dan lingkungan terkini."}`,
        isAi: true,
      };
    }
  } catch (err) {
    console.warn("[AI API] Server FastAPI tidak dapat dihubungi, fallback ke estimasi lokal:", err);
  }

  // Fallback ke hitungan lokal jika server AI belum dinyalakan
  const sisa = Math.max(0, UMUR_PANEN_MIN - umur);
  const status = umur >= UMUR_PANEN_MIN ? "Siap panen" : umur >= 38 ? "Mendekati siap panen" : "Belum siap panen";
  const phStr = b.nilai_ph ? fmtAngka(b.nilai_ph) : "6.2";
  return {
    status,
    sisaHari: sisa,
    totalUmur: Math.max(UMUR_PANEN_MIN, umur),
    kesiapanSub: status === "Siap panen" ? "Siap untuk dipanen" : `${sisa} hari menuju panen standar`,
    mulai: addDays(b.tanggal_tanam, UMUR_PANEN_MIN),
    selesai: addDays(b.tanggal_tanam, UMUR_PANEN_MAX),
    ph: phStr,
    ppm: (b.kondisi_air_nutrisi || "900 ppm"),
    suhu: (b.suhu ? b.suhu + " °C" : "24.5 °C"),
    kondisiTanaman: b.kondisi_tanaman || "Baik",
    kondisiInstalasi: b.kondisi_instalasi || "Baik",
    cuaca: "Cerah",
    info: `Berdasarkan umur ${umur} hari, nilai pH ${phStr}, dan kondisi air nutrisi ${b.kondisi_air_nutrisi || "-"}. Estimasi panen optimal di rentang umur 45-55 hari. (Tips: Server AI FastAPI aktif untuk prediksi presisi).`,
    isAi: false,
  };
}
const statusClass = (s) => (s === "Siap panen" ? "siap" : s === "Mendekati siap panen" ? "dekat" : "belum");

// ---------- Ikon tanaman sesuai status ----------
const IKON = {
  belum: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 54V34" stroke="#4F772D" stroke-width="3" stroke-linecap="round"/><path d="M32 38c0-8 6-13 15-13 0 8-6 13-15 13z" fill="#90A955"/><path d="M32 44c0-6-5-10-12-10 0 6 5 10 12 10z" fill="#4F772D"/><ellipse cx="32" cy="56" rx="14" ry="3" fill="#c9a27a"/></svg>',
  dekat: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 54V26" stroke="#4F772D" stroke-width="3" stroke-linecap="round"/><path d="M32 30c0-9 7-15 18-15 0 9-7 15-18 15z" fill="#90A955"/><path d="M32 38c0-8-7-13-17-13 0 8 7 13 17 13z" fill="#4F772D"/><path d="M32 46c0-6 5-10 13-10 0 6-5 10-13 10z" fill="#31572C"/><ellipse cx="32" cy="56" rx="14" ry="3" fill="#c9a27a"/></svg>',
  siap: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="36" r="17" fill="#4F772D"/><path d="M16 38c2-12 10-18 16-18s14 6 16 18c-5 6-11 9-16 9s-11-3-16-9z" fill="#90A955"/><path d="M23 38c1-7 5-11 9-11s8 4 9 11c-3 4-6 6-9 6s-6-2-9-6z" fill="#ECF39E"/><path d="M52 10l1.6 4.2 4.2 1.6-4.2 1.6L52 21.6l-1.6-4.2-4.2-1.6 4.2-1.6z" fill="#e0b23a"/><ellipse cx="32" cy="56" rx="16" ry="3" fill="#c9a27a"/></svg>',
};

// ---------- Tampilan ----------
let batches = [];
let dipilih = null;

function renderBatches() {
  const box = $("batches");
  box.replaceChildren();
  batches.forEach((b) => {
    const umur = umurHari(b.tanggal_tanam);
    const btn = el("button", undefined, "pr-batch");
    btn.type = "button";
    btn.setAttribute("aria-pressed", String(b.id_budidaya === dipilih));
    const bar = el("div", undefined, "pr-bar"), isi = el("i");
    isi.style.width = Math.min(100, (umur / UMUR_PANEN_MIN) * 100) + "%";
    bar.appendChild(isi);
    btn.append(el("b", b.kode_pengelolaan), el("span", "Tanggal semai: " + fmtTanggal(b.tanggal_tanam)), el("span", "Umur tanaman: " + umur + " hari"), bar);
    btn.addEventListener("click", () => pilih(b.id_budidaya));
    box.appendChild(btn);
  });
}

// Lintasan umur: pita fase 0-60 hari dengan penanda umur batch
const SKALA = 60;
const PITA = [["b1", 0, 14], ["b2", 14, 21], ["b3", 21, UMUR_PANEN_MIN], ["b4", UMUR_PANEN_MIN, UMUR_PANEN_MAX]];
function renderTrack(umur) {
  const track = $("track");
  track.replaceChildren();
  PITA.forEach(([cls, a, z]) => {
    const d = el("div", undefined, "pr-band " + cls);
    d.style.left = (a / SKALA) * 100 + "%";
    d.style.width = ((z - a) / SKALA) * 100 + "%";
    track.appendChild(d);
  });
  const ticks = $("ticks");
  ticks.replaceChildren();
  [0, 14, 21, UMUR_PANEN_MIN, UMUR_PANEN_MAX].forEach((h) => {
    const t = el("span", String(h));
    t.style.left = (h / SKALA) * 100 + "%";
    ticks.appendChild(t);
  });
  $("pin").style.left = (Math.min(umur, SKALA) / SKALA) * 100 + "%";
  $("pin-label").textContent = "Umur " + umur + " hari";
}

function setTanggal(idD, idM, s) {
  const d = toDate(s);
  $(idD).textContent = d.getDate();
  $(idM).textContent = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

// Klik batch -> ambil data budidaya -> prediksi AI -> tampilkan hasil
async function pilih(id) {
  dipilih = id;
  const b = batches.find((x) => x.id_budidaya === id);
  renderBatches();
  $("tunggu").hidden = false;
  $("hasil").hidden = true;

  const h = await prediksiAI(b);
  const kelas = statusClass(h.status);
  $("r-kode").textContent = b.kode_pengelolaan;
  $("r-status").textContent = h.status;
  $("r-status").className = "pr-status " + kelas;
  $("r-ikon").innerHTML = IKON[kelas];
  renderTrack(umurHari(b.tanggal_tanam));

  // Tampilkan metrik kesiapan & estimasi panen
  $("r-sisa-hari").textContent = h.sisaHari <= 0 ? "Hari ini" : h.sisaHari + " hari";
  $("r-sisa-label").textContent = h.sisaHari <= 0 ? "Siap dipanen" : "Menuju panen optimal";
  $("r-umur-panen").textContent = h.totalUmur + " hari";
  $("r-kesiapan-text").textContent = h.status;
  $("r-kesiapan-sub").textContent = h.kesiapanSub;

  setTanggal("r-mulai-d", "r-mulai-m", h.mulai);
  setTanggal("r-selesai-d", "r-selesai-m", h.selesai);

  // Tampilkan parameter input AI
  if ($("r-param-ph")) $("r-param-ph").textContent = h.ph;
  if ($("r-param-ppm")) $("r-param-ppm").textContent = h.ppm;
  if ($("r-param-suhu")) $("r-param-suhu").textContent = h.suhu;
  if ($("r-param-tanaman")) $("r-param-tanaman").textContent = h.kondisiTanaman;
  if ($("r-param-instalasi")) $("r-param-instalasi").textContent = h.kondisiInstalasi;
  if ($("r-param-cuaca")) $("r-param-cuaca").textContent = h.cuaca;

  $("r-info").textContent = h.info;
  $("tunggu").hidden = true;
  $("hasil").hidden = false;
}

$("btn-logout").addEventListener("click", logout);

(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) { }

  if (typeof USE_MOCK !== "undefined" && !USE_MOCK && typeof apiFetch === "function") {
    try {
      const res = await apiFetch((typeof ENDPOINTS !== "undefined" ? ENDPOINTS.budidaya : "/pengelolaan") + "?per_page=100");
      if (res && res.ok) {
        const json = await res.json();
        const rawBatches = Array.isArray(json.data) ? json.data : (json.data?.data || []);
        const mapped = rawBatches.map((b) => {
          const rawFase = b.perpindahan_fase || [];
          const sortedFase = [...rawFase].sort((x, y) => (x.tanggal_mulai || "").localeCompare(y.tanggal_mulai || ""));
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
            panen: b.panen || [],
            fase: sortedFase.map((p) => ({
              id_fase: p.id_fase || p.fase?.id_fase || 1,
              tanggal_mulai: p.tanggal_mulai,
            })),
          };
        });
        if (mapped.length > 0) {
          localStorage.setItem(BUDIDAYA_KEY, JSON.stringify(mapped));
        }
      }
    } catch (_) { }
  }

  // Ambil hanya batch yang masuk fase pendewasaan dan belum panen
  batches = batchPendewasaan();
  if (batches.length === 0) {
    $("kosong-msg").textContent = MESSAGES.KOSONG;
    $("kosong").hidden = false;
    $("isi").hidden = true;
    return;
  }

  $("kosong").hidden = true;
  $("isi").hidden = false;
  $("catat").textContent = "Umur dihitung sejak tanggal semai hingga " + today().toLocaleDateString("id-ID", { dateStyle: "long" }) + ".";
  pilih(batches[0].id_budidaya);
})();