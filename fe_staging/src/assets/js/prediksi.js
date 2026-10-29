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
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (_) {}
  return fallback;
};

// Batch yang fase aktifnya Pendewasaan dan belum tercatat panennya
function batchPendewasaan() {
  const panen = load(PANEN_KEY, []);
  return load(BUDIDAYA_KEY, [])
    .filter((b) => b.fase && b.fase.length && b.fase[b.fase.length - 1].id_fase === ID_FASE_PENDEWASAAN)
    .filter((b) => !panen.some((p) => p.id_budidaya === b.id_budidaya));
}

// ---------- Prediksi ----------
// TEBAKAN: hitungan sederhana di frontend sebagai pengganti model Random Forest Regression.
// Saat backend siap, ganti isi fungsi ini dengan hasil respons API
// (status, tanggal mulai, tanggal selesai, informasi pendukung).
const UMUR_PANEN_MIN = 45, UMUR_PANEN_MAX = 55;  // rentang umur panen
const UMUR_MENDEKATI = 38;                       // mulai "Mendekati siap panen"

function prediksi(b) {
  const umur = umurHari(b.tanggal_tanam);
  const status = umur >= UMUR_PANEN_MIN ? "Siap panen" : umur >= UMUR_MENDEKATI ? "Mendekati siap panen" : "Belum siap panen";
  const ph = b.nilai_ph === undefined || b.nilai_ph === null || b.nilai_ph === "" ? null : fmtAngka(b.nilai_ph);
  const bagian = [`umur ${umur} hari`];
  if (ph) bagian.push(`nilai pH ${ph}`);
  if (b.kondisi_air_nutrisi) bagian.push(`kondisi air dan nutrisi: ${b.kondisi_air_nutrisi.replace(/\.$/, "")}`);
  return {
    status,
    mulai: addDays(b.tanggal_tanam, UMUR_PANEN_MIN),
    selesai: addDays(b.tanggal_tanam, UMUR_PANEN_MAX),
    info: `Berdasarkan ${bagian.join(", ")}. Tetap periksa kondisi tanaman. Ini estimasi AI, bukan kepastian hasil.`,
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

// Klik batch -> ambil data budidaya -> prediksi -> tampilkan hasil
function pilih(id) {
  dipilih = id;
  const b = batches.find((x) => x.id_budidaya === id);
  renderBatches();
  $("tunggu").hidden = false;
  $("hasil").hidden = true;

  setTimeout(() => {
    const h = prediksi(b);
    const kelas = statusClass(h.status);
    $("r-kode").textContent = b.kode_pengelolaan;
    $("r-status").textContent = h.status;
    $("r-status").className = "pr-status " + kelas;
    $("r-ikon").innerHTML = IKON[kelas];
    renderTrack(umurHari(b.tanggal_tanam));
    setTanggal("r-mulai-d", "r-mulai-m", h.mulai);
    setTanggal("r-selesai-d", "r-selesai-m", h.selesai);
    $("r-info").textContent = h.info;
    $("tunggu").hidden = true;
    $("hasil").hidden = false;
  }, 350);
}

$("btn-logout").addEventListener("click", logout);

(function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}

  batches = batchPendewasaan();
  if (batches.length === 0) {
    $("kosong-msg").textContent = MESSAGES.KOSONG;
    $("kosong").hidden = false;
    return;
  }
  $("isi").hidden = false;
  $("catat").textContent = "Umur dihitung sejak tanggal semai hingga " + today().toLocaleDateString("id-ID", { dateStyle: "long" }) + ".";
  pilih(batches[0].id_budidaya);
})();