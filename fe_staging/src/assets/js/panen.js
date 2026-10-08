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

// State
let panenList = [];
let batchList = [];
let current = null;
let mode = "add";

function notify(msg) { showAlert("notice", msg); $("notice").focus(); }
function showOnly(name) { ["list", "detail", "form"].forEach((id) => show(id, id === name)); }

// ---------- Fetch Data dari Backend ----------
async function fetchPanenDanBatch() {
  if (USE_MOCK) {
    try {
      const bRaw = localStorage.getItem("mock_budidaya_v2");
      batchList = bRaw ? JSON.parse(bRaw) : [];
      const pRaw = localStorage.getItem("mock_panen_v1");
      panenList = pRaw ? JSON.parse(pRaw) : [];
    } catch (_) {}
    return;
  }

  try {
    const res = await apiFetch(ENDPOINTS.budidaya + "?per_page=100");
    if (!res || !res.ok) {
      throw new Error("Gagal mengambil data dari server");
    }
    const json = await res.json();
    const batches = json.data?.data || json.data || [];
    batchList = batches.map(b => ({
      id_budidaya: b.id_pengelolaan || b.id,
      kode_pengelolaan: b.kode_pengelolaan || b.batch_code,
      tanggal_tanam: b.tanggal_tanam || b.seed_date,
      status: b.status || "Aktif",
      panen: b.panen || []
    }));

    panenList = [];
    batchList.forEach(b => {
      (b.panen || []).forEach(p => {
        panenList.push({
          id_panen: p.id_panen || p.id,
          id_budidaya: b.id_budidaya,
          kode_panen: p.kode_panen || ("PANEN-" + b.kode_pengelolaan),
          tanggal_panen: p.tanggal_panen || p.harvest_date,
          jumlah_panen: p.jumlah_panen || p.quantity,
          berat_panen: p.berat_panen ?? p.berat_total_kg ?? p.total_weight ?? 0,
          kondisi_hasil_panen: p.kondisi_hasil_panen || p.kualitas || p.quality || "Baik",
          batch_kode: b.kode_pengelolaan
        });
      });
    });
  } catch (err) {
    showAlert("alert", "Koneksi ke backend gagal: " + err.message);
  }
}

// ---------- Halaman Daftar Panen ----------
function showList() {
  current = null;
  showOnly("list");
  $("list-info").textContent = panenList.length + " data panen";
  $("empty").hidden = panenList.length > 0;
  const rows = $("rows");
  rows.replaceChildren();

  panenList.forEach((p) => {
    const tr = el("tr"), td = el("td");
    const link = el("button", p.kode_panen, "link-kode");
    link.type = "button";
    link.addEventListener("click", () => showDetail(p.id_panen));
    td.appendChild(link);
    tr.appendChild(td);
    rows.appendChild(tr);
  });
}

// ---------- Halaman Detail Panen (UC11) ----------
function showDetail(id) {
  current = panenList.find((p) => p.id_panen === id);
  if (!current) return showList();
  const p = current;
  const b = batchList.find((x) => x.id_budidaya === p.id_budidaya);

  $("dt-kode").textContent = p.kode_panen;
  $("dt-batch").textContent = b ? b.kode_pengelolaan : (p.batch_kode || "-");
  $("dt-tgl").textContent = fmtTanggal(p.tanggal_panen);
  $("dt-jumlah").textContent = p.jumlah_panen + " tanaman";
  $("dt-berat").textContent = fmtAngka(p.berat_panen) + " kg";
  $("dt-kondisi").textContent = p.kondisi_hasil_panen;
  show("confirm", false);
  showOnly("detail");
}

// ---------- Form Tambah (UC10) / Ubah (UC12) ----------
const fld = (id) => $(id).closest(".field");

function showForm(editing) {
  mode = editing ? "edit" : "add";
  hideAlert("form-alert");
  $("form-title").textContent = editing ? "Ubah data panen" : "Tambah data panen";
  const p = editing ? current : {};

  if (!editing) {
    const sel = $("f-batch");
    sel.replaceChildren();
    // Hanya batch yang belum punya data panen
    const available = batchList.filter((b) => !panenList.some((x) => x.id_budidaya === b.id_budidaya));
    available.forEach((b) => {
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

// ---------- Event Listeners ----------
$("btn-add").addEventListener("click", () => {
  hideAlert("notice"); hideAlert("alert");
  const ada = batchList.some((b) => !panenList.some((x) => x.id_budidaya === b.id_budidaya));
  if (!ada) return showAlert("alert", "Belum ada batch budidaya yang bisa dicatat panennya.");
  showForm(false);
});

$("btn-edit").addEventListener("click", () => { hideAlert("notice"); showForm(true); });
$("btn-back").addEventListener("click", showList);
$("btn-cancel").addEventListener("click", () => (mode === "edit" && current ? showDetail(current.id_panen) : showList()));
$("btn-logout").addEventListener("click", logout);

// Hapus Panen (UC13)
$("btn-delete").addEventListener("click", () => {
  $("confirm-text").textContent = `Hapus data panen ${current.kode_panen}?`;
  show("confirm");
});
$("btn-no").addEventListener("click", () => show("confirm", false));

$("btn-yes").addEventListener("click", async () => {
  if (!current) return;
  const idPanen = current.id_panen;

  if (!USE_MOCK) {
    try {
      const res = await apiFetch(`/panen/${idPanen}`, { method: "DELETE" });
      if (!res || !res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Gagal menghapus data panen");
      }
    } catch (err) {
      return showAlert("alert", "Error: " + err.message);
    }
  }

  panenList = panenList.filter((p) => p.id_panen !== idPanen);
  if (USE_MOCK) {
    try { localStorage.setItem("mock_panen_v1", JSON.stringify(panenList)); } catch (_) {}
  }

  showList();
  notify("Data panen berhasil dihapus.");
});

// Submit Form
$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("form-alert");

  const raw = {
    batch: $("f-batch").value,
    kode: $("f-kode").value.trim(),
    tgl: $("f-tgl").value,
    jumlah: $("f-jumlah").value.trim(),
    berat: $("f-berat").value.trim(),
    kondisi: $("f-kondisi").value.trim(),
  };

  const wajib = [raw.tgl, raw.jumlah, raw.berat, raw.kondisi];
  if (mode === "add") wajib.push(raw.batch, raw.kode);
  if (wajib.some((x) => !x)) return showAlert("form-alert", MSG_LENGKAP);

  const idBatch = mode === "add" ? parseInt(raw.batch, 10) : current.id_budidaya;
  const b = batchList.find((x) => x.id_budidaya === idBatch);
  const jumlah = Number(raw.jumlah);
  const berat = Number(raw.berat);

  let salah = toDate(raw.tgl) > today() || (b && b.tanggal_tanam && raw.tgl < b.tanggal_tanam) ||
    !Number.isInteger(jumlah) || jumlah < 1 ||
    !(berat > 0) || !/^\d{1,8}(\.\d{1,2})?$/.test(raw.berat);

  if (mode === "add") {
    salah = salah || panenList.some((p) => p.kode_panen.toLowerCase() === raw.kode.toLowerCase());
  }
  if (salah) return showAlert("form-alert", MSG_FORMAT);

  const payload = {
    tanggal_panen: raw.tgl,
    jumlah_panen: jumlah,
    berat_panen: berat,
    berat_total_kg: berat,
    kondisi_hasil_panen: raw.kondisi,
    kualitas: raw.kondisi,
  };

  if (!USE_MOCK) {
    try {
      const url = mode === "add"
        ? `/pengelolaan/${idBatch}/panen`
        : `/panen/${current.id_panen}`;
      const method = mode === "add" ? "POST" : "PUT";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res || !res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Gagal menyimpan data panen");
      }

      await fetchPanenDanBatch();
      if (mode === "add") {
        const newlyAdded = panenList.find(p => p.id_budidaya === idBatch) || panenList[panenList.length - 1];
        if (newlyAdded) showDetail(newlyAdded.id_panen);
        else showList();
        notify("Data panen berhasil ditambahkan.");
      } else {
        showDetail(current.id_panen);
        notify("Data panen berhasil diubah.");
      }
      return;
    } catch (err) {
      return showAlert("form-alert", "Error: " + err.message);
    }
  }

  // Mock fallback
  if (mode === "add") {
    const id = panenList.reduce((m, p) => Math.max(m, p.id_panen), 0) + 1;
    panenList.push({
      id_panen: id,
      id_budidaya: idBatch,
      kode_panen: raw.kode,
      ...payload,
    });
    try { localStorage.setItem("mock_panen_v1", JSON.stringify(panenList)); } catch (_) {}
    showDetail(id);
    notify("Data panen berhasil ditambahkan.");
  } else {
    Object.assign(current, payload);
    try { localStorage.setItem("mock_panen_v1", JSON.stringify(panenList)); } catch (_) {}
    showDetail(current.id_panen);
    notify("Data panen berhasil diubah.");
  }
});

// ---------- Inisialisasi ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}

  await fetchPanenDanBatch();
  showList();
})();