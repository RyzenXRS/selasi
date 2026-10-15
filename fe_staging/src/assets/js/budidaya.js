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

const MS_HARI = 86400000;
const MSG_FORMAT = "Format data tidak sesuai";
const MSG_LENGKAP = "Data perlu dilengkapi";

const toDate = (s) => new Date(s + "T00:00:00");
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const isoDaysAgo = (n) => { const d = today(); d.setDate(d.getDate() - n); return iso(d); };
const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
const selisih = (a, b) => Math.max(0, Math.round((b - a) / MS_HARI));
const daysBetween = (s) => selisih(toDate(s), today());
const fmtTanggal = (s) => (s ? toDate(s).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-");
const fmtAngka = (n, d = 2) => Number(n).toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------- Data fase master (akan diganti data dari BE kalau tersedia) ----------
const PH_MIN = 5.5, PH_MAX = 6.5;
const BATAS_HARI_PINDAH = 2;

let FASE = [
  { id_fase: 1, nama_fase: "Semai",      urutan_fase: 1, durasi: 7,  meja: "Meja Persemaian" },
  { id_fase: 2, nama_fase: "Pembibitan", urutan_fase: 2, durasi: 14, meja: "Meja Pembibitan" },
  { id_fase: 3, nama_fase: "Pembesaran", urutan_fase: 3, durasi: 21, meja: "Meja Pembesaran" },
  { id_fase: 4, nama_fase: "Panen",      urutan_fase: 4, durasi: 7,  meja: "Meja Panen" },
];
const faseById = (id) => FASE.find((f) => f.id_fase === Number(id));
const STATUS_CLASS = {
  "Normal": "badge", "Perlu Diperhatikan": "badge perlu", "Mendekati Perpindahan Fase": "badge perlu",
  "Mendekati Panen": "badge panen", "Sudah Dipanen": "badge selesai",
};

// ---------- Auth headers ----------
const authHeaders = () => ({
  Accept: "application/json",
  Authorization: "Bearer " + localStorage.getItem("token"),
});

// ---------- API calls ----------
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

async function loadFaseMaster() {
  const r = await apiFetch(ENDPOINTS.fase);
  if (!r || !r.ok) return;
  const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
  if (arr.length) {
    // Merge durasi dan meja dari FASE lokal (BE mungkin tidak mengirim durasi)
    FASE = arr.map((f, i) => ({
      id_fase: f.id_fase,
      nama_fase: f.nama_fase,
      urutan_fase: f.urutan_fase ?? (i + 1),
      durasi: FASE[i]?.durasi ?? 7,
      meja: FASE[i]?.meja ?? f.nama_fase,
    })).sort((a, b) => a.urutan_fase - b.urutan_fase);
  }
}

async function fetchBatches() {
  const r = await apiFetch(ENDPOINTS.budidaya);
  if (!r || !r.ok) return [];
  const arr = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
  return arr;
}

async function fetchBatchDetail(id) {
  const r = await apiFetch(ENDPOINTS.budidaya + "/" + id);
  if (!r || !r.ok) return null;
  return r.data?.data ?? r.data;
}

async function createBatch(body) {
  const r = await apiFetch(ENDPOINTS.budidaya, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r;
}

async function updateBatch(id, body) {
  const r = await apiFetch(ENDPOINTS.budidaya + "/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r;
}

async function deleteBatch(id) {
  const r = await apiFetch(ENDPOINTS.budidaya + "/" + id, { method: "DELETE" });
  return r;
}

async function addFaseShift(batchId, body) {
  // POST /pengelolaan/{id}/fase
  const r = await apiFetch(ENDPOINTS.budidaya + "/" + batchId + "/fase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r;
}

async function updateFaseShift(shiftId, body) {
  // PUT /fase/{id} (shallow route)
  const r = await apiFetch("/fase/" + shiftId, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r;
}

async function deleteFaseShift(shiftId) {
  const r = await apiFetch("/fase/" + shiftId, { method: "DELETE" });
  return r;
}

// ---------- Normalisasi batch dari BE ----------
// BE mengembalikan perpindahan_fase sebagai array; kita normalisasi ke format internal
function normalizeBatch(b) {
  const perpindahan = b.perpindahan_fase ?? b.fase ?? [];
  return {
    id_budidaya: b.id_pengelolaan ?? b.id_budidaya ?? b.id,
    kode_pengelolaan: b.kode_pengelolaan ?? b.kode_budidaya ?? "-",
    tanggal_tanam: b.tanggal_tanam,
    jumlah_tanaman: b.jumlah_tanaman ?? 0,
    lokasi: b.lokasi ?? "",
    nilai_ph: b.nilai_ph ?? "",
    kondisi_tanaman: b.kondisi_tanaman ?? "",
    kondisi_air_nutrisi: b.kondisi_air_nutrisi ?? "",
    kondisi_instalasi: b.kondisi_instalasi ?? "",
    kondisi_lingkungan: b.kondisi_lingkungan ?? "",
    catatan: b.catatan ?? "",
    fase: perpindahan.map((p) => ({
      id_perpindahan: p.id_perpindahan ?? p.id,
      id_fase: p.id_fase,
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai ?? "",
      lokasi_tujuan: p.lokasi_tujuan ?? p.lokasi ?? "",
      catatan: p.catatan ?? "",
    })),
    _raw: b, // simpan raw untuk keperluan lain
  };
}

// ---------- Turunan data ----------
const faseAktif = (b) => b.fase[b.fase.length - 1];
const infoFase = (b) => faseById(faseAktif(b)?.id_fase) ?? FASE[0];
const hariDiFase = (b) => faseAktif(b) ? daysBetween(faseAktif(b).tanggal_mulai) : 0;
const faseNext = (b) => FASE.find((f) => f.urutan_fase === infoFase(b).urutan_fase + 1);
const perkiraan = (b) => (faseNext(b) ? addDays(faseAktif(b).tanggal_mulai, infoFase(b).durasi) : null);
const sisaHari = (b) => { const p = perkiraan(b); return p ? Math.max(0, Math.round((toDate(p) - today()) / MS_HARI)) : null; };
const lokasiTujuan = (b) => { const nx = faseNext(b); return nx ? nx.meja : "-"; };
const phDiLuar = (b) => b.nilai_ph !== "" && b.nilai_ph !== null && b.nilai_ph !== undefined && (Number(b.nilai_ph) < PH_MIN || Number(b.nilai_ph) > PH_MAX);

function hitungStatus(b) {
  if (!b.fase || b.fase.length === 0) return "Normal";
  if (phDiLuar(b)) return "Perlu Diperhatikan";
  const nx = faseNext(b);
  if (!nx) return "Mendekati Panen";
  if (sisaHari(b) !== null && sisaHari(b) <= BATAS_HARI_PINDAH) return nx.urutan_fase === FASE.length ? "Mendekati Panen" : "Mendekati Perpindahan Fase";
  return "Normal";
}

function perluPindah(b) {
  const f = infoFase(b);
  return f.urutan_fase < FASE.length && hariDiFase(b) >= f.durasi - BATAS_HARI_PINDAH;
}
const badgeClass = (b) => STATUS_CLASS[hitungStatus(b)] || "badge";

// ---------- State ----------
let data = [];       // array batch yang sudah dinormalisasi
let current = null;  // batch yang sedang dibuka
let mode = "add";    // "add" atau "edit"
let moveIdx = -1;    // -1 = tambah perpindahan, >=0 = ubah riwayat
let hDel = -1;       // id_perpindahan yang akan dihapus

function aksi(onEdit, onDel) {
  const td = el("td"), box = el("div", undefined, "row-actions");
  const mk = (t, fn, c) => { const b = el("button", t, "link-kode" + (c ? " " + c : "")); b.type = "button"; b.addEventListener("click", fn); return b; };
  box.appendChild(mk("Ubah", onEdit));
  if (onDel) box.appendChild(mk("Hapus", onDel, "link-hapus"));
  td.appendChild(box);
  return td;
}

// ---------- Tampilan ----------
function showOnly(name) { ["list", "detail", "form"].forEach((id) => show(id, id === name)); }
function notify(msg) { showAlert("notice", msg); $("notice").focus(); }

function setLoading(on) {
  show("loading", on);
}

// Halaman Daftar Batch
function showList() {
  current = null;
  showOnly("list");
  $("list-info").textContent = data.length + " batch";
  $("empty").hidden = data.length > 0;

  const rows = $("rows");
  rows.replaceChildren();
  data.forEach((b) => {
    const tr = el("tr"), td = el("td");
    const link = el("button", b.kode_pengelolaan, "link-kode");
    link.type = "button";
    link.addEventListener("click", () => showDetail(b.id_budidaya));
    td.appendChild(link);
    tr.appendChild(td);
    rows.appendChild(tr);
  });

  const due = data.filter(perluPindah);
  show("reminder", due.length > 0);
  const ul = $("reminder-list");
  ul.replaceChildren();
  due.forEach((b) => {
    const f = infoFase(b);
    ul.appendChild(el("li", `${b.kode_pengelolaan}: fase ${f.nama_fase} sudah ${hariDiFase(b)} hari (durasi sekitar ${f.durasi} hari).`));
  });
}

// Halaman Detail Batch
function showDetail(id) {
  current = data.find((b) => b.id_budidaya === id);
  if (!current) return showList();
  const b = current, f = infoFase(b), nx = faseNext(b), sisa = sisaHari(b);
  const st = hitungStatus(b);

  $("dt-kode").textContent = b.kode_pengelolaan;
  const stEl = $("dt-status");
  stEl.textContent = st;
  stEl.className = STATUS_CLASS[st] || "badge";

  $("dt-tanam").textContent = fmtTanggal(b.tanggal_tanam);
  $("dt-umur").textContent = daysBetween(b.tanggal_tanam) + " hari";
  $("dt-jumlah").textContent = b.jumlah_tanaman + " tanaman";
  $("dt-lokasi").textContent = b.lokasi || "-";
  $("dt-ph").textContent = b.nilai_ph === undefined || b.nilai_ph === "" ? "-" : fmtAngka(b.nilai_ph);
  $("dt-kondisi").textContent = b.kondisi_tanaman || "-";
  $("dt-air").textContent = b.kondisi_air_nutrisi || "-";
  $("dt-instalasi").textContent = b.kondisi_instalasi || "-";
  $("dt-lingkungan").textContent = b.kondisi_lingkungan || "-";
  $("dt-catatan").textContent = b.catatan || "-";

  $("dt-fase").textContent = f.nama_fase;
  $("dt-next").textContent = nx ? nx.nama_fase : "-";
  $("dt-perkiraan").textContent = fmtTanggal(perkiraan(b));
  $("dt-sisa").textContent = sisa === null ? "-" : sisa + " hari";
  $("dt-tujuan").textContent = lokasiTujuan(b);
  $("dt-status-text").textContent = st;

  $("dt-dasar").replaceChildren(
    el("li", phDiLuar(b)
      ? `Nilai pH ${fmtAngka(b.nilai_ph)} di luar rentang ${fmtAngka(PH_MIN, 1)} sampai ${fmtAngka(PH_MAX, 1)}.`
      : `Nilai pH ${b.nilai_ph !== "" && b.nilai_ph !== null ? fmtAngka(b.nilai_ph) : "-"} masih dalam rentang normal.`),
    el("li", `Sudah ${hariDiFase(b)} hari di fase ${f.nama_fase} (durasi sekitar ${f.durasi} hari).`),
    el("li", nx ? `Sisa waktu menuju ${nx.nama_fase}: ${sisa} hari.` : "Sudah di fase terakhir, tidak ada perpindahan lagi."),
  );

  $("btn-move").disabled = !nx;
  ["confirm", "h-confirm", "move"].forEach((x) => show(x, false));
  ["h-alert", "move-alert"].forEach(hideAlert);
  renderHist();
  showOnly("detail");
}

// ---------- Riwayat perpindahan fase ----------
function renderHist() {
  const rows = $("hist-rows");
  rows.replaceChildren();
  current.fase.forEach((h, i) => {
    const nxt = current.fase[i + 1];
    const selesai = h.tanggal_selesai || (nxt ? nxt.tanggal_mulai : "");
    const lama = selisih(toDate(h.tanggal_mulai), selesai ? toDate(selesai) : today());
    const cat = [h.lokasi_tujuan && "Ke " + h.lokasi_tujuan, h.catatan].filter(Boolean).join(" · ") || "-";
    const namaFase = faseById(h.id_fase)?.nama_fase ?? "Fase " + h.id_fase;
    const tr = el("tr");
    tr.append(el("td", String(i + 1)), el("td", namaFase), el("td", fmtTanggal(h.tanggal_mulai)),
      el("td", selesai ? fmtTanggal(selesai) : "Berjalan"), el("td", lama + " hari"), el("td", cat),
      aksi(() => openMove(i), i > 0 ? () => askDelHist(i) : null));
    rows.appendChild(tr);
  });
}

function openMove(idx) {
  moveIdx = idx;
  hideAlert("move-alert"); hideAlert("h-alert"); hideAlert("notice"); show("h-confirm", false);
  const h = idx >= 0 ? current.fase[idx] : {};
  $("m-title").textContent = idx >= 0 ? "Ubah perpindahan fase" : "Tambah perpindahan fase";
  const sel = $("m-fase");
  sel.replaceChildren();
  FASE.forEach((f) => { const o = el("option", f.nama_fase); o.value = f.id_fase; sel.appendChild(o); });
  sel.value = idx >= 0 ? h.id_fase : (faseNext(current) || infoFase(current)).id_fase;
  $("m-tgl").value = h.tanggal_mulai || iso(today());
  $("m-selesai").value = h.tanggal_selesai || "";
  show("m-selesai-field", idx >= 0);
  $("m-lokasi").value = idx >= 0 ? (h.lokasi_tujuan || "") : faseById(Number(sel.value))?.meja ?? "";
  $("m-cat").value = h.catatan || "";
  show("move");
  sel.focus();
}

function askDelHist(i) {
  hDel = i;
  const namaFase = faseById(current.fase[i].id_fase)?.nama_fase ?? "fase";
  $("h-confirm-text").textContent = `Hapus riwayat fase ${namaFase}?`;
  show("h-confirm");
}

// ---------- Form tambah (UC6) / ubah (UC8) ----------
const fld = (id) => $(id).closest(".field");

function showForm(editing) {
  mode = editing ? "edit" : "add";
  hideAlert("form-alert");
  $("form-title").textContent = editing ? "Ubah data budidaya" : "Tambah budidaya";
  const b = editing ? current : {};

  $("f-kode").value = b.kode_pengelolaan || "";
  $("f-tanam").value = b.tanggal_tanam || iso(today());
  $("f-jumlah").value = b.jumlah_tanaman || "";
  $("f-lokasi").value = b.lokasi || "";
  $("f-ph").value = b.nilai_ph === undefined ? "" : b.nilai_ph;
  $("f-kondisi").value = b.kondisi_tanaman || "";
  $("f-air").value = b.kondisi_air_nutrisi || "";
  $("f-instalasi").value = b.kondisi_instalasi || "";
  $("f-lingkungan").value = b.kondisi_lingkungan || "";
  $("f-catatan").value = b.catatan || "";

  fld("f-kode").hidden = editing;
  fld("f-tanam").hidden = editing;

  showOnly("form");
  (editing ? $("f-jumlah") : $("f-kode")).focus();
}

// ---------- Aksi ----------
$("btn-add").addEventListener("click", () => { hideAlert("notice"); showForm(false); });
$("btn-edit").addEventListener("click", () => { hideAlert("notice"); showForm(true); });
$("btn-back").addEventListener("click", showList);
$("btn-cancel").addEventListener("click", () => (mode === "edit" && current ? showDetail(current.id_budidaya) : showList()));
$("btn-logout").addEventListener("click", logout);

// Hapus batch (UC9)
$("btn-delete").addEventListener("click", () => {
  $("confirm-text").textContent = `Hapus batch ${current.kode_pengelolaan}? Riwayat fase dan data panennya ikut terhapus.`;
  show("confirm");
});
$("btn-no").addEventListener("click", () => show("confirm", false));
$("btn-yes").addEventListener("click", async () => {
  show("confirm", false);
  const id = current._raw?.id_pengelolaan ?? current.id_budidaya;
  const r = await deleteBatch(id);
  if (!r) return;
  if (!r.ok) return showAlert("notice", r.data?.message || "Gagal menghapus batch.");
  data = data.filter((b) => b.id_budidaya !== current.id_budidaya);
  showList();
  notify("Data budidaya berhasil dihapus.");
});

// Perpindahan fase
$("btn-move").addEventListener("click", () => openMove(-1));
$("m-cancel").addEventListener("click", () => show("move", false));
$("m-fase").addEventListener("change", () => {
  if (moveIdx < 0) $("m-lokasi").value = faseById(Number($("m-fase").value))?.meja ?? "";
});
$("h-no").addEventListener("click", () => show("h-confirm", false));
$("h-yes").addEventListener("click", async () => {
  show("h-confirm", false);
  const h = current.fase[hDel];
  if (!h) return;
  const shiftId = h.id_perpindahan;
  const r = await deleteFaseShift(shiftId);
  if (!r) return;
  if (!r.ok) {
    const detail = await fetchBatchDetail(current._raw?.id_pengelolaan ?? current.id_budidaya);
    if (detail) {
      Object.assign(current, normalizeBatch(detail));
      const idx = data.findIndex((b) => b.id_budidaya === current.id_budidaya);
      if (idx >= 0) data[idx] = current;
    }
  }
  showDetail(current.id_budidaya);
  notify("Riwayat perpindahan fase berhasil dihapus.");
});

$("move").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("move-alert");
  const add = moveIdx < 0;
  const idFase = parseInt($("m-fase").value, 10), tgl = $("m-tgl").value, sel = $("m-selesai").value;
  const lok = $("m-lokasi").value.trim(), cat = $("m-cat").value.trim();
  if (!tgl || (add && !lok)) return showAlert("move-alert", MSG_LENGKAP);

  const prev = add ? faseAktif(current) : current.fase[moveIdx - 1];
  const nxt = add ? null : current.fase[moveIdx + 1];
  const salah = toDate(tgl) > today() || (prev && tgl < prev.tanggal_mulai) || (nxt && nxt.tanggal_mulai < tgl) ||
    (add && idFase === prev?.id_fase) || (!add && sel && sel < tgl);
  if (salah) return showAlert("move-alert", MSG_FORMAT);

  const rawId = current._raw?.id_pengelolaan ?? current.id_budidaya;
  let r;
  if (add) {
    r = await addFaseShift(rawId, { id_fase: idFase, tanggal_mulai: tgl, lokasi_tujuan: lok, catatan: cat });
  } else {
    const shiftId = current.fase[moveIdx].id_perpindahan;
    r = await updateFaseShift(shiftId, { id_fase: idFase, tanggal_mulai: tgl, tanggal_selesai: sel, lokasi_tujuan: lok, catatan: cat });
  }

  if (!r) return;
  if (!r.ok) return showAlert("move-alert", r.data?.message || MSG_FORMAT);

  // Reload detail dari BE supaya data konsisten
  const detail = await fetchBatchDetail(rawId);
  if (detail) {
    const norm = normalizeBatch(detail);
    Object.assign(current, norm);
    const idx = data.findIndex((b) => b.id_budidaya === current.id_budidaya);
    if (idx >= 0) data[idx] = current;
  }
  show("move", false);
  showDetail(current.id_budidaya);
  notify(add ? "Data perpindahan fase berhasil ditambahkan." : "Data perpindahan fase berhasil diubah.");
});

// Simpan form tambah (UC6) / ubah (UC8)
$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("form-alert");

  const raw = {
    kode: $("f-kode").value.trim(), tanam: $("f-tanam").value, jumlah: $("f-jumlah").value.trim(),
    lokasi: $("f-lokasi").value.trim(), ph: $("f-ph").value.trim(),
    kondisi: $("f-kondisi").value.trim(), air: $("f-air").value.trim(),
    instalasi: $("f-instalasi").value.trim(), lingkungan: $("f-lingkungan").value.trim(),
  };
  const wajib = [raw.jumlah, raw.lokasi, raw.ph, raw.kondisi, raw.air, raw.instalasi, raw.lingkungan];
  if (mode === "add") wajib.push(raw.kode, raw.tanam);
  if (wajib.some((x) => !x)) return showAlert("form-alert", MSG_LENGKAP);

  const jumlah = Number(raw.jumlah), ph = Number(raw.ph);
  let salah = !Number.isInteger(jumlah) || jumlah < 1 || !/^\d{1,2}(\.\d{1,2})?$/.test(raw.ph) || ph > 14;
  if (mode === "add") salah = salah || toDate(raw.tanam) > today();
  if (salah) return showAlert("form-alert", MSG_FORMAT);

  const body = {
    jumlah_tanaman: jumlah,
    lokasi: raw.lokasi,
    nilai_ph: ph,
    kondisi_tanaman: raw.kondisi,
    kondisi_air_nutrisi: raw.air,
    kondisi_instalasi: raw.instalasi,
    kondisi_lingkungan: raw.lingkungan,
    catatan: $("f-catatan").value.trim(),
  };
  if (mode === "add") {
    body.kode_pengelolaan = raw.kode;
    body.tanggal_tanam = raw.tanam;
  }

  const btn = $("btn-save") ?? $("form").querySelector("button[type=submit]");
  if (btn) { btn.disabled = true; btn.textContent = "Menyimpan..."; }

  let r;
  if (mode === "add") {
    r = await createBatch(body);
  } else {
    const rawId = current._raw?.id_pengelolaan ?? current.id_budidaya;
    r = await updateBatch(rawId, body);
  }

  if (btn) { btn.disabled = false; btn.textContent = "Simpan"; }
  if (!r) return;
  if (!r.ok) {
    const errMsg = r.data?.message || (r.data?.errors ? Object.values(r.data.errors).flat().join(" ") : null) || MSG_FORMAT;
    return showAlert("form-alert", errMsg);
  }

  // Reload daftar dan tampilkan detail batch baru/yang diubah
  const saved = r.data?.data ?? r.data;
  if (mode === "add") {
    const norm = normalizeBatch(saved);
    data.push(norm);
    current = norm;
    notify("Data budidaya berhasil ditambahkan.");
    showDetail(norm.id_budidaya);
  } else {
    const norm = normalizeBatch(saved);
    const idx = data.findIndex((b) => b.id_budidaya === current.id_budidaya);
    if (idx >= 0) data[idx] = norm;
    current = norm;
    notify("Data budidaya berhasil diubah.");
    showDetail(norm.id_budidaya);
  }
});

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}

  // Tampilkan loading
  show("loading", true);

  try {
    await loadFaseMaster();
    const rawBatches = await fetchBatches();
    data = rawBatches.map(normalizeBatch);
  } catch (err) {
    showAlert("notice", "Data budidaya belum bisa dimuat. Coba muat ulang halaman.");
  }

  show("loading", false);

  const id = parseInt(new URLSearchParams(location.search).get("id"), 10);
  if (id) showDetail(id); else showList();
})();