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

// ---------- Aturan status ----------
const PH_MIN = 5.5, PH_MAX = 6.5;
const BATAS_HARI_PINDAH = 2;

const FASE = [
  { id_fase: 1, nama_fase: "Semai", urutan_fase: 1, durasi: 7, meja: "Meja Persemaian" },
  { id_fase: 2, nama_fase: "Pembibitan", urutan_fase: 2, durasi: 14, meja: "Meja Pembibitan" },
  { id_fase: 3, nama_fase: "Pembesaran", urutan_fase: 3, durasi: 21, meja: "Meja Pembesaran" },
  { id_fase: 4, nama_fase: "Panen", urutan_fase: 4, durasi: 7, meja: "Meja Panen" },
];
const faseById = (id) => FASE.find((f) => f.id_fase === id);
const STATUS_CLASS = {
  "Normal": "badge", "Perlu Diperhatikan": "badge perlu", "Mendekati Perpindahan Fase": "badge perlu",
  "Mendekati Panen": "badge panen", "Sudah Dipanen": "badge selesai",
};

// ---------- State ----------
let data = [];     // batch list dari BE
let current = null;  // batch yang sedang dibuka (detail)
let mode = "add";    // "add" atau "edit"
let moveIdx = -1;    // -1 = tambah perpindahan, >=0 = ubah riwayat
let hDel = -1;       // indeks riwayat yang akan dihapus

// ---------- Mapping data dari BE ----------
// BE CultivationBatchResource -> format internal frontend
function mapBatch(b) {
  const faseArr = (b.perpindahan_fase || []).map((f) => ({
    id_perpindahan: f.id_perpindahan || f.id,
    id_fase: f.id_fase,
    tanggal_mulai: f.tanggal_mulai,
    tanggal_selesai: f.tanggal_selesai || "",
    catatan: f.catatan || "",
    lokasi_tujuan: "",
  })).sort((a, c) => (a.tanggal_mulai || "").localeCompare(c.tanggal_mulai || ""));

  const panenArr = (b.panen || []).map((p) => ({
    id_panen: p.id_panen || p.id,
    id_budidaya: b.id_pengelolaan || b.id,
    tanggal_panen: p.tanggal_panen || p.harvest_date,
    jumlah_panen: p.jumlah_panen || p.quantity,
    berat_panen: p.berat_total_kg || p.total_weight,
    kualitas: p.kualitas || p.quality,
    catatan: p.catatan || "",
  }));

  return {
    id_budidaya: b.id_pengelolaan || b.id,
    kode_pengelolaan: b.kode_pengelolaan || b.batch_code,
    tanggal_tanam: b.tanggal_tanam || b.seed_date,
    jumlah_tanaman: b.jumlah_tanaman || b.plant_quantity,
    lokasi: b.lokasi || b.location || "",
    kondisi_tanaman: b.kondisi_tanaman || "",
    kondisi_air_nutrisi: b.kondisi_air_nutrisi || "",
    kondisi_instalasi: b.kondisi_instalasi || "",
    kondisi_lingkungan: b.kondisi_lingkungan || "",
    nilai_ph: b.nilai_ph,
    catatan: b.catatan || "",
    fase: faseArr,
    _panen: panenArr,
  };
}

// ---------- Turunan data ----------
const faseAktif = (b) => b.fase[b.fase.length - 1];
const infoFase = (b) => faseById(faseAktif(b).id_fase);
const hariDiFase = (b) => daysBetween(faseAktif(b).tanggal_mulai);
const faseNext = (b) => FASE.find((f) => f.urutan_fase === infoFase(b).urutan_fase + 1);
const perkiraan = (b) => (faseNext(b) ? addDays(faseAktif(b).tanggal_mulai, infoFase(b).durasi) : null);
const sisaHari = (b) => { const p = perkiraan(b); return p ? Math.max(0, Math.round((toDate(p) - today()) / MS_HARI)) : null; };
const lokasiTujuan = (b) => { const nx = faseNext(b); return nx ? nx.meja : "-"; };
const sudahPanen = (b) => Array.isArray(b._panen) && b._panen.length > 0;
const phDiLuar = (b) => Number(b.nilai_ph) < PH_MIN || Number(b.nilai_ph) > PH_MAX;

function hitungStatus(b) {
  if (sudahPanen(b)) return "Sudah Dipanen";
  if (phDiLuar(b)) return "Perlu Diperhatikan";
  const nx = faseNext(b);
  if (!nx) return "Mendekati Panen";
  if (sisaHari(b) <= BATAS_HARI_PINDAH) return nx.urutan_fase === FASE.length ? "Mendekati Panen" : "Mendekati Perpindahan Fase";
  return "Normal";
}

function refreshStatus() {
  data.forEach((b) => { b.status = hitungStatus(b); });
}

function perluPindah(b) {
  if (!b.fase || !b.fase.length) return false;
  const f = infoFase(b);
  return !sudahPanen(b) && f.urutan_fase < FASE.length && hariDiFase(b) >= f.durasi - BATAS_HARI_PINDAH;
}
const badgeClass = (b) => STATUS_CLASS[b.status] || "badge";

// ---------- Panggilan API ----------
async function fetchBatches() {
  const res = await apiFetch(ENDPOINTS.budidaya + "?per_page=100");
  if (!res) return [];
  if (!res.ok) throw new Error("Gagal mengambil data");
  const json = await res.json();
  return (json.data || []).map(mapBatch);
}

async function fetchBatchDetail(id) {
  const res = await apiFetch(ENDPOINTS.budidaya + "/" + id);
  if (!res) return null;
  if (!res.ok) throw new Error("Gagal mengambil detail batch");
  const json = await res.json();
  return mapBatch(json.data || json);
}

async function apiCreateBatch(fields) {
  const res = await apiFetch(ENDPOINTS.budidaya, {
    method: "POST",
    body: JSON.stringify(fields),
  });
  if (!res) return null;
  if (res.status === 422) throw new Error(MSG_FORMAT);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Gagal menyimpan data");
  return mapBatch(json.data || json);
}

async function apiUpdateBatch(id, fields) {
  const res = await apiFetch(ENDPOINTS.budidaya + "/" + id, {
    method: "PUT",
    body: JSON.stringify(fields),
  });
  if (!res) return null;
  if (res.status === 422) throw new Error(MSG_FORMAT);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Gagal memperbarui data");
  return mapBatch(json.data || json);
}

async function apiDeleteBatch(id) {
  const res = await apiFetch(ENDPOINTS.budidaya + "/" + id, { method: "DELETE" });
  if (!res) return false;
  if (!res.ok) throw new Error("Gagal menghapus data");
  return true;
}

async function apiAddPhase(batchId, fields) {
  const res = await apiFetch(ENDPOINTS.budidaya + "/" + batchId + "/fase", {
    method: "POST",
    body: JSON.stringify(fields),
  });
  if (!res) return null;
  if (res.status === 422) throw new Error(MSG_FORMAT);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Gagal menyimpan perpindahan fase");
  return json.data || json;
}

async function apiUpdatePhase(phaseId, fields) {
  // Phase update via shallow resource: PUT /api/v1/fase/{id}
  const res = await apiFetch("/fase/" + phaseId, {
    method: "PUT",
    body: JSON.stringify(fields),
  });
  if (!res) return null;
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Gagal memperbarui fase");
  return json.data || json;
}

async function apiDeletePhase(phaseId) {
  const res = await apiFetch("/fase/" + phaseId, { method: "DELETE" });
  if (!res) return false;
  if (!res.ok) throw new Error("Gagal menghapus fase");
  return true;
}

// ---------- Helper: reload detail dari BE ----------
async function reloadDetail(id) {
  const fresh = await fetchBatchDetail(id);
  if (!fresh) return;
  fresh.status = hitungStatus(fresh);
  // Update in data list
  const idx = data.findIndex((b) => b.id_budidaya === id);
  if (idx >= 0) data[idx] = fresh;
  else data.push(fresh);
  current = fresh;
}

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

// Halaman Daftar Batch Pengelolaan
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

// Halaman Pengelolaan Data Budidaya (UC7)
async function showDetail(id) {
  // Ambil detail terbaru dari BE
  try {
    await reloadDetail(id);
  } catch (_) {}

  current = data.find((b) => b.id_budidaya === id);
  if (!current) return showList();
  if (!current.fase || !current.fase.length) {
    // Batch tanpa fase, tetap tampilkan data dasar
    current.fase = [{ id_fase: 1, tanggal_mulai: current.tanggal_tanam }];
  }

  const b = current, f = infoFase(b), nx = faseNext(b), sisa = sisaHari(b);

  $("dt-kode").textContent = b.kode_pengelolaan;
  const st = $("dt-status");
  st.textContent = b.status;
  st.className = badgeClass(b);

  $("dt-tanam").textContent = fmtTanggal(b.tanggal_tanam);
  $("dt-umur").textContent = daysBetween(b.tanggal_tanam) + " hari";
  $("dt-jumlah").textContent = b.jumlah_tanaman + " tanaman";
  $("dt-lokasi").textContent = b.lokasi || "-";
  $("dt-ph").textContent = b.nilai_ph === undefined || b.nilai_ph === "" || b.nilai_ph === null ? "-" : fmtAngka(b.nilai_ph);
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
  $("dt-status-text").textContent = b.status;

  $("dt-dasar").replaceChildren(
    el("li", phDiLuar(b)
      ? `Nilai pH ${fmtAngka(b.nilai_ph)} di luar rentang ${fmtAngka(PH_MIN, 1)} sampai ${fmtAngka(PH_MAX, 1)}.`
      : `Nilai pH ${fmtAngka(b.nilai_ph)} masih dalam rentang ${fmtAngka(PH_MIN, 1)} sampai ${fmtAngka(PH_MAX, 1)}.`),
    el("li", `Sudah ${hariDiFase(b)} hari di fase ${f.nama_fase} (durasi sekitar ${f.durasi} hari).`),
    el("li", nx ? `Sisa waktu menuju ${nx.nama_fase}: ${sisa} hari.` : "Sudah di fase terakhir, tidak ada perpindahan lagi."),
    el("li", sudahPanen(b) ? "Data panen sudah dicatat." : "Data panen belum dicatat.")
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
    const tr = el("tr");
    tr.append(el("td", String(i + 1)), el("td", faseById(h.id_fase).nama_fase), el("td", fmtTanggal(h.tanggal_mulai)),
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
  $("m-lokasi").value = idx >= 0 ? (h.lokasi_tujuan || "") : faseById(Number(sel.value)).meja;
  $("m-cat").value = h.catatan || "";
  show("move");
  sel.focus();
}

function askDelHist(i) {
  hDel = i;
  $("h-confirm-text").textContent = `Hapus riwayat fase ${faseById(current.fase[i].id_fase).nama_fase}?`;
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
  $("f-ph").value = b.nilai_ph === undefined || b.nilai_ph === null ? "" : b.nilai_ph;
  $("f-kondisi").value = b.kondisi_tanaman || "";
  $("f-air").value = b.kondisi_air_nutrisi || "";
  $("f-instalasi").value = b.kondisi_instalasi || "";
  $("f-lingkungan").value = b.kondisi_lingkungan || "";
  $("f-catatan").value = b.catatan || "";

  // UC8: form ubah tidak memuat kode_pengelolaan dan tanggal_tanam
  fld("f-kode").hidden = editing;
  fld("f-tanam").hidden = editing;

  showOnly("form");
  (editing ? $("f-jumlah") : $("f-kode")).focus();
}

function notify(msg) { showAlert("notice", msg); $("notice").focus(); }

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
  const id = current.id_budidaya;
  try {
    const ok = await apiDeleteBatch(id);
    if (!ok) return;
    data = data.filter((b) => b.id_budidaya !== id);
    showList();
    notify("Data budidaya berhasil dihapus.");
  } catch (err) {
    showAlert("notice", err.message || "Gagal menghapus data.");
  }
});

// Perpindahan fase
$("btn-move").addEventListener("click", () => openMove(-1));
$("m-cancel").addEventListener("click", () => show("move", false));
$("m-fase").addEventListener("change", () => {
  if (moveIdx < 0) $("m-lokasi").value = faseById(Number($("m-fase").value)).meja;
});
$("h-no").addEventListener("click", () => show("h-confirm", false));
$("h-yes").addEventListener("click", async () => {
  const phaseId = current.fase[hDel].id_perpindahan;
  if (phaseId) {
    try {
      await apiDeletePhase(phaseId);
    } catch (err) {
      showAlert("h-alert", err.message || "Gagal menghapus riwayat fase.");
      return;
    }
  }
  await reloadDetail(current.id_budidaya);
  showDetail(current.id_budidaya);
  notify("Riwayat perpindahan fase berhasil dihapus.");
});

$("move").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("move-alert");
  const add = moveIdx < 0;
  const idFase = parseInt($("m-fase").value, 10), tgl = $("m-tgl").value, sel = $("m-selesai").value;
  const cat = $("m-cat").value.trim();
  if (!tgl) return showAlert("move-alert", MSG_LENGKAP);

  const prev = add ? faseAktif(current) : current.fase[moveIdx - 1];
  const nxt = add ? null : current.fase[moveIdx + 1];
  const salah = toDate(tgl) > today() || (prev && tgl < prev.tanggal_mulai) || (nxt && nxt.tanggal_mulai < tgl) ||
    (add && idFase === prev.id_fase) || (!add && sel && sel < tgl);
  if (salah) return showAlert("move-alert", MSG_FORMAT);

  try {
    if (add) {
      // POST /api/v1/pengelolaan/{batchId}/fase
      await apiAddPhase(current.id_budidaya, {
        id_fase: idFase,
        tanggal_mulai: tgl,
        tanggal_selesai: sel || null,
        catatan: cat,
      });
    } else {
      // PUT /api/v1/fase/{phaseId}
      const phaseId = current.fase[moveIdx].id_perpindahan;
      await apiUpdatePhase(phaseId, {
        id_fase: idFase,
        tanggal_mulai: tgl,
        tanggal_selesai: sel || null,
        catatan: cat,
      });
    }
    await reloadDetail(current.id_budidaya);
    showDetail(current.id_budidaya);
    notify(add ? "Data perpindahan fase berhasil ditambahkan." : "Data perpindahan fase berhasil diubah.");
  } catch (err) {
    showAlert("move-alert", err.message || "Gagal menyimpan perpindahan fase.");
  }
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
  // Semua field wajib kecuali catatan
  const wajib = [raw.jumlah, raw.lokasi, raw.ph, raw.kondisi, raw.air, raw.instalasi, raw.lingkungan];
  if (mode === "add") wajib.push(raw.kode, raw.tanam);
  if (wajib.some((x) => !x)) return showAlert("form-alert", MSG_LENGKAP);

  const jumlah = Number(raw.jumlah), ph = Number(raw.ph);
  let salah = !Number.isInteger(jumlah) || jumlah < 1 || !/^\d{1,2}(\.\d{1,2})?$/.test(raw.ph) || ph > 14;
  if (mode === "add") {
    salah = salah || toDate(raw.tanam) > today();
  }
  if (salah) return showAlert("form-alert", MSG_FORMAT);

  const fields = {
    jumlah_tanaman: jumlah, lokasi: raw.lokasi, nilai_ph: ph,
    kondisi_tanaman: raw.kondisi, kondisi_air_nutrisi: raw.air,
    kondisi_instalasi: raw.instalasi, kondisi_lingkungan: raw.lingkungan,
    catatan: $("f-catatan").value.trim(),
  };

  try {
    if (mode === "add") {
      fields.kode_pengelolaan = raw.kode;
      fields.tanggal_tanam = raw.tanam;
      const newBatch = await apiCreateBatch(fields);
      if (!newBatch) return;
      newBatch.status = hitungStatus(newBatch);
      data.push(newBatch);
      showDetail(newBatch.id_budidaya);
      notify("Data budidaya berhasil ditambahkan.");
    } else {
      const updated = await apiUpdateBatch(current.id_budidaya, fields);
      if (!updated) return;
      updated.status = hitungStatus(updated);
      const idx = data.findIndex((b) => b.id_budidaya === current.id_budidaya);
      if (idx >= 0) data[idx] = updated;
      current = updated;
      showDetail(current.id_budidaya);
      notify("Data budidaya berhasil diubah.");
    }
  } catch (err) {
    showAlert("form-alert", err.message || "Gagal menyimpan data.");
  }
});

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}

  try {
    data = await fetchBatches();
    refreshStatus();
  } catch (err) {
    showAlert("notice", "Data budidaya belum bisa dimuat. Coba muat ulang halaman.");
  }

  const id = parseInt(new URLSearchParams(location.search).get("id"), 10);
  if (id) showDetail(id); else showList();
})();