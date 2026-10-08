// true  = mode uji coba (tanpa BE, pakai data palsu)
// false = pakai API BE sungguhan (jalankan dulu: php artisan serve)
const USE_MOCK = false;

// Alamat API BE (Laravel, prefix /api/v1)
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

// Alamat dasar untuk file foto profil di BE (butuh: php artisan storage:link)
const STORAGE_BASE_URL = "http://127.0.0.1:8000/storage/";

// Path endpoint, sesuai routes/api.php backend
const ENDPOINTS = {
  login:        "/auth/login",
  register:     "/auth/register",
  logout:       "/auth/logout",
  forgot:       "/auth/forgot-password",
  profil:       "/profile",        // GET: data akun
  profilUbah:   "/profile",        // PUT: ubah profil (dikirim POST + _method=PUT kalau ada foto)
  dashboard:    "/dashboard",
  fase:         "/fase-budidaya",  // master data fase
  budidaya:     "/pengelolaan",    // GET daftar, POST tambah; /{id} untuk detail, ubah, hapus
  // Turunan budidaya:
  //   POST /pengelolaan/{id}/fase   — perpindahan fase
  //   POST /pengelolaan/{id}/panen  — catat panen
  //   GET  /pengelolaan/{id}/panen  — daftar panen batch
  todo:         "/to-do",          // GET daftar, POST tambah; /{id}/complete untuk centang
  tasks:        "/tasks",          // alias /to-do
  prediksiPanen:     "/pengelolaan",  // /{id}/prediksi-panen
  prediksiPermintaan: "/prediksi-permintaan",
};

const ROLE_PEMBUDIDAYA = "pembudidaya"; // BE mengirim "PEMBUDIDAYA", simpan versi huruf kecil saat login
const LOGIN_URL = "login.html";
const DASHBOARD_URL = "dashboard.html";
const PROFIL_URL = "profil.html";

// ---- Helper: header autentikasi ----
function authHeaders(contentType) {
  const h = {
    Accept: "application/json",
    Authorization: "Bearer " + localStorage.getItem("token"),
  };
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

// ---- Helper: request ke API dengan autentikasi ----
// Kalau status 401 (token mati), otomatis logout.
async function apiFetch(path, options = {}) {
  if (!options.headers) {
    options.headers = authHeaders(
      options.body && !(options.body instanceof FormData) ? "application/json" : undefined
    );
  }
  const res = await fetch(API_BASE_URL + path, options);
  if (res.status === 401) { logout(); return null; }
  return res;
}