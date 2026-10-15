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

const MSG_FORMAT = "Format data tidak sesuai";
const MSG_LENGKAP = "Data perlu dilengkapi";

const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const fmtTanggal = (s) => (s ? toDate(s).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-");
const fmtAngka = (n, d = 2) => Number(n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- Auth headers ----------
const authHeaders = () => ({
  Accept: "application/json",
  Authorization: "Bearer " + localStorage.getItem("token"),
});

async function apiFetch(path, opts = {}) {
  const res = await fetch(API_BASE_URL + path, {
    headers: { ...authHeaders(), ...(opts.headers || {}) },
    ...opts,
  });
  if (res.status === 401) { logout(); return null; }
  let json = {};
  try { json = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data: json };
}

// ---------- State ----------
// panen: list dari semua data panen (dari semua batch)
// batches: list batch (id_pengelolaan, kode_pengelolaan)
let panen = [];
let batches = [];
let current = null;
let mode = "add";

// ---------- Normalisasi ----------
function normalizePanen(p) {
  return {
    id_panen: p.id_panen ?? p.id,
    id_budidaya: p.id_pengelolaan ?? p.id_budidaya,
    kode_panen: p.kode_panen ?? ("PNS-" + String(p.id_panen ?? p.id).padStart(3, "0")),
    tanggal_panen: p.tanggal_panen,
    jumlah_panen: p.jumlah_panen ?? 0,
    berat_panen: p.berat_total_kg ?? p.berat_panen ?? 0,
    kondisi_hasil_panen: p.kualitas ?? p.kondisi_hasil_panen ?? "-",
    catatan: p.catatan ?? "",
    _raw: p,
  };
}

function normalizeBatch(b) {
  return {
    id_budidaya: b.id_pengelolaan ?? b.id_budidaya ?? b.id,
    kode_pengelolaan: b.kode_pengelolaan ?? b.kode_budidaya ?? "-",
  };
}

// ---------- API calls ----------
async function loadAllPanen() {
  // Tidak ada endpoint GET /panen global di BE, jadi kita ambil per batch
  // Ambil dulu semua batch, lalu ambil panen per batch
  const r = await apiFetch(ENDPOINTS.budidaya);
  if (!r || !r.ok) return;

  const rawBatches = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
  batches = rawBatches.map(normalizeBatch);

  // Ambil panen dari masing-masing batch yang punya panen
  const allPanen = [];
  for (const b of rawBatches) {
    const bId = b.id_pengelolaan ?? b.id_budidaya ?? b.id;
    // Cek apakah batch sudah punya data panen dari detail batch (kalau ada field panen di list)
    if (b.panen && Array.isArray(b.panen)) {
      b.panen.forEach((p) => {
        allPanen.push(normalizePanen({ ...p, id_pengelolaan: bId }));
      });
    }
  }

  // Kalau data panen tidak diembed di list batch, coba fetch /pengelolaan/{id}/panen per batch
  // Tapi itu terlalu banyak request. Alternatif: fetch detail batch satu-satu hanya yang punya status panen.
  // Untuk sekarang kita pakai data yang diembed; kalau kosong, fetch batch detail
  if (allPanen.length === 0 && rawBatches.length > 0) {
    for (const b of rawBatches) {
      const bId = b.id_pengelolaan ?? b.id_budidaya ?? b.id;
      const dr = await apiFetch(ENDPOINTS.budidaya + "/" + bId);
      if (!dr || !dr.ok) continue;
      const detail = dr.data?.data ?? dr.data;
      const panenArr = detail?.panen ?? detail?.harvests ?? [];
      panenArr.forEach((p) => {
        allPanen.push(normalizePanen({ ...p, id_pengelolaan: bId }));
      });
    }
  }

  panen = allPanen;
}

async function createPanen(batchId, body) {
  // POST /pengelolaan/{id}/panen
  const r = await apiFetch(ENDPOINTS.budidaya + "/" + batchId + "/panen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r;
}

async function updatePanen(panenId, body) {
  // PUT /panen/{id} (shallow route)
  const r = await apiFetch("/panen/" + panenId, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r;
}

async function deletePanen(panenId) {
  const r = await apiFetch("/panen/" + panenId, { method: "DELETE" });
  return r;
}

// ---------- Tampilan ----------
function showOnly(name) { ["list", "detail", "form"].forEach((id) => show(id, id === name)); }
function notify(msg) { showAlert("notice", msg); $("notice").focus(); }

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

function showDetail(id) {
  current = panen.find((p) => p.id_panen === id);
  if (!current) return showList();
  const p = current;
  const b = batches.find((x) => x.id_budidaya === p.id_budidaya);
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
    batches.filter((b) => !panen.some((x) => x.id_budidaya === b.id_budidaya)).forEach((b) => {
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

  fld("f-batch").hidden = editing;
  fld("f-kode").hidden = editing;

  showOnly("form");
  (editing ? $("f-tgl") : $("f-kode")).focus();
}

// ---------- Aksi ----------
$("btn-add").addEventListener("click", () => {
  hideAlert("notice"); hideAlert("alert");
  const ada = batches.some((b) => !panen.some((x) => x.id_budidaya === b.id_budidaya));
  if (!ada) return showAlert("alert", "Belum ada batch budidaya yang bisa dicatat panennya.");
  showForm(false);
});
$("btn-edit").addEventListener("click", () => { hideAlert("notice"); showForm(true); });
$("btn-back").addEventListener("click", showList);
$("btn-cancel").addEventListener("click", () => (mode === "edit" && current ? showDetail(current.id_panen) : showList()));
$("btn-logout").addEventListener("click", logout);

// Hapus (UC13)
$("btn-delete").addEventListener("click", () => {
  $("confirm-text").textContent = `Hapus data panen ${current.kode_panen}?`;
  show("confirm");
});
$("btn-no").addEventListener("click", () => show("confirm", false));
$("btn-yes").addEventListener("click", async () => {
  show("confirm", false);
  const panenId = current._raw?.id_panen ?? current.id_panen;
  const r = await deletePanen(panenId);
  if (!r) return;
  if (!r.ok) return showAlert("notice", r.data?.message || "Gagal menghapus data panen.");
  panen = panen.filter((p) => p.id_panen !== current.id_panen);
  showList();
  notify("Data panen berhasil dihapus.");
});

$("form").addEventListener("submit", async (e) => {
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
  const b = batches.find((x) => x.id_budidaya === idBatch);
  const jumlah = Number(raw.jumlah), berat = Number(raw.berat);
  let salah = toDate(raw.tgl) > today() ||
    !Number.isInteger(jumlah) || jumlah < 1 ||
    !(berat > 0) || !/^\d{1,8}(\.\d{1,2})?$/.test(raw.berat);
  if (salah) return showAlert("form-alert", MSG_FORMAT);

  const body = {
    tanggal_panen: raw.tgl,
    jumlah_panen: jumlah,
    berat_total_kg: berat,
    kualitas: raw.kondisi,
    catatan: "",
  };
  if (mode === "add") body.kode_panen = raw.kode;

  const btn = $("btn-save") ?? $("form").querySelector("button[type=submit]");
  if (btn) { btn.disabled = true; btn.textContent = "Menyimpan..."; }

  let r;
  if (mode === "add") {
    r = await createPanen(idBatch, body);
  } else {
    const panenId = current._raw?.id_panen ?? current.id_panen;
    r = await updatePanen(panenId, body);
  }

  if (btn) { btn.disabled = false; btn.textContent = "Simpan"; }
  if (!r) return;
  if (!r.ok) {
    const errMsg = r.data?.message || (r.data?.errors ? Object.values(r.data.errors).flat().join(" ") : null) || MSG_FORMAT;
    return showAlert("form-alert", errMsg);
  }

  const saved = r.data?.data ?? r.data;
  const norm = normalizePanen({ ...saved, id_pengelolaan: idBatch });

  if (mode === "add") {
    panen.push(norm);
    current = norm;
    notify("Data panen berhasil ditambahkan.");
    showDetail(norm.id_panen);
  } else {
    const idx = panen.findIndex((p) => p.id_panen === current.id_panen);
    if (idx >= 0) panen[idx] = norm;
    current = norm;
    notify("Data panen berhasil diubah.");
    showDetail(norm.id_panen);
  }
});

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}

  show("loading", true);
  try {
    await loadAllPanen();
  } catch (err) {
    showAlert("alert", "Data panen belum bisa dimuat. Coba muat ulang halaman.");
  }
  show("loading", false);

  showList();
})();