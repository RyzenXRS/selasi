// ---------- Helper ----------
const $ = (id) => document.getElementById(id);

const views = {
  login: $("form-login"),
  forgot: $("form-forgot"),
  code: $("form-code"),
  reset: $("form-reset"),
};

function showView(name) {
  Object.entries(views).forEach(([key, el]) => (el.hidden = key !== name));
  document.querySelectorAll(".alert").forEach((a) => (a.hidden = true));
}

function showAlert(id, message, type = "error") {
  const el = $(id);
  el.textContent = message;
  el.className = "alert " + type;
  el.hidden = false;
}

// Path endpoint (didefinisikan di config.js, sesuai routes/api.php backend)
const EP = {
  login: ENDPOINTS.login,
  forgot: ENDPOINTS.forgot,
  verify: ENDPOINTS.verifikasi || "/auth/verify-code",
  reset: ENDPOINTS.reset,
};

async function post(path, body) {
  const url = API_BASE_URL + path;
  console.log("%c[API REQUEST] POST " + url, "color: #2f5230; font-weight: bold;", body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  // Teks peringatan PHP (misalnya "Deprecated: ...") kadang tercetak sebelum JSON.
  // Ambil mulai dari tanda { pertama supaya tetap bisa dibaca.
  let data = {};
  try {
    const raw = await res.text();
    const awal = raw.indexOf("{");
    data = JSON.parse(awal >= 0 ? raw.slice(awal) : raw);
  } catch (err) {
    console.error("[API ERROR] Gagal parse JSON:", err);
  }

  console.log(
    `%c[API RESPONSE] Status: ${res.status}`,
    res.ok ? "color: green; font-weight: bold;" : "color: red; font-weight: bold;",
    data
  );

  return { ok: res.ok, status: res.status, data };
}

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);

// Jalankan aksi sambil mengunci tombol
async function withButton(btn, loadingText, fn) {
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = loadingText;
  try { await fn(); } finally { btn.disabled = false; btn.textContent = label; }
}

// ---------- Tombol Lihat/Sembunyikan password ----------
document.querySelectorAll(".toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = $(btn.dataset.target);
    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    btn.textContent = hidden ? "Sembunyikan" : "Lihat";
  });
});

// ---------- Pindah antar tampilan ----------
$("link-forgot").addEventListener("click", (e) => { e.preventDefault(); showView("forgot"); $("forgot-email").focus(); });
document.querySelectorAll("[data-back]").forEach((a) =>
  a.addEventListener("click", (e) => { e.preventDefault(); showView("login"); })
);

// ---------- Masuk (dipakai UC1 dan akhir UC2) ----------
// Mengembalikan true kalau berhasil dan halaman sedang dialihkan ke dashboard.
async function masuk(email, password, alertId) {
  const { ok, data } = await post(EP.login, { email, password });
  if (!ok) {
    console.warn("[LOGIN GAGAL]", data);
    showAlert(alertId, "Email atau Password salah");
    return false;
  }

  // Format respons BE: { success, message, data: { user, token } }
  const payload = data.data || data;
  const user = payload.user;
  const token = payload.token;
  const role = String(user?.role ?? "").toLowerCase();

  if (role !== ROLE_PEMBUDIDAYA) {
    console.warn("[ROLE BUKAN PEMBUDIDAYA]:", role);
    showAlert(alertId, "Akun ini bukan akun Pembudidaya.");
    return false;
  }

  localStorage.setItem("token", token);
  localStorage.setItem("role", ROLE_PEMBUDIDAYA);
  localStorage.setItem("user", JSON.stringify(user ?? {}));

  showAlert(alertId, "Login berhasil! Mengalihkan ke dashboard...", "success");
  setTimeout(() => { window.location.href = DASHBOARD_URL; }, 800);
  return true;
}

// ---------- UC1 Login ----------
views.login.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  if (!email || !password) return showAlert("alert-login", "Lengkapi Data");

  await withButton($("btn-login"), "Memproses...", async () => {
    try {
      await masuk(email, password, "alert-login");
    } catch (err) {
      console.error("[KONEKSI ERROR]", err);
      showAlert("alert-login", "Tidak bisa terhubung ke backend. Pastikan server backend (php artisan serve) sudah berjalan di http://127.0.0.1:8000.");
    }
  });
});

// ---------- UC2 Lupa password ----------
const pulih = { email: "", kode: "", token: "" };

// Langkah 1: email pemulihan -> backend mengirim kode verifikasi ke email
views.forgot.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("forgot-email").value.trim();
  if (!isEmail(email)) return showAlert("alert-forgot", "Email Pemulihan tidak sesuai");

  await withButton($("btn-forgot"), "Mengirim...", async () => {
    try {
      const { ok } = await post(EP.forgot, { email });
      if (!ok) return showAlert("alert-forgot", "Email Pemulihan tidak sesuai");

      pulih.email = email;
      $("code-input").value = "";
      $("code-hint").textContent = "Kami mengirim kode 6 digit ke " + email + ". Masukkan kode tersebut di bawah.";
      showView("code"); // lanjut ke Form Kode Verifikasi, bukan kembali ke login
      $("code-input").focus();
    } catch (err) {
      showAlert("alert-forgot", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});

// Langkah 2: kode verifikasi (OTP 6 digit angka)
views.code.addEventListener("submit", async (e) => {
  e.preventDefault();
  const kode = $("code-input").value.trim();
  if (!/^\d{6}$/.test(kode)) return showAlert("alert-code", "Kode Verifikasi tidak sesuai");

  await withButton($("btn-code"), "Memeriksa...", async () => {
    try {
      const { ok, data } = await post(EP.verify, { email: pulih.email, kode });
      if (!ok) return showAlert("alert-code", "Kode Verifikasi tidak sesuai"); // tetap di form kode

      // Format respons BE: { success, message, data: { token } }
      pulih.kode = kode;
      pulih.token = data.data?.token ?? data.token ?? "";
      if (!pulih.token) {
        return showAlert("alert-code", "Token verifikasi tidak ditemukan. Silakan coba lagi.");
      }

      $("reset-password").value = "";
      $("reset-confirm").value = "";
      showView("reset");
      $("reset-password").focus();
    } catch (err) {
      showAlert("alert-code", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});

// Langkah 3: password baru dan konfirmasi -> login otomatis -> dashboard
views.reset.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = $("reset-password").value;
  const confirm = $("reset-confirm").value;

  if (!password || password.length < 8 || password !== confirm) {
    return showAlert("alert-reset", "Password Baru atau Konfirmasi Password tidak sesuai");
  }

  await withButton($("btn-reset"), "Menyimpan...", async () => {
    try {
      const { ok } = await post(EP.reset, {
        email: pulih.email,
        kode: pulih.kode,
        token: pulih.token,
        password,
        password_confirmation: confirm,
      });
      if (!ok) return showAlert("alert-reset", "Password Baru atau Konfirmasi Password tidak sesuai");

      // UC2: setelah password diperbarui, sistem menampilkan Dashboard.
      // Masuk otomatis dengan password baru; kalau gagal, kembali ke login.
      const masukOk = await masuk(pulih.email, password, "alert-reset");
      if (!masukOk) {
        showView("login");
        $("login-email").value = pulih.email;
        showAlert("alert-login", "Password berhasil diperbarui. Silakan masuk dengan password barumu.", "success");
      }
    } catch (err) {
      showAlert("alert-reset", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});