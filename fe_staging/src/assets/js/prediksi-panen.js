// Prediksi Kesiapan Panen (UC18).
// Alur: daftar batch pendewasaan -> klik batch -> ambil data budidaya batch -> kirim ke model AI -> tampilkan hasil.
// Data batch: GET ENDPOINTS.budidaya (BE Laravel). Prediksi: POST AI_API_URL + "/predict" (layanan AI FastAPI).

// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
const setText = (id, t) => { const e = $(id); if (e) e.textContent = t; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MS_HARI = 86400000;
const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
const umurHari = (s) => Math.max(0, Math.floor((today() - toDate(s)) / MS_HARI));
const selisihHari = (s) => Math.max(0, Math.round((toDate(s) - today()) / MS_HARI));
const fmtTanggal = (s) => toDate(s).toLocaleDateString("id-ID", { dateStyle: "long" });
const fmt1 = (n) => Number(n).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const MESSAGES = { KOSONG: "Belum ada batch pada fase pendewasaan untuk diprediksi." };
const FASE_BUDIDAYA = "Pendewasaan"; // daftar hanya berisi batch pada fase pendewasaan

// ---------- Data budidaya (BE disimpan ke localStorage oleh init(), lalu disaring di sini) ----------
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

    // Fase Semai (< 15 hari) dan fase Peremajaan (15-20 hari) tidak ikut
    return umur >= 21 || faseTerakhir === ID_FASE_PENDEWASAAN;
  });
}

// ---------- Membaca nilai dari teks kondisi budidaya ----------
const angkaDari = (s) => parseFloat(String(s).replace(",", "."));
function cariPpm(val) {
  const t = String(val || "");
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*ppm/i) || t.match(/ppm\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
  return m ? Math.round(angkaDari(m[1])) : null;
}
function cariSuhu(val) {
  const t = String(val || "");
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*°\s*C/i) || t.match(/(\d+(?:[.,]\d+)?)\s*C\b/) || t.match(/(\d+(?:[.,]\d+)?)/);
  return m ? angkaDari(m[1]) : null;
}
const parsePpm = (v) => cariPpm(v) ?? 700;      // nilai bawaan untuk masukan model AI
const parseSuhu = (v) => cariSuhu(v) ?? 28.0;   // nilai bawaan untuk masukan model AI

function parseKondisiTanaman(val) {
  const s = String(val || "").toLowerCase();
  if (s.includes("kuning") || s.includes("menguning")) return "daun_menguning";
  if (s.includes("lambat")) return "pertumbuhan_lambat";
  if (s.includes("layu")) return "layu";
  if (s.includes("kutilang")) return "kutilang";
  return "sehat";
}
function parseKondisiInstalasi(val) {
  const s = String(val || "").toLowerCase();
  if (s.includes("rusak") || s.includes("bocor")) return "rusak";
  if (s.includes("gangguan") || s.includes("terganggu") || s.includes("tersumbat")) return "terganggu";
  return "normal";
}

// ---------- Prediksi via layanan AI (FastAPI) ----------
const UMUR_PANEN_MIN = 45, UMUR_PANEN_MAX = 55;  // rentang umur panen standar (cadangan kalau layanan AI mati)
const KONDISI_CUACA = "Cerah";                   // nilai yang dikirim ke model (data cuaca belum disimpan di batch)

async function prediksiAI(b) {
  const umur = umurHari(b.tanggal_tanam);
  const payload = {
    umur_tanaman_hari: Math.max(21, Math.min(55, umur)),
    jumlah_tanaman: Number(b.jumlah_tanaman) || 100,
    nilai_ppm: Math.max(200, Math.min(1500, parsePpm(b.kondisi_air_nutrisi))),
    nilai_ph: Math.max(4.0, Math.min(8.0, Number(b.nilai_ph) || 6.2)),
    suhu: Math.max(15.0, Math.min(40.0, parseSuhu(b.kondisi_lingkungan || b.suhu))),
    kondisi_tanaman: parseKondisiTanaman(b.kondisi_tanaman),
    kondisi_instalasi: parseKondisiInstalasi(b.kondisi_instalasi),
    kondisi_cuaca: KONDISI_CUACA.toLowerCase(),
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
      const mulai = addDays(iso(today()), sisaHari);
      const selesai = addDays(mulai, 5); // jendela panen optimal ~5 hari

      let status = "Belum siap panen";
      if (sisaHari <= 0 || data.status_kesiapan === "Siap Panen" || data.status_kesiapan === "Segera Panen") status = "Siap panen";
      else if (sisaHari <= 5 || data.status_kesiapan === "Mendekati Panen") status = "Mendekati siap panen";
      return { status, mulai, selesai };
    }
  } catch (err) {
    console.warn("[AI API] Server FastAPI tidak dapat dihubungi, fallback ke estimasi lokal:", err);
  }

  // Cadangan: hitungan lokal kalau layanan AI belum dinyalakan
  const status = umur >= UMUR_PANEN_MIN ? "Siap panen" : umur >= 38 ? "Mendekati siap panen" : "Belum siap panen";
  return {
    status,
    mulai: addDays(b.tanggal_tanam, UMUR_PANEN_MIN),
    selesai: addDays(b.tanggal_tanam, UMUR_PANEN_MAX),
  };
}
const statusClass = (s) => (s === "Siap panen" ? "siap" : s === "Mendekati siap panen" ? "dekat" : "belum");

// Rentang Estimasi Panen: selisih hari dari hari ini ke tanggal mulai dan selesai panen
function rentangEstimasi(h) {
  const a = selisihHari(h.mulai), z = selisihHari(h.selesai);
  if (z === 0) return "Hari ini";
  return a === z ? a + " hari lagi" : a + " - " + z + " hari lagi";
}

// Kalimat informasi di bawah hasil prediksi (dari data yang sama dengan kartu di atasnya)
function kalimatInfo(kode, h) {
  const a = selisihHari(h.mulai), z = selisihHari(h.selesai);
  const rentang = z === 0 ? "sudah memasuki waktu panen"
    : "memasuki waktu panen dalam rentang " + (a === z ? a : a + "–" + z) + " hari";
  return "Berdasarkan hasil prediksi AI, " + kode + " diperkirakan " + rentang +
    ". Pengelola tetap perlu melakukan pengecekan kondisi tanaman secara langsung untuk memastikan kesiapan panen.";
}

// ---------- Tampilan ----------
let batches = [];
let permintaan = 0;

function tampil(nama) {
  $("v-list").hidden = nama !== "list";
  $("v-proses").hidden = nama !== "proses";
  $("v-hasil").hidden = nama !== "hasil";
}

const PANAH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

function renderBatches() {
  const tb = $("rows");
  tb.replaceChildren();
  batches.forEach((b, i) => {
    const tr = el("tr");
    tr.style.setProperty("--i", String(Math.min(i, 10)));

    const tdKode = el("td");
    const btn = el("button", b.kode_pengelolaan, "pr-pilih");
    btn.type = "button";
    btn.setAttribute("aria-label", "Lihat prediksi batch " + b.kode_pengelolaan);
    tdKode.appendChild(btn);

    const tdPanah = el("td");
    const box = el("div");
    const panah = el("span", undefined, "pr-panah");
    panah.innerHTML = PANAH;
    box.appendChild(panah);
    tdPanah.appendChild(box);

    tr.append(tdKode, el("td", fmtTanggal(b.tanggal_tanam), "pl"), el("td", umurHari(b.tanggal_tanam) + " hari", "pl"), tdPanah);
    tr.addEventListener("click", () => pilih(b.id_budidaya));
    tb.appendChild(tr);
  });
}

// Klik batch -> ambil data budidaya -> prediksi AI -> tampilkan hasil
async function pilih(id) {
  const mine = ++permintaan;
  const b = batches.find((x) => x.id_budidaya === id);
  if (!b) return;
  setText("proses-batch", "Batch " + b.kode_pengelolaan);
  tampil("proses");

  const [h] = await Promise.all([prediksiAI(b), sleep(500)]);
  if (mine !== permintaan) return;

  setText("r-kode", b.kode_pengelolaan);
  setText("r-fase", FASE_BUDIDAYA);
  const st = $("r-status");
  st.textContent = h.status;
  st.className = "pr-status " + statusClass(h.status);
  setText("r-rentang", rentangEstimasi(h));
  setText("r-catatan", kalimatInfo(b.kode_pengelolaan, h));
  setText("r-mulai", fmtTanggal(h.mulai));
  setText("r-selesai", fmtTanggal(h.selesai));

  setText("r-umur", umurHari(b.tanggal_tanam) + " hari");
  setText("r-jumlah", Number(b.jumlah_tanaman) ? Number(b.jumlah_tanaman) + " tanaman" : "-");
  const ppm = cariPpm(b.kondisi_air_nutrisi);
  setText("r-ppm", ppm === null ? "-" : ppm + " ppm");
  const ph = Number(b.nilai_ph);
  setText("r-ph", b.nilai_ph === undefined || b.nilai_ph === null || b.nilai_ph === "" || isNaN(ph) ? "-" : fmt1(ph));
  const suhu = cariSuhu(b.kondisi_lingkungan || b.suhu);
  setText("r-suhu", suhu === null ? "-" : fmt1(suhu) + " °C");
  setText("r-tanaman", b.kondisi_tanaman || "-");
  setText("r-instalasi", b.kondisi_instalasi || "-");
  setText("r-cuaca", KONDISI_CUACA);

  tampil("hasil");
  const judul = $("h-hasil");
  if (judul) judul.focus();
}

$("btn-kembali").addEventListener("click", () => { permintaan++; tampil("list"); });
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
        if (mapped.length > 0) localStorage.setItem(BUDIDAYA_KEY, JSON.stringify(mapped));
      }
    } catch (_) { }
  }

  batches = batchPendewasaan();
  $("skel").hidden = true;
  if (batches.length === 0) {
    $("kosong").textContent = MESSAGES.KOSONG;
    $("kosong").hidden = false;
    return;
  }
  renderBatches();
  $("list-card").hidden = false;
})();