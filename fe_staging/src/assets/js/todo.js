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
function notify(msg) { showAlert("notice", msg); $("notice").focus(); }

const MSG_FORMAT = "Format data tidak sesuai";
const MSG_LENGKAP = "Data perlu dilengkapi";

const pad = (n) => String(n).padStart(2, "0");
const isoToday = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const fmtHariIni = () => new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

let todos = []; // kegiatan hari ini: { id_todo, nama_tugas, status }

// ---------- Data palsu untuk fallback (USE_MOCK = true) ----------
const MOCK_TASKS = "mock_todo_tugas_v2";
const MOCK_DONE = "mock_todo_selesai_v2";

const readJSON = (key, fallback) => {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (_) {}
  return fallback;
};
const writeJSON = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {} };
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function mockTasks() {
  let arr = readJSON(MOCK_TASKS, null);
  if (!arr) {
    arr = [
      { id_todo: 1, nama_tugas: "Cek pH dan nutrisi air" },
      { id_todo: 2, nama_tugas: "Bersihkan instalasi pipa" },
      { id_todo: 3, nama_tugas: "Catat kondisi tanaman pagi hari" },
    ];
    writeJSON(MOCK_TASKS, arr);
  }
  return arr;
}
const mockDoneToday = () => (readJSON(MOCK_DONE, {})[isoToday()] || []);

// ---------- Panggilan ke BE ----------
const TODO_PATH = (typeof ENDPOINTS !== "undefined" && ENDPOINTS.todo) || "/to-do";

async function fetchTodos() {
  if (USE_MOCK) {
    await delay(250);
    const done = mockDoneToday();
    return mockTasks().map((t) => ({ ...t, status: done.includes(t.id_todo) }));
  }

  const res = await apiFetch(TODO_PATH + "?per_page=100");
  if (!res || !res.ok) throw new Error("Gagal mengambil daftar tugas");
  const json = await res.json();
  const d = json.data ?? json;
  const rows = Array.isArray(d) ? d : (d.data || []);

  return rows
    .filter((t) => !t.tanggal_tugas || String(t.tanggal_tugas).slice(0, 10) === isoToday())
    .map((t) => ({
      id_todo: t.id_todo || t.id,
      nama_tugas: t.nama_tugas || t.title,
      tanggal_tugas: t.tanggal_tugas || t.task_date,
      status: !!t.status,
    }));
}

// Tambah kegiatan: kirim nama_tugas dan tanggal_tugas hari ini
async function createTodo(nama) {
  if (USE_MOCK) {
    await delay(400);
    const arr = mockTasks();
    const item = { id_todo: arr.reduce((m, t) => Math.max(m, t.id_todo), 0) + 1, nama_tugas: nama };
    arr.push(item);
    writeJSON(MOCK_TASKS, arr);
    return { ...item, status: false };
  }

  const res = await apiFetch(TODO_PATH, {
    method: "POST",
    body: JSON.stringify({
      nama_tugas: nama,
      tanggal_tugas: isoToday(),
      status: false,
    }),
  });
  if (!res) return null;
  if (res.status === 422) throw new Error(MSG_FORMAT);
  let json = {};
  try { json = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(json.message || "Kegiatan gagal disimpan.");
  const item = json.data ?? json;
  return {
    id_todo: item.id_todo || item.id,
    nama_tugas: item.nama_tugas || item.title,
    tanggal_tugas: item.tanggal_tugas || item.task_date,
    status: !!item.status,
  };
}

// Centang atau batal centang kegiatan
async function setStatus(id, checked) {
  if (USE_MOCK) {
    await delay(150);
    const all = readJSON(MOCK_DONE, {});
    const set = new Set(all[isoToday()] || []);
    checked ? set.add(id) : set.delete(id);
    all[isoToday()] = [...set];
    writeJSON(MOCK_DONE, all);
    return;
  }

  // Gunakan endpoint complete jika checked, atau update status jika uncheck
  let res;
  if (checked) {
    res = await apiFetch(TODO_PATH + "/" + id + "/complete", { method: "POST" });
  } else {
    res = await apiFetch(TODO_PATH + "/" + id, {
      method: "PUT",
      body: JSON.stringify({ status: false }),
    });
  }

  if (!res || !res.ok) throw new Error("Status kegiatan gagal diperbarui.");
}

// ---------- Tampilan: daftar kegiatan (UC14) ----------
function makeItem(t) {
  const done = !!t.status;
  const li = el("li", undefined, "todo-item" + (done ? " done" : ""));
  const label = el("label");
  const cb = el("input");
  cb.type = "checkbox";
  cb.checked = done;
  cb.dataset.id = t.id_todo;
  cb.addEventListener("change", () => toggle(t.id_todo, cb.checked));
  label.append(cb, el("span", t.nama_tugas, "nama"));
  li.appendChild(label);
  return li;
}

function fillList(listId, emptyId, items) {
  const ul = $(listId);
  ul.replaceChildren();
  items.forEach((t) => ul.appendChild(makeItem(t)));
  show(emptyId, items.length === 0);
}

function render() {
  $("date-title").textContent = "Hari ini, " + fmtHariIni();
  const belum = todos.filter((t) => !t.status);
  const selesai = todos.filter((t) => t.status);

  $("n-belum").textContent = belum.length;
  $("n-selesai").textContent = selesai.length;
  $("empty-belum").textContent = todos.length && !belum.length
    ? "Semua kegiatan hari ini sudah selesai."
    : "Belum ada kegiatan. Tekan Tambah Kegiatan untuk mulai.";
  fillList("list-belum", "empty-belum", belum);
  fillList("list-selesai", "empty-selesai", selesai);
}

async function toggle(id, checked) {
  hideAlert("alert");
  hideAlert("notice");
  try {
    await setStatus(id, checked);
    const t = todos.find((x) => x.id_todo === id);
    if (t) t.status = checked;
  } catch (err) {
    showAlert("alert", err.message || "Status kegiatan gagal diperbarui.");
  }
  render();
  const cb = document.querySelector('input[data-id="' + id + '"]');
  if (cb) cb.focus();
}

// ---------- Tambah kegiatan (UC15) ----------
$("btn-add").addEventListener("click", () => {
  hideAlert("notice");
  hideAlert("form-alert");
  $("f-nama").value = "";
  show("form");
  $("f-nama").focus();
});

// Batal: kembali ke halaman To-Do List tanpa menyimpan
$("f-cancel").addEventListener("click", () => show("form", false));

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("form-alert");
  const nama = $("f-nama").value.trim();

  // Alternative flow: data tidak lengkap
  if (!nama) return showAlert("form-alert", MSG_LENGKAP);
  // Alternative flow: format data tidak sesuai (maksimal 150 karakter)
  if (nama.length > 150) return showAlert("form-alert", MSG_FORMAT);

  const btn = $("btn-save");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    const item = await createTodo(nama);
    if (!item) return;
    if (item.status === undefined) item.status = false;
    todos.push(item);

    show("form", false);
    render();
    notify("Kegiatan berhasil ditambahkan.");
  } catch (err) {
    showAlert("form-alert", err.message || "Tidak bisa terhubung ke server. Coba lagi nanti.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan";
  }
});

$("btn-logout").addEventListener("click", logout);

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}

  render();
  try {
    const data = await fetchTodos();
    if (data) { todos = data; render(); }
  } catch (err) {
    showAlert("alert", "Daftar kegiatan belum bisa dimuat. Coba muat ulang halaman.");
  }
})();