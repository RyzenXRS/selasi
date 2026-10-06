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
const MSG_FORMAT = "Format data tidak sesuai";   // dua pesan error sesuai dokumen use case
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

// ---------- Aturan status (TEBAKAN, ubah angkanya di sini) ----------
// UC6 dan UC8 tidak punya field status di form, jadi status dihitung otomatis.
const PH_MIN = 5.5, PH_MAX = 6.5;   // di luar rentang ini -> "Perlu Diperhatikan"
const BATAS_HARI_PINDAH = 2;        // sisa <= 2 hari -> "Mendekati Perpindahan Fase" / "Mendekati Panen"

// ---------- Data (data palsu dulu; sambungkan ke BE nanti) ----------
// meja = lokasi/meja tujuan default saat batch pindah ke fase tersebut (TEBAKAN)
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

const MOCK_KEY = "mock_budidaya_v2";   // dibaca juga oleh dashboard.js
const PANEN_KEY = "mock_panen_v1";     // dikelola panen.js

function seed() {
  return [
    { id_budidaya: 1, kode_pengelolaan: "SLD-001", tanggal_tanam: isoDaysAgo(9), jumlah_tanaman: 120,
      lokasi: "Meja Persemaian 1", kondisi_tanaman: "Daun hijau segar, pertumbuhan normal.",
      kondisi_air_nutrisi: "Nutrisi 900 ppm.", kondisi_instalasi: "Pompa dan selang normal.",
      kondisi_lingkungan: "Suhu 27 C, cahaya cukup.", nilai_ph: 6.0, catatan: "",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(9) }] },
    { id_budidaya: 2, kode_pengelolaan: "SLD-002", tanggal_tanam: isoDaysAgo(30), jumlah_tanaman: 80,
      lokasi: "Meja Pembibitan 2", kondisi_tanaman: "Sebagian daun menguning di tepi.",
      kondisi_air_nutrisi: "Nutrisi 1000 ppm.", kondisi_instalasi: "Satu nozzle tersumbat.",
      kondisi_lingkungan: "Lembap, suhu 29 C.", nilai_ph: 6.3, catatan: "Pantau tiap pagi.",
      fase: [{ id_fase: 1, tanggal_mulai: isoDaysAgo(30), tanggal_selesai: isoDaysAgo(22) },
             { id_fase: 2, tanggal_mulai: isoDaysAgo(22), lokasi_tujuan: "Meja Pembibitan 2", catatan: "Bibit sehat." }] },
  ];
}
const load = (key, fallback) => {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (_) {}
  return fallback;
};
const save = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) {} };

let data = load(MOCK_KEY, null) || seed();
let panenList = load(PANEN_KEY, []);

// ---------- Turunan data ----------
const faseAktif = (b) => b.fase[b.fase.length - 1];
const infoFase = (b) => faseById(faseAktif(b).id_fase);
const hariDiFase = (b) => daysBetween(faseAktif(b).tanggal_mulai);
const faseNext = (b) => FASE.find((f) => f.urutan_fase === infoFase(b).urutan_fase + 1);
const perkiraan = (b) => (faseNext(b) ? addDays(faseAktif(b).tanggal_mulai, infoFase(b).durasi) : null);
const sisaHari = (b) => { const p = perkiraan(b); return p ? Math.max(0, Math.round((toDate(p) - today()) / MS_HARI)) : null; };
const lokasiTujuan = (b) => { const nx = faseNext(b); return nx ? nx.meja : "-"; };
const sudahPanen = (b) => panenList.some((p) => p.id_budidaya === b.id_budidaya);
const phDiLuar = (b) => Number(b.nilai_ph) < PH_MIN || Number(b.nilai_ph) > PH_MAX;

function hitungStatus(b) {
  if (sudahPanen(b)) return "Sudah Dipanen";
  if (phDiLuar(b)) return "Perlu Diperhatikan";
  const nx = faseNext(b);
  if (!nx) return "Mendekati Panen";   // sudah di fase Panen, data panen belum dicatat
  if (sisaHari(b) <= BATAS_HARI_PINDAH) return nx.urutan_fase === FASE.length ? "Mendekati Panen" : "Mendekati Perpindahan Fase";
  return "Normal";
}
function persist() {
  data.forEach((b) => { b.status = hitungStatus(b); });
  save(MOCK_KEY, data);
}

function perluPindah(b) {
  const f = infoFase(b);
  return !sudahPanen(b) && f.urutan_fase < FASE.length && hariDiFase(b) >= f.durasi - BATAS_HARI_PINDAH;
}
const badgeClass = (b) => STATUS_CLASS[b.status] || "badge";

let current = null;  // batch yang sedang dibuka
let mode = "add";    // "add" atau "edit"
let moveIdx = -1;    // -1 = tambah perpindahan, >=0 = ubah riwayat
let hDel = -1;       // indeks riwayat yang akan dihapus

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

// Halaman Daftar Batch Pengelolaan: hanya kode_pengelolaan
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
function showDetail(id) {
  current = data.find((b) => b.id_budidaya === id);
  if (!current) return showList();
  const b = current, f = infoFase(b), nx = faseNext(b), sisa = sisaHari(b);

  $("dt-kode").textContent = b.kode_pengelolaan;
  const st = $("dt-status");
  st.textContent = b.status;
  st.className = badgeClass(b);

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

// ---------- Riwayat perpindahan fase (di luar UC6-UC13 yang kamu kirim) ----------
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
  $("f-ph").value = b.nilai_ph === undefined ? "" : b.nilai_ph;
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

// Hapus batch (UC9): Hapus -> konfirmasi -> Konfirmasi (kembali ke daftar) / Batal (kembali ke detail)
$("btn-delete").addEventListener("click", () => {
  $("confirm-text").textContent = `Hapus batch ${current.kode_pengelolaan}? Riwayat fase dan data panennya ikut terhapus.`;
  show("confirm");
});
$("btn-no").addEventListener("click", () => show("confirm", false));
$("btn-yes").addEventListener("click", () => {
  const id = current.id_budidaya;
  data = data.filter((b) => b.id_budidaya !== id);
  panenList = panenList.filter((p) => p.id_budidaya !== id);
  save(PANEN_KEY, panenList);
  persist();
  showList();
  notify("Data budidaya berhasil dihapus.");
});

// Perpindahan fase
$("btn-move").addEventListener("click", () => openMove(-1));
$("m-cancel").addEventListener("click", () => show("move", false));
$("m-fase").addEventListener("change", () => {
  if (moveIdx < 0) $("m-lokasi").value = faseById(Number($("m-fase").value)).meja;
});
$("h-no").addEventListener("click", () => show("h-confirm", false));
$("h-yes").addEventListener("click", () => {
  const prev = current.fase[hDel - 1];
  if (prev) prev.tanggal_selesai = "";
  current.fase.splice(hDel, 1);
  persist();
  showDetail(current.id_budidaya);
  notify("Riwayat perpindahan fase berhasil dihapus.");
});

$("move").addEventListener("submit", (e) => {
  e.preventDefault();
  hideAlert("move-alert");
  const add = moveIdx < 0;
  const idFase = parseInt($("m-fase").value, 10), tgl = $("m-tgl").value, sel = $("m-selesai").value;
  const lok = $("m-lokasi").value.trim(), cat = $("m-cat").value.trim();
  if (!tgl || (add && !lok)) return showAlert("move-alert", MSG_LENGKAP);

  const prev = add ? faseAktif(current) : current.fase[moveIdx - 1];
  const nxt = add ? null : current.fase[moveIdx + 1];
  const salah = toDate(tgl) > today() || (prev && tgl < prev.tanggal_mulai) || (nxt && nxt.tanggal_mulai < tgl) ||
    (add && idFase === prev.id_fase) || (!add && sel && sel < tgl);
  if (salah) return showAlert("move-alert", MSG_FORMAT);

  if (add) {
    prev.tanggal_selesai = tgl;
    current.fase.push({ id_fase: idFase, tanggal_mulai: tgl, lokasi_tujuan: lok, catatan: cat });
    current.lokasi = lok;
  } else {
    Object.assign(current.fase[moveIdx], { id_fase: idFase, tanggal_mulai: tgl, tanggal_selesai: sel, lokasi_tujuan: lok, catatan: cat });
  }
  persist();
  showDetail(current.id_budidaya);
  notify(add ? "Data perpindahan fase berhasil ditambahkan." : "Data perpindahan fase berhasil diubah.");
});

// Simpan form tambah (UC6) / ubah (UC8)
$("form").addEventListener("submit", (e) => {
  e.preventDefault();
  hideAlert("form-alert");

  const raw = {
    kode: $("f-kode").value.trim(), tanam: $("f-tanam").value, jumlah: $("f-jumlah").value.trim(),
    lokasi: $("f-lokasi").value.trim(), ph: $("f-ph").value.trim(),
    kondisi: $("f-kondisi").value.trim(), air: $("f-air").value.trim(),
    instalasi: $("f-instalasi").value.trim(), lingkungan: $("f-lingkungan").value.trim(),
  };
  // Semua field wajib kecuali catatan (TEBAKAN; tambahkan raw.catatan kalau catatan juga wajib)
  const wajib = [raw.jumlah, raw.lokasi, raw.ph, raw.kondisi, raw.air, raw.instalasi, raw.lingkungan];
  if (mode === "add") wajib.push(raw.kode, raw.tanam);
  if (wajib.some((x) => !x)) return showAlert("form-alert", MSG_LENGKAP);

  const jumlah = Number(raw.jumlah), ph = Number(raw.ph);
  let salah = !Number.isInteger(jumlah) || jumlah < 1 || !/^\d{1,2}(\.\d{1,2})?$/.test(raw.ph) || ph > 14;
  if (mode === "add") {
    salah = salah || toDate(raw.tanam) > today() ||
      data.some((b) => b.kode_pengelolaan.toLowerCase() === raw.kode.toLowerCase());
  }
  if (salah) return showAlert("form-alert", MSG_FORMAT);

  const fields = {
    jumlah_tanaman: jumlah, lokasi: raw.lokasi, nilai_ph: ph,
    kondisi_tanaman: raw.kondisi, kondisi_air_nutrisi: raw.air,
    kondisi_instalasi: raw.instalasi, kondisi_lingkungan: raw.lingkungan,
    catatan: $("f-catatan").value.trim(),
  };

  if (mode === "add") {
    const id = data.reduce((m, b) => Math.max(m, b.id_budidaya), 0) + 1;
    // Fase awal otomatis Semai (form UC6 tidak punya field fase)
    data.push({ id_budidaya: id, kode_pengelolaan: raw.kode, tanggal_tanam: raw.tanam, ...fields,
      fase: [{ id_fase: FASE[0].id_fase, tanggal_mulai: raw.tanam }] });
    persist();
    showDetail(id);   // UC6: tampilkan halaman data budidaya yang baru dibuat
    notify("Data budidaya berhasil ditambahkan.");
  } else {
    Object.assign(current, fields);
    persist();
    showDetail(current.id_budidaya);
    notify("Data budidaya berhasil diubah.");
  }
});

// ---------- Mulai ----------
(function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}
  persist();   // segarkan status (bergantung tanggal hari ini dan data panen)
  const id = parseInt(new URLSearchParams(location.search).get("id"), 10);
  if (id) showDetail(id); else showList();
})();