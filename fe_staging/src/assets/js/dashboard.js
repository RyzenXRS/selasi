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

// Fase master
const FASE = {
  1: { nama: "Semai",       urutan: 1, warna: "#8fbf4d" },
  2: { nama: "Peremajaan",  urutan: 2, warna: "#3f9d6a" },
  3: { nama: "Pendewasaan", urutan: 3, warna: "#2f6f3e" },
  4: { nama: "Panen",       urutan: 4, warna: "#e0a526" },
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

// ---------- State ----------
let batches = [];
let filter = { type: "aktif" };

const aktif = () => batches.filter((b) => b.status !== STATUS_AKHIR);
const jumlahFase = (id) => {
  if (id === 4) {
    return batches.filter((b) => b.id_fase === 4 || b.hasPanen || b.status === STATUS_AKHIR).length;
  }
  return aktif().filter((b) => b.id_fase === id).length;
};
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
  if (filter.type === "fase") {
    if (filter.value === 4) {
      return batches.filter((b) => b.id_fase === 4 || b.hasPanen || b.status === STATUS_AKHIR);
    }
    return aktif().filter((b) => b.id_fase === filter.value);
  }
  if (filter.type === "status") return batches.filter((b) => b.status === filter.value);
  return aktif();
}
function currentTitle() {
  if (filter.type === "fase") {
    if (filter.value === 4) return "Daftar batch yang sudah dipanen";
    return "Batch aktif pada fase " + (FASE[filter.value]?.nama ?? "-");
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
    // Seluruh baris bisa dipencet: tautan ada di kolom kode, lalu dilebarkan lewat CSS
    const tdKode = el("td");
    const a = el("a", "baris-link", b.kode_budidaya);
    a.href = "budidaya.html?id=" + encodeURIComponent(b.id_budidaya);
    tdKode.appendChild(a);
    tr.appendChild(tdKode);
    tr.appendChild(el("td", "", b.nama_fase));
    const tdStatus = el("td");
    tdStatus.appendChild(el("span", "badge " + (STATUS_CLASS[b.status] || ""), b.status));
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  });
}

let sudahMuncul = false;
function render() {
  renderCards(); renderList();
  // animasi masuk kartu hanya sekali, tidak diulang saat filter diganti
  if (!sudahMuncul) {
    sudahMuncul = true;
    setTimeout(() => document.querySelector(".home")?.classList.add("sudah"), 1600);
  }
}

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