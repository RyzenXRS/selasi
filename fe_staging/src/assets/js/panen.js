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

const MSG_FORMAT = "Format data tidak sesuai";   // dua pesan error sesuai dokumen use case
const MSG_LENGKAP = "Data perlu dilengkapi";

const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const fmtTanggal = (s) => (s ? toDate(s).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-");
const fmtAngka = (n, d = 2) => Number(n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- Data (data palsu dulu; sambungkan ke BE nanti) ----------
const BUDIDAYA_KEY = "mock_budidaya_v2";   // dikelola budidaya.js
const PANEN_KEY = "mock_panen_v1";
const load = (key, fallback) => {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (_) {}
  return fallback;
};
const save = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {} };

// panen: { id_panen, id_budidaya, kode_panen, tanggal_panen, jumlah_panen, berat_panen, kondisi_hasil_panen }
let panen = load(PANEN_KEY, []);
const batches = () => load(BUDIDAYA_KEY, []);
const batchById = (id) => batches().find((b) => b.id_budidaya === id);

// Status batch ikut berubah (dashboard membaca status dari data budidaya).
// Hanya perkiraan: budidaya.js menghitung ulang status yang tepat saat halamannya dibuka.
function setStatusBatch(id, status) {
  const all = batches(), b = all.find((x) => x.id_budidaya === id);
  if (b) { b.status = status; save(BUDIDAYA_KEY, all); }
}
const persist = () => save(PANEN_KEY, panen);

let current = null;  // data panen yang sedang dibuka
let mode = "add";    // "add" atau "edit"

// ---------- Tampilan ----------
function showOnly(name) { ["list", "detail", "form"].forEach((id) => show(id, id === name)); }
function notify(msg) { showAlert("notice", msg); $("notice").focus(); }

// Halaman Daftar Batch Panen: hanya kode_panen
function showList() {
  current = null;
  showOnly("list");
  $("list-info").textContent = panen.length + " data panen";
  $("empty").hidden = panen.length > 0;
  const rows = $("rows");
  rows.replaceChildren();
  panen.forEach((p) => {
    const tr = el("tr"), td = el("td");
    const link = el("button", p.kode_panen, "link-kode");
    link.type = "button";
    link.addEventListener("click", () => showDetail(p.id_panen));
    td.appendChild(link);
    tr.appendChild(td);
    rows.appendChild(tr);
  });
}

// Halaman Data Panen batch yang dipilih (UC11)
function showDetail(id) {
  current = panen.find((p) => p.id_panen === id);
  if (!current) return showList();
  const p = current, b = batchById(p.id_budidaya);
  $("dt-kode").textContent = p.kode_panen;
  $("dt-batch").textContent = b ? b.kode_pengelolaan : "-";
  $("dt-tgl").textContent = fmtTanggal(p.tanggal_panen);
  $("dt-jumlah").textContent = p.jumlah_panen + " tanaman";
  $("dt-berat").textContent = fmtAngka(p.berat_panen) + " kg";
  $("dt-kondisi").textContent = p.kondisi_hasil_panen;
  show("confirm", false);
  showOnly("detail");
}

// ---------- Form tambah (UC10) / ubah (UC12) ----------
const fld = (id) => $(id).closest(".field");

function showForm(editing) {
  mode = editing ? "edit" : "add";
  hideAlert("form-alert");
  $("form-title").textContent = editing ? "Ubah data panen" : "Tambah data panen";
  const p = editing ? current : {};

  if (!editing) {
    // Hanya batch yang belum punya data panen
    const sel = $("f-batch");
    sel.replaceChildren();
    batches().filter((b) => !panen.some((x) => x.id_budidaya === b.id_budidaya)).forEach((b) => {
      const o = el("option", b.kode_pengelolaan);
      o.value = b.id_budidaya;
      sel.appendChild(o);
    });
  }
  $("f-kode").value = p.kode_panen || "";
  $("f-tgl").value = p.tanggal_panen || iso(today());
  $("f-jumlah").value = p.jumlah_panen || "";
  $("f-berat").value = p.berat_panen || "";
  $("f-kondisi").value = p.kondisi_hasil_panen || "";

  // UC12: form ubah hanya 4 field (tanpa kode_panen; batch juga tidak bisa diganti)
  fld("f-batch").hidden = editing;
  fld("f-kode").hidden = editing;

  showOnly("form");
  (editing ? $("f-tgl") : $("f-kode")).focus();
}

// ---------- Aksi ----------
$("btn-add").addEventListener("click", () => {
  hideAlert("notice"); hideAlert("alert");
  const ada = batches().some((b) => !panen.some((x) => x.id_budidaya === b.id_budidaya));
  if (!ada) return showAlert("alert", "Belum ada batch budidaya yang bisa dicatat panennya.");
  showForm(false);
});
$("btn-edit").addEventListener("click", () => { hideAlert("notice"); showForm(true); });
$("btn-back").addEventListener("click", showList);
$("btn-cancel").addEventListener("click", () => (mode === "edit" && current ? showDetail(current.id_panen) : showList()));
$("btn-logout").addEventListener("click", logout);

// Hapus (UC13): Hapus -> konfirmasi -> Konfirmasi (kembali ke daftar) / Batal (kembali ke detail)
$("btn-delete").addEventListener("click", () => {
  $("confirm-text").textContent = `Hapus data panen ${current.kode_panen}?`;
  show("confirm");
});
$("btn-no").addEventListener("click", () => show("confirm", false));
$("btn-yes").addEventListener("click", () => {
  const idBatch = current.id_budidaya;
  panen = panen.filter((p) => p.id_panen !== current.id_panen);
  persist();
  setStatusBatch(idBatch, "Normal");
  showList();
  notify("Data panen berhasil dihapus.");
});

$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  hideAlert("form-alert");

  const raw = {
    batch: $("f-batch").value, kode: $("f-kode").value.trim(), tgl: $("f-tgl").value,
    jumlah: $("f-jumlah").value.trim(), berat: $("f-berat").value.trim(), kondisi: $("f-kondisi").value.trim(),
  };
  const wajib = [raw.tgl, raw.jumlah, raw.berat, raw.kondisi];
  if (mode === "add") wajib.push(raw.batch, raw.kode);
  if (wajib.some((x) => !x)) return showAlert("form-alert", MSG_LENGKAP);

  const idBatch = mode === "add" ? parseInt(raw.batch, 10) : current.id_budidaya;
  const b = batchById(idBatch);
  const jumlah = Number(raw.jumlah), berat = Number(raw.berat);
  let salah = toDate(raw.tgl) > today() || (b && raw.tgl < b.tanggal_tanam) ||
    !Number.isInteger(jumlah) || jumlah < 1 ||
    !(berat > 0) || !/^\d{1,8}(\.\d{1,2})?$/.test(raw.berat);   // Decimal (10,2)
  if (mode === "add") {
    salah = salah || panen.some((p) => p.kode_panen.toLowerCase() === raw.kode.toLowerCase());
  }
  if (salah) return showAlert("form-alert", MSG_FORMAT);

  const fields = { tanggal_panen: raw.tgl, jumlah_panen: jumlah, berat_panen: berat, kondisi_hasil_panen: raw.kondisi };

  if (mode === "add") {
    const id = panen.reduce((m, p) => Math.max(m, p.id_panen), 0) + 1;
    panen.push({ id_panen: id, id_budidaya: idBatch, kode_panen: raw.kode, ...fields });
    persist();
    setStatusBatch(idBatch, "Sudah Dipanen");
    showDetail(id);   // UC10: tampilkan halaman data panen yang baru dibuat
    notify("Data panen berhasil ditambahkan.");
  } else {
    Object.assign(current, fields);
    persist();
    showDetail(current.id_panen);
    notify("Data panen berhasil diubah.");
  }
});

// ---------- Mulai ----------
(function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}
  showList();
})();