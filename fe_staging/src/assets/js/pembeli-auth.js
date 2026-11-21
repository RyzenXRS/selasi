// Registrasi, Login, dan Lupa Password untuk PEMBELI (UC33, UC34, UC35).
// Dipakai oleh register.html dan login-pembeli.html.

// ---------- Pengaturan ----------
const ROLE_PEMBELI = "pembeli";
// Pembeli tidak punya dashboard, jadi halaman pertamanya setelah masuk adalah Katalog Produk
const DASHBOARD_PEMBELI_URL = "katalog-pembeli.html";
const LOGIN_PEMBELI_URL = "login-pembeli.html";
const PASSWORD_MIN = 8; // aturan "format password": minimal 8 karakter (belum ada di skenario, sesuaikan dengan BE)

// Path diambil dari config.js (ENDPOINTS), dengan cadangan kalau belum ada
const EP = {
  login:    ENDPOINTS.login    || "/auth/login",
  register: ENDPOINTS.register || "/auth/register",
  forgot:   ENDPOINTS.forgot   || "/auth/forgot-password",
  verify:   ENDPOINTS.verify || ENDPOINTS.verifikasi || "/auth/verify-code",
  reset:    ENDPOINTS.reset    || "/auth/reset-password",
};

// Mode uji coba tanpa BE: tambahkan ?demo=1 di alamat halaman (?demo=0 untuk mematikan)
(function () {
  const q = new URLSearchParams(location.search).get("demo");
  if (q === "1") sessionStorage.setItem("pembeli_demo", "1");
  if (q === "0") sessionStorage.removeItem("pembeli_demo");
})();
const MOCK = (typeof USE_MOCK !== "undefined" && USE_MOCK) || sessionStorage.getItem("pembeli_demo") === "1";

// ---------- Helper ----------
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SERVER_ERROR = "Tidak bisa terhubung ke server. Coba lagi nanti.";

function showAlert(id, message, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.className = "alert " + type;
  el.hidden = false;
}
function hideAlerts() { document.querySelectorAll(".alert").forEach((a) => (a.hidden = true)); }

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const passwordOk = (v) => v.length >= PASSWORD_MIN && v.length <= 50;
const phoneOk = (v) => /^\+?\d{8,20}$/.test(v.replace(/[\s-]/g, ""));

async function withButton(btn, busyText, normalText, fn) {
  btn.disabled = true;
  btn.textContent = busyText;
  try { await fn(); } finally { btn.disabled = false; btn.textContent = normalText; }
}

// Tombol Lihat/Sembunyikan password
document.querySelectorAll(".toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = $(btn.dataset.target);
    const tersembunyi = input.type === "password";
    input.type = tersembunyi ? "text" : "password";
    btn.textContent = tersembunyi ? "Sembunyikan" : "Lihat";
  });
});

// ---------- Data palsu untuk uji coba (?demo=1) ----------
//   Pembeli contoh   : pembeli@selasi.com / 12345678
//   Pembudidaya      : pembudidaya@selasi.com / 12345678 (ditolak di halaman ini)
//   Kode verifikasi  : 123456
const AKUN_KEY = "mock_pembeli_akun";
const MOCK_KODE = "123456";
function akunMock() {
  try { const a = JSON.parse(localStorage.getItem(AKUN_KEY)); if (Array.isArray(a)) return a; } catch (_) {}
  return [{ nama: "Pembeli Contoh", email: "pembeli@selasi.com", password: "12345678" }];
}
function simpanAkunMock(a) { try { localStorage.setItem(AKUN_KEY, JSON.stringify(a)); } catch (_) {} }

function mockPost(path, body) {
  const akun = akunMock();
  const cari = (email) => akun.find((a) => a.email.toLowerCase() === String(email).toLowerCase());

  if (path === EP.register) {
    if (cari(body.email) || body.email.toLowerCase() === "pembudidaya@selasi.com")
      return { ok: false, status: 422, data: { errors: { email: ["Email sudah terdaftar"] } } };
    akun.push({ nama: body.nama, email: body.email, password: body.password });
    simpanAkunMock(akun);
    return { ok: true, status: 201, data: {} };
  }
  if (path === EP.login) {
    if (body.email.toLowerCase() === "pembudidaya@selasi.com" && body.password === "12345678")
      return { ok: true, status: 200, data: { token: "token-palsu", user: { id_pengguna: 1, nama: "Pembudidaya", email: body.email, role: "PEMBUDIDAYA" } } };
    const a = cari(body.email);
    if (a && a.password === body.password)
      return { ok: true, status: 200, data: { token: "token-palsu", user: { id_pengguna: 99, nama: a.nama, email: a.email, role: "PEMBELI" } } };
    return { ok: false, status: 401, data: {} };
  }
  if (path === EP.forgot) return cari(body.email) ? { ok: true, status: 200, data: {} } : { ok: false, status: 422, data: {} };
  if (path === EP.verify) return body.kode === MOCK_KODE ? { ok: true, status: 200, data: {} } : { ok: false, status: 422, data: {} };
  if (path === EP.reset) {
    const a = cari(body.email);
    if (!a || body.kode !== MOCK_KODE) return { ok: false, status: 422, data: {} };
    a.password = body.password;
    simpanAkunMock(akun);
    return { ok: true, status: 200, data: {} };
  }
  return { ok: false, status: 404, data: {} };
}

async function post(path, body) {
  if (MOCK) { await sleep(500); return mockPost(path, body); }
  const res = await fetch(API_BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  // Teks peringatan PHP (mis. "Deprecated: ...") kadang tercetak sebelum JSON.
  // Ambil mulai dari tanda { pertama supaya tetap terbaca.
  let data = {};
  try {
    const raw = await res.text();
    const awal = raw.indexOf("{");
    data = JSON.parse(awal >= 0 ? raw.slice(awal) : raw);
  } catch (err) {
    console.error("[API ERROR] Gagal parse JSON:", err);
  }
  return { ok: res.ok, status: res.status, data };
}

// ---------- Sesi login ----------
const norm = (s) => String(s || "").toLowerCase().trim();

// Membaca token dan data pengguna dari respons login (tahan terhadap bentuk { data: {...} })
function bacaSesi(data) {
  const isi = data && data.data && typeof data.data === "object" ? data.data : data || {};
  const user = isi.user ?? data.user ?? {};
  return {
    token: isi.token ?? isi.access_token ?? data.token ?? data.access_token,
    user,
    role: user.role ?? isi.role ?? data.role,
  };
}
function simpanSesi(sesi) {
  localStorage.setItem("token", sesi.token);
  localStorage.setItem("role", ROLE_PEMBELI);
  localStorage.setItem("user", JSON.stringify(sesi.user || {}));
}

// Pesan singkat yang dibawa dari halaman lain (mis. "Registrasi Berhasil")
const FLASH_KEY = "pembeli_flash";

// =====================================================================
// UC33 Registrasi Pembeli  (register.html)
// =====================================================================
const formRegister = $("form-register");
if (formRegister) {
  formRegister.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlerts();
    const v = {
      nama: $("reg-nama").value.trim(),
      telp: $("reg-telp").value.trim(),
      email: $("reg-email").value.trim(),
      password: $("reg-password").value,
      konfirmasi: $("reg-confirm").value,
    };
    const gagal = (m) => showAlert("alert-register", m, "error");

    if (!v.nama || !v.telp || !v.email || !v.password || !v.konfirmasi)
      return gagal("Lengkapi seluruh data untuk melakukan Registrasi");
    if (!isEmail(v.email)) return gagal("Format pengisian Email tidak sesuai");
    if (!phoneOk(v.telp)) return gagal("Format pengisian Nomor Telepon tidak sesuai");
    if (!passwordOk(v.password)) return gagal("Format pengisian Password tidak sesuai");
    if (v.password !== v.konfirmasi) return gagal("Pengisian Password dan Konfirmasi Password tidak sesuai.");

    await withButton($("btn-register"), "Memproses...", "Daftar", async () => {
      try {
        // Isi permintaan ke BE. Sesuaikan nama field di sini kalau BE memakai nama lain.
        const r = await post(EP.register, {
          nama: v.nama,
          no_telepon: v.telp,
          email: v.email,
          password: v.password,
          password_confirmation: v.konfirmasi,
          role: "PEMBELI",
        });
        if (!r.ok) {
          const emailSudahAda = r.status === 409 || (r.status === 422 && r.data && r.data.errors && r.data.errors.email);
          if (emailSudahAda) return gagal("Email sudah terdaftar");
          return gagal((r.data && r.data.message) || "Registrasi gagal. Coba lagi.");
        }
        sessionStorage.setItem(FLASH_KEY, "Registrasi Berhasil");
        window.location.href = LOGIN_PEMBELI_URL;
      } catch (err) {
        gagal(SERVER_ERROR);
      }
    });
  });
}

// =====================================================================
// UC34 Login Pembeli  dan  UC35 Lupa Password Pembeli  (login-pembeli.html)
// =====================================================================
const views = { login: $("form-login"), forgot: $("form-forgot"), code: $("form-code"), reset: $("form-reset") };

if (views.login) {
  function showView(name) {
    Object.entries(views).forEach(([k, el]) => (el.hidden = k !== name));
    hideAlerts();
  }

  // Pesan dari halaman Registrasi
  const flash = sessionStorage.getItem(FLASH_KEY);
  if (flash) {
    sessionStorage.removeItem(FLASH_KEY);
    showAlert("alert-login", flash, "success");
  }

  $("link-forgot").addEventListener("click", (e) => { e.preventDefault(); showView("forgot"); $("forgot-email").focus(); });
  document.querySelectorAll("[data-back]").forEach((a) =>
    a.addEventListener("click", (e) => { e.preventDefault(); showView("login"); })
  );

  // ----- UC34 Login -----
  views.login.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlerts();
    const email = $("login-email").value.trim();
    const password = $("login-password").value;
    const gagal = (m) => showAlert("alert-login", m, "error");

    if (!email || !password) return gagal("Lengkapi Data");
    if (!isEmail(email)) return gagal("Format pengisian Email tidak sesuai");
    if (!passwordOk(password)) return gagal("Format pengisian Password tidak sesuai");

    await withButton($("btn-login"), "Memproses...", "Masuk", async () => {
      try {
        const r = await post(EP.login, { email, password });
        if (!r.ok) return gagal("Email atau Password salah");

        const sesi = bacaSesi(r.data);
        if (!sesi.token) return gagal("Respons login dari server tidak berisi token.");
        if (norm(sesi.role) !== ROLE_PEMBELI)
          return gagal("Akun ini bukan akun Pembeli. Pembudidaya silakan masuk lewat halaman Login Pembudidaya.");

        simpanSesi(sesi);
        window.location.href = DASHBOARD_PEMBELI_URL;
      } catch (err) {
        gagal(SERVER_ERROR);
      }
    });
  });

  // ----- UC35 langkah 1: email pemulihan -> kirim kode verifikasi -----
  let pemulihan = { email: "", kode: "" };

  views.forgot.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlerts();
    const email = $("forgot-email").value.trim();
    const gagal = (m) => showAlert("alert-forgot", m, "error");

    if (!isEmail(email)) return gagal("Email Pemulihan tidak sesuai");

    await withButton($("btn-forgot"), "Mengirim...", "Kirim", async () => {
      try {
        const r = await post(EP.forgot, { email });
        if (!r.ok) return gagal("Email Pemulihan tidak sesuai");

        pemulihan = { email, kode: "" };
        showView("code");
        $("code-hint").textContent = "Masukkan 6 karakter kode yang dikirim ke " + email + ".";
        $("code-input").value = "";
        if (MOCK) showAlert("test-code", "Mode uji coba: kode verifikasinya " + MOCK_KODE, "info");
        $("code-input").focus();
      } catch (err) {
        gagal(SERVER_ERROR);
      }
    });
  });

  // ----- UC35 langkah 2: kode verifikasi -----
  views.code.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlerts();
    if (MOCK) showAlert("test-code", "Mode uji coba: kode verifikasinya " + MOCK_KODE, "info");
    const kode = $("code-input").value.trim();
    const gagal = (m) => showAlert("alert-code", m, "error");

    if (kode.length !== 6) return gagal("Kode Verifikasi tidak sesuai");

    await withButton($("btn-code"), "Memeriksa...", "Kirim", async () => {
      try {
        // "code" dikirim juga karena sebagian BE memakai nama field itu; field yang tidak dikenal diabaikan
        const r = await post(EP.verify, { email: pemulihan.email, kode, code: kode });
        if (!r.ok) return gagal("Kode Verifikasi tidak sesuai");

        pemulihan.kode = kode;
        showView("reset");
        $("reset-password").value = "";
        $("reset-confirm").value = "";
        $("reset-password").focus();
      } catch (err) {
        gagal(SERVER_ERROR);
      }
    });
  });

  // ----- UC35 langkah 3: password baru, lalu masuk ke Katalog Produk -----
  views.reset.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlerts();
    const password = $("reset-password").value;
    const konfirmasi = $("reset-confirm").value;
    const gagal = (m) => showAlert("alert-reset", m, "error");

    if (!password || !konfirmasi || password !== konfirmasi)
      return gagal("Password Baru atau Konfirmasi Password tidak sesuai");
    if (!passwordOk(password)) return gagal("Format pengisian Password tidak sesuai");

    await withButton($("btn-reset"), "Menyimpan...", "Kirim", async () => {
      try {
        const r = await post(EP.reset, {
          email: pemulihan.email,
          kode: pemulihan.kode,
          code: pemulihan.kode,
          password,
          password_confirmation: konfirmasi,
        });
        if (!r.ok) return gagal((r.data && r.data.message) || "Password Baru atau Konfirmasi Password tidak sesuai");

        showAlert("alert-reset", "Berhasil Mengubah Password", "success");
        await sleep(1200);

        // Skenario menyebut Dashboard, tapi Pembeli tidak punya dashboard: tujuannya halaman pertama Pembeli (Katalog Produk).
        // Masuk otomatis dengan password baru.
        const masuk = await post(EP.login, { email: pemulihan.email, password });
        const sesi = masuk.ok ? bacaSesi(masuk.data) : null;
        if (sesi && sesi.token && norm(sesi.role) === ROLE_PEMBELI) {
          simpanSesi(sesi);
          window.location.href = DASHBOARD_PEMBELI_URL;
          return;
        }

        // Cadangan: kalau masuk otomatis gagal, kembali ke halaman masuk
        showView("login");
        $("login-email").value = pemulihan.email;
        showAlert("alert-login", "Berhasil Mengubah Password. Silakan masuk dengan password baru.", "success");
        pemulihan = { email: "", kode: "" };
      } catch (err) {
        gagal(SERVER_ERROR);
      }
    });
  });
}