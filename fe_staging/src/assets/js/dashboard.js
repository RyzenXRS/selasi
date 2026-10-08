// ---------- Konstanta ----------
const STATUS_LIST = ["Normal", "Perlu Diperhatikan", "Mendekati Perpindahan Fase", "Mendekati Panen", "Sudah Dipanen"];
const STATUS_AKHIR = "Sudah Dipanen"; // batch dengan status ini dianggap tidak aktif
const STATUS_CLASS = {
  "Normal": "",
  "Perlu Diperhatikan": "perlu",
  "Mendekati Perpindahan Fase": "pindah",
  "Mendekati Panen": "panen",
  "Sudah Dipanen": "selesai",
};

// Harus sama dengan budidaya.js
const FASE = {
  1: { nama: "Semai", urutan: 1, warna: "#8fbf4d" },
  2: { nama: "Pembibitan", urutan: 2, warna: "#3f9d6a" },
  3: { nama: "Pembesaran", urutan: 3, warna: "#2f6f3e" },
  4: { nama: "Panen", urutan: 4, warna: "#e0a526" },
};

// Aturan status (sama dengan budidaya.js)
const PH_MIN = 5.5, PH_MAX = 6.5;
const BATAS_HARI_PINDAH = 2;
const MS_HARI = 86400000;
const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysBetween = (s) => Math.max(0, Math.round((today() - toDate(s)) / MS_HARI));
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return d; };

const FASE_DURASI = { 1: 7, 2: 14, 3: 21, 4: 7 };

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
  const faseArr = b.perpindahan_fase || [];
  // Urutkan fase berdasarkan tanggal_mulai, ambil fase terakhir
  const sorted = [...faseArr].sort((a, c) => (a.tanggal_mulai || "").localeCompare(c.tanggal_mulai || ""));
  const terakhir = sorted[sorted.length - 1];
  const idFase = terakhir ? terakhir.id_fase : 1;
  const info = FASE[idFase] || FASE[1];

  // Hitung status berdasarkan data
  const hasPanen = Array.isArray(b.panen) && b.panen.length > 0;
  const ph = b.nilai_ph;
  const phDiLuar = ph !== null && ph !== undefined && ph !== "" && (Number(ph) < PH_MIN || Number(ph) > PH_MAX);
  const durasi = FASE_DURASI[idFase] || 7;
  const hariDiFase = terakhir ? daysBetween(terakhir.tanggal_mulai) : 0;
  const bukanTerakhir = info.urutan < 4;
  const sisaHari = Math.max(0, durasi - hariDiFase);
  const faseNext = bukanTerakhir ? FASE[idFase + 1] : null;

  let status = "Normal";
  if (hasPanen) status = "Sudah Dipanen";
  else if (phDiLuar) status = "Perlu Diperhatikan";
  else if (!faseNext) status = "Mendekati Panen";
  else if (sisaHari <= BATAS_HARI_PINDAH) status = faseNext.urutan === 4 ? "Mendekati Panen" : "Mendekati Perpindahan Fase";

  return {
    id_budidaya: b.id_pengelolaan || b.id,
    kode_budidaya: b.kode_pengelolaan || b.batch_code,
    status,
    id_fase: idFase,
    nama_fase: info.nama,
    urutan_fase: info.urutan,
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

// ---------- State ----------
let batches = [];
let filter = { type: "aktif" };

const aktif = () => batches.filter((b) => b.status !== STATUS_AKHIR);

const jumlahFase = (id) => aktif().filter((b) => b.id_fase === id).length;
const countStatus = (st) => batches.filter((b) => b.status === st).length;

// ---------- Ringkasan (kartu yang bisa dipilih) ----------
function pick(btn, type, value) {
  btn.type = "button";
  btn.setAttribute("aria-pressed", filter.type === type && filter.value === value ? "true" : "false");
  btn.addEventListener("click", () => { filter = { type, value }; render(); });
}

function renderCards() {
  // 1.3.2 jumlah batch aktif
  const a = $("s-aktif");
  a.replaceChildren(el("span", "sum-label", "Jumlah batch aktif"), el("span", "sum-num", String(aktif().length)));
  a.removeAttribute("aria-pressed");
  pick(a, "aktif");

  // 1.3.3 batch aktif per fase (jalur tanam)
  const jalur = $("jalur");
  jalur.replaceChildren();
  Object.entries(FASE).sort((x, y) => x[1].urutan - y[1].urutan).forEach(([id, f]) => {
    const li = el("li", "step");
    li.style.setProperty("--c", f.warna);
    const btn = el("button", "step-btn");
    btn.append(el("div", "dot", String(jumlahFase(Number(id)))), el("b", "", f.nama), el("span", "", jumlahFase(Number(id)) + " batch"));
    pick(btn, "fase", Number(id));
    li.appendChild(btn);
    jalur.appendChild(li);
  });

  // 1.3.4 status budidaya
  const chips = $("status-chips");
  chips.replaceChildren();
  STATUS_LIST.forEach((st) => {
    const btn = el("button", "chip");
    btn.append(el("b", "", String(countStatus(st))), document.createTextNode(st));
    pick(btn, "status", st);
    chips.appendChild(btn);
  });
}

// ---------- Daftar batch ----------
function currentList() {
  if (filter.type === "fase") return aktif().filter((b) => b.id_fase === filter.value);
  if (filter.type === "status") return batches.filter((b) => b.status === filter.value);
  return aktif();
}
function currentTitle() {
  if (filter.type === "fase") {
    return "Batch aktif pada fase " + FASE[filter.value].nama;
  }
  if (filter.type === "status") return "Batch dengan status " + filter.value;
  return "Semua batch aktif";
}

function renderList() {
  const list = currentList();
  const tbody = $("tbody");
  tbody.replaceChildren();
  $("list-info").textContent = currentTitle() + " (" + list.length + ")";
  $("empty").hidden = list.length > 0;

  list.forEach((b) => {
    const tr = el("tr");
    tr.appendChild(el("td", "", b.kode_budidaya));
    tr.appendChild(el("td", "", b.nama_fase));
    const tdStatus = el("td");
    tdStatus.appendChild(el("span", "badge " + (STATUS_CLASS[b.status] || ""), b.status));
    tr.appendChild(tdStatus);
    const tdAksi = el("td");
    const a = el("a", "", "Lihat detail");
    a.href = "budidaya.html?id=" + encodeURIComponent(b.id_budidaya);
    tdAksi.appendChild(a);
    tr.appendChild(tdAksi);
    tbody.appendChild(tr);
  });
}

function render() { renderCards(); renderList(); }

// ---------- Mulai ----------
(async function init() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = user.email || "";
  } catch (_) {}
  $("btn-logout").addEventListener("click", logout);

  try {
    batches = await fetchBatches();
    render();
  } catch (err) {
    showAlert("Data budidaya belum bisa dimuat. Coba muat ulang halaman.");
  }
  window.addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });
})();