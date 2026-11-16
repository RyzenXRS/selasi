// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

// FE saja: memakai data contoh dari config.js (notifBaca / notifTulis).
//   notifikasi.html          -> beberapa notifikasi contoh
//   notifikasi.html?kosong=1 -> tampilan "Belum Ada Notifikasi Saat Ini"
// Nanti saat BE siap, ganti isi ambilNotifikasi() dan tandaiDibaca().
const KOSONG = new URLSearchParams(location.search).has("kosong");

function fmtTanggal(v) {
  if (!v) return "-";
  const d = new Date(String(v).replace(" ", "T"));
  if (isNaN(d)) return String(v);
  const tgl = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  return tgl + ", " + jam;
}

// ---------- Data ----------
let data = [];

async function ambilNotifikasi() {
  if (KOSONG) return [];
  if (typeof USE_MOCK !== "undefined" && !USE_MOCK && typeof apiFetch === "function" && localStorage.getItem("token")) {
    try {
      const ep = (typeof ENDPOINTS !== "undefined" && ENDPOINTS.notifications) || "/notifications";
      const res = await apiFetch(ep + "?per_page=50");
      if (res && res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.data?.data || json.data || []);
        if (list.length > 0) {
          const mapped = list.map((item) => ({
            id_notifikasi: item.id_notifikasi || item.id,
            judul_notifikasi: item.judul_notifikasi || (item.jenis_notifikasi ? (item.jenis_notifikasi.charAt(0).toUpperCase() + item.jenis_notifikasi.slice(1).replace(/_/g, ' ')) : "Notifikasi Budidaya"),
            isi_notifikasi: item.isi_notifikasi || item.message || "-",
            tanggal_notifikasi: item.waktu_notifikasi || item.created_at || new Date().toISOString(),
            status_notifikasi: item.status_dibaca ? "Sudah Dibaca" : "Belum Dibaca",
            jenis_notifikasi: item.jenis_notifikasi || "Budidaya",
            referensi_notifikasi: item.referensi_notifikasi || (item.id_pengelolaan ? "Batch #" + item.id_pengelolaan : "-"),
          }));
          notifTulis(mapped);
          return mapped;
        }
      }
    } catch (e) {
      console.warn("[NOTIF API] Gagal fetch dari BE, fallback lokal:", e);
    }
  }
  return notifBaca();
}

async function tandaiDibaca(id) {
  const n = data.find((x) => x.id_notifikasi === id);
  if (!n || n.status_notifikasi === "Sudah Dibaca") return;
  n.status_notifikasi = "Sudah Dibaca";
  if (!KOSONG) notifTulis(data);
  perbaruiBadgeNotif();

  if (typeof USE_MOCK !== "undefined" && !USE_MOCK && typeof apiFetch === "function" && localStorage.getItem("token")) {
    try {
      const ep = (typeof ENDPOINTS !== "undefined" && ENDPOINTS.notifications) || "/notifications";
      await apiFetch(ep + "/" + encodeURIComponent(id) + "/read", { method: "POST" });
    } catch (e) {
      console.warn("[NOTIF API] Gagal update status baca:", e);
    }
  }
}

// ---------- Tampilan ----------
function showOnly(name) {
  show("v-list", name === "list");
  show("v-detail", name === "detail");
  $("page-title").textContent = name === "list" ? "Notifikasi" : "Detail Notifikasi";
  $("page-sub").textContent = name === "list" ? "Aktivitas budidaya dan penjualan kamu." : "Informasi lengkap notifikasi yang dipilih.";
}

function renderList() {
  showOnly("list");
  show("loading", false);

  if (!data.length) {
    $("list-info").textContent = "";
    $("rows").replaceChildren();
    show("empty", true); // "Belum Ada Notifikasi Saat Ini"
    return;
  }
  show("empty", false);

  const belum = data.filter((n) => n.status_notifikasi === "Belum Dibaca").length;
  $("list-info").textContent = data.length + " notifikasi" + (belum ? ", " + belum + " belum dibaca" : "");

  const urut = data.slice().sort((a, b) => String(b.tanggal_notifikasi).localeCompare(String(a.tanggal_notifikasi)));
  const ul = $("rows");
  ul.replaceChildren();
  urut.forEach((n) => {
    const baru = n.status_notifikasi === "Belum Dibaca";
    const li = el("li");
    const btn = el("button", undefined, "n-item" + (baru ? " baru" : ""));
    btn.type = "button";

    const top = el("div", undefined, "n-top");
    const judul = el("h2", undefined, "n-judul");
    if (baru) judul.appendChild(el("span", undefined, "dot"));
    judul.appendChild(document.createTextNode(n.judul_notifikasi));
    top.append(judul, el("span", n.status_notifikasi, baru ? "badge perlu" : "badge selesai"));

    btn.append(top, el("p", n.isi_notifikasi, "n-isi"), el("span", fmtTanggal(n.tanggal_notifikasi), "n-tgl"));
    btn.addEventListener("click", () => bukaDetail(n.id_notifikasi));
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function bukaDetail(id) {
  const n = data.find((x) => x.id_notifikasi === id);
  if (!n) return renderList();

  tandaiDibaca(id); // status otomatis menjadi "Sudah Dibaca"

  showOnly("detail");
  $("dt-judul").textContent = n.judul_notifikasi;
  const b = $("dt-badge");
  b.textContent = n.jenis_notifikasi || "-";
  b.className = "badge pindah";

  $("dt-j").textContent = n.judul_notifikasi || "-";
  $("dt-isi").textContent = n.isi_notifikasi || "-";
  $("dt-tgl").textContent = fmtTanggal(n.tanggal_notifikasi);
  $("dt-status").textContent = n.status_notifikasi || "-";
  $("dt-jenis").textContent = n.jenis_notifikasi || "-";
  $("dt-ref").textContent = n.referensi_notifikasi || "-";
  $("dt-judul").focus();
}

// ---------- Aksi ----------
$("btn-back").addEventListener("click", renderList);
$("btn-logout").addEventListener("click", logout);

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}

  show("loading", true);
  try {
    data = await ambilNotifikasi();
    renderList();
  } catch (err) {
    show("loading", false);
    $("alert").textContent = "Notifikasi belum bisa dimuat. Coba muat ulang halaman.";
    $("alert").hidden = false;
  }
})();