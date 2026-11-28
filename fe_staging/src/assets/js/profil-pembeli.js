// UC36 Melihat Data Akun Pembeli dan UC37 Mengubah Data Akun Pembeli

// Mode uji coba tanpa BE: buka halaman ini dengan ?demo=1 (?demo=0 untuk mematikan)
(function () {
  const q = new URLSearchParams(location.search).get("demo");
  if (q === "1") sessionStorage.setItem("pembeli_demo", "1");
  if (q === "0") sessionStorage.removeItem("pembeli_demo");
})();
const MOCK = (typeof USE_MOCK !== "undefined" && USE_MOCK) || sessionStorage.getItem("pembeli_demo") === "1";
const PROFIL_PATH = ENDPOINTS.profil || "/profile";
const MOCK_KEY = "mock_profil_pembeli";

// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
const show = (id, on = true) => { $(id).hidden = !on; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function showAlert(id, msg) { $(id).textContent = msg; show(id); }
const capitalize = (s) => (s ? String(s).toLowerCase().replace(/^./, (c) => c.toUpperCase()) : "-");

let profile = null;
let fotoBaru = null;

// Pindah tampilan dengan transisi halus (dilewati kalau pengguna memilih "kurangi gerakan")
const kurangiGerak = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function ganti(dariId, keId) {
  const dari = $(dariId), ke = $(keId);
  const tampil = () => {
    dari.hidden = true;
    dari.classList.remove("swap-out");
    ke.hidden = false;
    if (!kurangiGerak) {
      ke.classList.add("swap-in");
      ke.addEventListener("animationend", () => ke.classList.remove("swap-in"), { once: true });
    }
  };
  if (dari.hidden || kurangiGerak) return tampil();
  dari.classList.add("swap-out");
  setTimeout(tampil, 180);
}

function fotoUrl(p) {
  if (!p) return "";
  if (/^(https?:|data:|blob:)/.test(p)) return p;
  return STORAGE_BASE_URL + String(p).replace(/^\/+/, "");
}
function inisial(nama) {
  return String(nama || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}
function renderAvatar(box, nama, url) {
  box.replaceChildren();
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.addEventListener("error", () => { box.textContent = inisial(nama); });
    box.appendChild(img);
  } else {
    box.textContent = inisial(nama);
  }
}

// Menyamakan bentuk data dari BE
function normalisasi(u) {
  return {
    nama: u.nama ?? u.name ?? "",
    email: u.email ?? "",
    no_telepon: u.no_telepon ?? u.telepon ?? u.phone ?? "",
    role: u.role ?? "PEMBELI",
    foto_profil: u.foto_profil ?? u.foto ?? null,
  };
}

// ---------- Data ----------
function mockLoad() {
  try { const s = JSON.parse(localStorage.getItem(MOCK_KEY)); if (s) return s; } catch (_) {}
  const u = JSON.parse(localStorage.getItem("user") || "{}");
  return { nama: u.nama || "Pembeli Contoh", email: u.email || "pembeli@selasi.com", no_telepon: "081234567890", role: "PEMBELI", foto_profil: null };
}
const readAsDataURL = (file) => new Promise((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
});

async function ambilProfil() {
  if (MOCK) { await sleep(300); return mockLoad(); }
  const res = await apiFetch(PROFIL_PATH);
  if (!res) return null; // 401 -> sudah logout
  if (!res.ok) throw new Error("HTTP " + res.status);
  const json = await res.json();
  return normalisasi(json.data ?? json.user ?? json);
}

// Hasil: { ok: true, data } atau { ok: false, pesan }
async function kirimProfil(v, file) {
  if (MOCK) {
    await sleep(500);
    if (v.email.toLowerCase() === "pembudidaya@selasi.com") return { ok: false, pesan: "Email sudah terdaftar" };
    const baru = { ...profile, ...v };
    if (file) baru.foto_profil = await readAsDataURL(file);
    try { localStorage.setItem(MOCK_KEY, JSON.stringify(baru)); } catch (_) {}
    return { ok: true, data: baru };
  }

  let res;
  if (file) {
    // Ada foto: dikirim POST + _method=PUT (multipart)
    const fd = new FormData();
    fd.append("_method", "PUT");
    fd.append("nama", v.nama);
    fd.append("email", v.email);
    fd.append("no_telepon", v.no_telepon);
    fd.append("foto_profil", file);
    res = await apiFetch(PROFIL_PATH, { method: "POST", body: fd });
  } else {
    res = await apiFetch(PROFIL_PATH, { method: "PUT", body: JSON.stringify(v) });
  }
  if (!res) return { ok: false, pesan: null }; // 401 -> sudah logout

  let json = {};
  try { json = await res.json(); } catch (_) {}
  if (!res.ok) {
    if (res.status === 422 && json.errors && json.errors.email) return { ok: false, pesan: "Email sudah terdaftar" };
    if (res.status === 422) return { ok: false, pesan: "Format data tidak sesuai" };
    throw new Error("HTTP " + res.status);
  }
  const data = normalisasi(json.data ?? json.user ?? json);
  return { ok: true, data: { ...profile, ...v, ...Object.fromEntries(Object.entries(data).filter(([, x]) => x)) } };
}

// ---------- UC36 Halaman Profile ----------
function renderView() {
  const p = profile;
  show("loading", false);

  renderAvatar($("v-avatar"), p.nama, fotoUrl(p.foto_profil));
  $("v-nama").textContent = p.nama || "-";
  $("v-role").textContent = capitalize(p.role);
  $("d-nama").textContent = p.nama || "-";
  $("d-email").textContent = p.email || "-";
  $("d-telp").textContent = p.no_telepon || "-";
  $("d-role").textContent = capitalize(p.role);

  const foto = $("d-foto");
  foto.replaceChildren();
  const url = fotoUrl(p.foto_profil);
  if (url) {
    const img = document.createElement("img");
    img.className = "mini";
    img.alt = "Foto profil";
    img.src = url;
    foto.append(img, document.createTextNode("Terpasang"));
  } else {
    foto.textContent = "Belum ada foto";
  }

  // dari form edit -> transisi; dari awal muat -> langsung tampil (animasi masuk diatur CSS)
  if (!$("edit").hidden) ganti("edit", "view");
  else show("view", true);
}

// ---------- UC37 Form Edit ----------
function bukaEdit() {
  show("notice", false);
  show("form-alert", false);
  fotoBaru = null;
  $("foto").value = "";
  $("nama").value = profile.nama || "";
  $("email").value = profile.email || "";
  $("telp").value = profile.no_telepon || "";
  $("role").value = capitalize(profile.role);
  renderAvatar($("e-avatar"), profile.nama, fotoUrl(profile.foto_profil));
  ganti("view", "edit");
  setTimeout(() => $("nama").focus(), kurangiGerak ? 0 : 200);
}

$("btn-edit").addEventListener("click", bukaEdit);
// Alur alternatif: Batal -> kembali ke Halaman Profile tanpa mengubah apa pun
$("btn-cancel").addEventListener("click", renderView);

$("foto").addEventListener("change", (e) => {
  show("form-alert", false);
  const f = e.target.files[0];
  if (!f) { fotoBaru = null; return; }
  if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 2 * 1024 * 1024) {
    e.target.value = "";
    fotoBaru = null;
    return showAlert("form-alert", "Format data tidak sesuai");
  }
  fotoBaru = f;
  renderAvatar($("e-avatar"), $("nama").value, URL.createObjectURL(f));
  const av = $("e-avatar");
  av.classList.remove("baru"); void av.offsetWidth; av.classList.add("baru"); // animasi kecil saat foto diganti
});

$("edit").addEventListener("submit", async (e) => {
  e.preventDefault();
  show("form-alert", false);
  const v = { nama: $("nama").value.trim(), email: $("email").value.trim(), no_telepon: $("telp").value.trim() };
  const gagal = (m) => showAlert("form-alert", m);

  // Data tidak lengkap
  if (!v.nama || !v.email || !v.no_telepon) return gagal("Data perlu dilengkapi");
  // Format data tidak sesuai
  if (v.nama.length > 100 || v.email.length > 100) return gagal("Format data tidak sesuai");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return gagal("Format data tidak sesuai");
  if (!/^\+?\d{8,20}$/.test(v.no_telepon.replace(/[\s-]/g, ""))) return gagal("Format data tidak sesuai");

  const btn = $("btn-save");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";
  try {
    const r = await kirimProfil(v, fotoBaru);
    if (!r.ok) { if (r.pesan) gagal(r.pesan); return; }

    profile = r.data;
    // samakan data login yang tersimpan di browser
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      u.nama = profile.nama;
      u.email = profile.email;
      if (profile.foto_profil) {
        u.foto_profil = profile.foto_profil;
      }
      localStorage.setItem("user", JSON.stringify(u));
      $("user-email").textContent = profile.email;
    } catch (_) {}

    renderView();
    showAlert("notice", "Profil berhasil diubah");
    $("notice").focus();
  } catch (err) {
    gagal("Profil gagal disimpan (" + err.message + "). Coba lagi.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan";
  }
});

// ---------- Mulai ----------
(async function init() {
  try {
    profile = await ambilProfil();
    if (profile) renderView();
  } catch (err) {
    show("loading", false);
    showAlert("alert", "Data akun belum bisa dimuat (" + err.message + "). Coba muat ulang halaman.");
  }
})();