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
const LEGACY = { Aktif: "Normal", Panen: "Sudah Dipanen", Selesai: "Sudah Dipanen" }; // status versi lama

// Harus sama dengan budidaya.js
const FASE = {
  1: { nama: "Semai", urutan: 1, warna: "#8fbf4d" },
  2: { nama: "Pembibitan", urutan: 2, warna: "#3f9d6a" },
  3: { nama: "Pembesaran", urutan: 3, warna: "#2f6f3e" },
  4: { nama: "Panen", urutan: 4, warna: "#e0a526" },
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

// ---------- Ambil data ----------
// Mode uji coba: batch dibaca dari halaman Data Budidaya, jadi angkanya selalu sama.
function fromBudidaya() {
  for (const key of ["mock_budidaya", "mock_budidaya_v2"]) {
    try {
      const arr = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(arr) && arr.length) {
        return arr.map((b) => {
          const f = b.fase && b.fase[b.fase.length - 1];
          const info = FASE[f ? f.id_fase : 1] || FASE[1];
          return {
            id_budidaya: b.id_budidaya,
            kode_budidaya: b.kode_budidaya || b.kode_pengelolaan,
            status: LEGACY[b.status] || b.status,
            id_fase: f ? f.id_fase : 1,
            nama_fase: info.nama,
            urutan_fase: info.urutan,
          };
        });
      }
    } catch (_) {}
  }
  return [];
}

async function fetchBatches() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return fromBudidaya();
  }
  const res = await fetch(API_BASE_URL + ENDPOINTS.budidaya, {
    headers: { Accept: "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
  });
  if (res.status === 401) { logout(); return []; }
  if (!res.ok) throw new Error("Gagal mengambil data");
  const json = await res.json();
  return Array.isArray(json) ? json : json.data ?? [];
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