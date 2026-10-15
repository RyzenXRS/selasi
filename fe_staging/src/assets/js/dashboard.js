// ---------- Konstanta ----------
const STATUS_LIST = ["Normal", "Perlu Diperhatikan", "Mendekati Perpindahan Fase", "Mendekati Panen", "Sudah Dipanen"];
const STATUS_AKHIR = "Sudah Dipanen";
const STATUS_CLASS = {
  "Normal": "",
  "Perlu Diperhatikan": "perlu",
  "Mendekati Perpindahan Fase": "pindah",
  "Mendekati Panen": "panen",
  "Sudah Dipanen": "selesai",
};

// Fase master (akan diperbarui dari API kalau tersedia)
const FASE = {
  1: { nama: "Semai",      urutan: 1, warna: "#8fbf4d" },
  2: { nama: "Pembibitan", urutan: 2, warna: "#3f9d6a" },
  3: { nama: "Pembesaran", urutan: 3, warna: "#2f6f3e" },
  4: { nama: "Panen",      urutan: 4, warna: "#e0a526" },
};

// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
function showAlert(message) { const e = $("alert"); e.textContent = message; e.hidden = false; }
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------- Auth headers ----------
const authHeaders = () => ({
  Accept: "application/json",
  Authorization: "Bearer " + localStorage.getItem("token"),
});

// ---------- Normalisasi batch dari BE ----------
// BE: { id_pengelolaan, kode_pengelolaan, fase_saat_ini: { id_fase, nama_fase }, kondisi_tanaman, nilai_ph, ... }
function normalizeBatch(b) {
  // Cari id_fase aktif
  let id_fase = 1;
  if (b.fase_saat_ini) {
    id_fase = b.fase_saat_ini.id_fase ?? b.fase_saat_ini.id ?? 1;
  } else if (Array.isArray(b.perpindahan_fase) && b.perpindahan_fase.length) {
    id_fase = b.perpindahan_fase[b.perpindahan_fase.length - 1].id_fase;
  } else if (Array.isArray(b.fase) && b.fase.length) {
    id_fase = b.fase[b.fase.length - 1].id_fase;
  }

  const faseInfo = FASE[id_fase] ?? FASE[1];

  // Status dari BE atau kalkulasi sederhana
  let status = b.status ?? "Normal";
  // Normalisasi status dari BE kalau tidak dalam format yang dikenal
  const legacyMap = { "Aktif": "Normal", "Panen": "Sudah Dipanen", "Selesai": "Sudah Dipanen" };
  if (legacyMap[status]) status = legacyMap[status];
  if (!STATUS_LIST.includes(status)) status = "Normal";

  return {
    id_budidaya: b.id_pengelolaan ?? b.id_budidaya ?? b.id,
    kode_budidaya: b.kode_pengelolaan ?? b.kode_budidaya ?? "-",
    status,
    id_fase,
    nama_fase: faseInfo.nama,
    urutan_fase: faseInfo.urutan,
  };
}

// ---------- Fetch batches dari API ----------
async function fetchBatches() {
  const res = await fetch(API_BASE_URL + ENDPOINTS.budidaya, {
    headers: authHeaders(),
  });
  if (res.status === 401) { logout(); return []; }
  if (!res.ok) throw new Error("Gagal mengambil data");
  const json = await res.json();
  const arr = Array.isArray(json) ? json : (json.data ?? []);
  return arr.map(normalizeBatch);
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
  // Jumlah batch aktif
  const a = $("s-aktif");
  a.replaceChildren(el("span", "sum-label", "Jumlah batch aktif"), el("span", "sum-num", String(aktif().length)));
  a.removeAttribute("aria-pressed");
  pick(a, "aktif");

  // Batch aktif per fase
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

  // Status budidaya
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
  if (filter.type === "fase") return "Batch aktif pada fase " + (FASE[filter.value]?.nama ?? "-");
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