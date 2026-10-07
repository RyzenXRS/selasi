// ---------- Helper ----------
const $ = (id) => document.getElementById(id);

const MSG_FORMAT = "Format data tidak sesuai";   // dua pesan error sesuai dokumen use case
const MSG_LENGKAP = "Data perlu dilengkapi";

let profile = null;      // data akun yang sedang tampil
let selectedFile = null; // foto baru yang dipilih (kalau ada)

function showAlert(id, message) {
  const el = $(id);
  el.textContent = message;
  el.hidden = false;
}
function hideAlert(id) { $(id).hidden = true; }

function fotoUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return STORAGE_BASE_URL + String(path).replace(/^\/+/, "");
}

function initials(nama) {
  const parts = String(nama || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0].toUpperCase()).join("");
}

function renderAvatar(container, nama, url) {
  container.replaceChildren();
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.addEventListener("error", () => { container.textContent = initials(nama); });
    container.appendChild(img);
  } else {
    container.textContent = initials(nama);
  }
}

// BE mengirim "PEMBUDIDAYA", ditampilkan sebagai "Pembudidaya"
function roleLabel(role) {
  const s = String(role || "").toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : "-";
}

// ---------- Data palsu untuk uji coba (USE_MOCK = true) ----------
const MOCK_KEY = "mock_profil";

function mockLoad() {
  try {
    const saved = localStorage.getItem(MOCK_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  const u = JSON.parse(localStorage.getItem("user") || "{}");
  return {
    id_pengguna: u.id_pengguna || 1,
    nama: "Budi Santoso",
    email: u.email || "pembudidaya@selasi.com",
    no_telepon: "081234567890",
    role: "pembudidaya",
    foto_profil: null,
  };
}

function mockSave(data) {
  try { localStorage.setItem(MOCK_KEY, JSON.stringify(data)); } catch (_) {}
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ---------- Panggilan ke BE ----------
async function fetchProfile() {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return mockLoad();
  }
  const res = await fetch(API_BASE_URL + ENDPOINTS.profil, {
    headers: { Accept: "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
  });
  if (res.status === 401) { logout(); return null; }
  if (!res.ok) throw new Error("Gagal mengambil data akun");
  const json = await res.json();
  return json.data ?? json.user ?? json;
}

async function saveProfile(values, file) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    if (values.email === "admin@selasi.com") throw new Error(MSG_FORMAT); // email sudah dipakai
    const updated = { ...profile, ...values };
    if (file) updated.foto_profil = await readAsDataURL(file);
    mockSave(updated);
    return updated;
  }

  const body = new FormData();
  body.append("_method", "PUT"); // Laravel: route-nya PUT, dikirim lewat POST agar file bisa ikut
  body.append("nama", values.nama);
  body.append("email", values.email);
  body.append("no_telepon", values.no_telepon);
  if (file) body.append("foto_profil", file);

  const res = await fetch(API_BASE_URL + ENDPOINTS.profilUbah, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
    body,
  });
  if (res.status === 401) { logout(); return null; }
  if (res.status === 422) throw new Error(MSG_FORMAT); // validasi BE gagal

  let json = {};
  try { json = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(json.message || "Profil gagal disimpan.");
  return json.data ?? json.user ?? json;
}

// ---------- Tampilan: lihat data (UC4) ----------
function renderView() {
  renderAvatar($("v-avatar"), profile.nama, fotoUrl(profile.foto_profil));
  $("v-nama").textContent = profile.nama || "-";
  $("v-role").textContent = roleLabel(profile.role);

  $("d-nama").textContent = profile.nama || "-";
  $("d-email").textContent = profile.email || "-";
  $("d-telp").textContent = profile.no_telepon || "-";
  $("d-role").textContent = roleLabel(profile.role);

  $("user-email").textContent = profile.email || "";
}

function showView() {
  $("edit").hidden = true;
  $("view").hidden = false;
  renderView();
}

// ---------- Tampilan: ubah data (UC05) ----------
// Role tampil di form edit tapi terkunci (read-only) dan tidak dikirim ke BE.
function showEdit() {
  hideAlert("notice");
  hideAlert("form-alert");
  selectedFile = null;
  $("foto").value = "";

  $("nama").value = profile.nama || "";
  $("email").value = profile.email || "";
  $("telp").value = profile.no_telepon || "";
  $("role").value = roleLabel(profile.role);
  renderAvatar($("e-avatar"), profile.nama, fotoUrl(profile.foto_profil));

  $("view").hidden = true;
  $("edit").hidden = false;
  $("nama").focus();
}

$("btn-edit").addEventListener("click", showEdit);
$("btn-cancel").addEventListener("click", showView); // Batal: kembali ke profil tanpa menyimpan
$("btn-logout").addEventListener("click", logout);

// Pratinjau foto yang dipilih (JPG/PNG/WEBP, maksimal 2 MB)
$("foto").addEventListener("change", (e) => {
  hideAlert("form-alert");
  const file = e.target.files[0];
  if (!file) { selectedFile = null; return; }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
    e.target.value = "";
    selectedFile = null;
    return showAlert("form-alert", MSG_FORMAT);
  }

  selectedFile = file;
  renderAvatar($("e-avatar"), $("nama").value, URL.createObjectURL(file));
});

// Simpan perubahan
$("edit").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert("form-alert");

  const values = {
    nama: $("nama").value.trim(),
    email: $("email").value.trim(),
    no_telepon: $("telp").value.trim(),
  };

  // Alternative flow: data tidak lengkap
  if (!values.nama || !values.email || !values.no_telepon) return showAlert("form-alert", MSG_LENGKAP);

  // Alternative flow: format data tidak sesuai
  const telpOk = /^\+?\d{8,20}$/.test(values.no_telepon.replace(/[\s-]/g, ""));
  if (values.nama.length > 100 || values.email.length > 100 || !/^\S+@\S+\.\S+$/.test(values.email) || !telpOk) {
    return showAlert("form-alert", MSG_FORMAT);
  }

  const btn = $("btn-save");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    const updated = await saveProfile(values, selectedFile);
    if (!updated) return;
    profile = updated;

    // Perbarui data login yang tersimpan di browser
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      u.email = profile.email;
      u.nama = profile.nama;
      localStorage.setItem("user", JSON.stringify(u));
    } catch (_) {}

    showView();
    showAlert("notice", "Profil berhasil diubah.");
    $("notice").focus();
  } catch (err) {
    showAlert("form-alert", err.message || "Tidak bisa terhubung ke server. Coba lagi nanti.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan";
  }
});

// ---------- Mulai ----------
(async function init() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    $("user-email").textContent = u.email || "";
  } catch (_) {}

  try {
    profile = await fetchProfile();
    if (profile) showView();
  } catch (err) {
    showAlert("alert", "Data akun belum bisa dimuat. Coba muat ulang halaman.");
  }
})();