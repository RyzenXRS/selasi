// true  = mode uji coba (tanpa BE, pakai data palsu)
// false = pakai API BE sungguhan (jalankan dulu: php artisan serve)
const USE_MOCK = true;

// Alamat API BE (Laravel, prefix /api/v1)
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

// Alamat dasar untuk file foto profil di BE (butuh: php artisan storage:link)
const STORAGE_BASE_URL = "http://127.0.0.1:8000/storage/";

// Path endpoint, sesuai README backend
const ENDPOINTS = {
  login:        "/auth/login",
  logout:       "/auth/logout",
  forgot:       "/forgot-password", // belum terlihat di README BE, tanyakan ke temanmu
  reset:        "/reset-password",  // belum terlihat di README BE, tanyakan ke temanmu
  profil:       "/profile",        // GET: data akun
  profilUbah:   "/profile",        // PUT: ubah profil (dikirim POST + _method=PUT kalau ada foto)
  dashboard:    "/dashboard",
  fase:         "/fase-budidaya",  // master data fase
  budidaya:     "/pengelolaan",    // GET daftar, POST tambah; /{id} untuk detail, ubah, hapus
  // Contoh turunan: /pengelolaan/{id}/fase  (POST perpindahan fase)
  //                 /pengelolaan/{id}/panen (POST data panen)
};

const ROLE_PEMBUDIDAYA = "pembudidaya"; // BE mengirim "PEMBUDIDAYA", simpan versi huruf kecil saat login
const LOGIN_URL = "login.html";
const DASHBOARD_URL = "dashboard.html";
const PROFIL_URL = "profil.html";