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

// Path endpoint
const EP = {
  login: ENDPOINTS.login,
  forgot: ENDPOINTS.forgot,
<<<<<<< HEAD
  verify: ENDPOINTS.verify || "/auth/verify-code",
  reset:  ENDPOINTS.reset  || "/auth/reset-password",
=======
>>>>>>> 3619d1409b2ad972994775ad859e5e79023047dd
};

async function post(path, body) {
  const url = API_BASE_URL + path;
  console.log("%c[API REQUEST] POST " + url, "color: #2f5230; font-weight: bold;", body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
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

// ---------- UC1 Login ----------
views.login.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;

  if (!email || !password) {
    return showAlert("alert-login", "Lengkapi Data");
  }

  await withButton($("btn-login"), "Memproses...", async () => {
    try {
      const { ok, status, data } = await post(EP.login, { email, password });

      if (!ok) {
        console.warn("[LOGIN GAGAL]", data);
        return showAlert("alert-login", "Email atau Password salah");
      }

      // Backend response format: { success: true, message: "...", data: { user: {...}, token: "..." } }
      const payload = data.data || data;
      const user = payload.user;
      const token = payload.token;
      const role = String(user?.role ?? "").toLowerCase();

      console.log("%c[LOGIN BERHASIL] Akun:", "color: green; font-weight: bold;", user);
      console.log("[LOGIN BERHASIL] Sanctum Token:", token);

      if (role !== ROLE_PEMBUDIDAYA) {
        console.warn("[ROLE BUKAN PEMBUDIDAYA]:", role);
        return showAlert("alert-login", "Akun ini bukan akun Pembudidaya.");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", ROLE_PEMBUDIDAYA);
      localStorage.setItem("user", JSON.stringify(user ?? {}));

      showAlert("alert-login", "Login berhasil! Mengalihkan ke dashboard...", "success");

      // Beri jeda 800ms agar user dan developer sempat melihat log response di console
      setTimeout(() => {
        window.location.href = DASHBOARD_URL;
      }, 800);
    } catch (err) {
      console.error("[KONEKSI ERROR]", err);
      showAlert("alert-login", "Tidak bisa terhubung ke backend. Pastikan server backend (php artisan serve) sudah berjalan di http://127.0.0.1:8000.");
    }
  });
});

<<<<<<< HEAD
// ---------- UC2 Lupa password (Flow Kode OTP) ----------
const pulih = { email: "", kode: "", token: "" };

// Langkah 1: Input email -> Kirim kode OTP
=======
// ---------- UC2 Lupa password ----------
const pulih = { email: "" };

>>>>>>> 3619d1409b2ad972994775ad859e5e79023047dd
views.forgot.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("forgot-email").value.trim();
  if (!isEmail(email)) return showAlert("alert-forgot", "Email Pemulihan tidak sesuai");

  await withButton($("btn-forgot"), "Mengirim...", async () => {
    try {
<<<<<<< HEAD
      const { ok, status, data } = await post(EP.forgot, { email });

      if (!ok) {
        if (status === 422) {
          const errMsg =
            (data.errors && (data.errors.email?.[0] || Object.values(data.errors)[0]?.[0])) ||
            data.message ||
            "Email tidak terdaftar di sistem.";
          return showAlert("alert-forgot", errMsg);
        }
        return showAlert("alert-forgot", data.message || "Email Pemulihan tidak sesuai");
      }

      pulih.email = email;
      $("code-input").value = "";
      $("code-hint").textContent = "Kami telah mengirim 6 digit kode verifikasi (OTP) ke " + email + ". Masukkan kode tersebut di bawah:";
      showView("code");
      $("code-input").focus();
=======
      const { ok, data } = await post(EP.forgot, { email });
      if (!ok) return showAlert("alert-forgot", data.message || "Email Pemulihan tidak sesuai");

      pulih.email = email;
      // Backend berhasil mengirim link reset
      showView("login");
      showAlert("alert-login", data.message || data.data?.message || "Link reset password telah dikirim ke email Anda.", "success");
>>>>>>> 3619d1409b2ad972994775ad859e5e79023047dd
    } catch (err) {
      console.error("[FORGOT PASSWORD ERROR]", err);
      showAlert("alert-forgot", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
<<<<<<< HEAD
});

// Langkah 2: Input kode OTP 6 digit
views.code.addEventListener("submit", async (e) => {
  e.preventDefault();
  const kode = $("code-input").value.trim();
  if (kode.length !== 6) return showAlert("alert-code", "Kode Verifikasi harus 6 digit");

  await withButton($("btn-code"), "Memeriksa...", async () => {
    try {
      const { ok, data } = await post(EP.verify, { email: pulih.email, kode });
      if (!ok) {
        const errMsg = (data.errors && Object.values(data.errors)[0]?.[0]) || data.message || "Kode Verifikasi tidak sesuai";
        return showAlert("alert-code", errMsg);
      }

      pulih.kode = kode;
      pulih.token = data.data?.token ?? data.token ?? "";
      $("reset-password").value = "";
      $("reset-confirm").value = "";
      showView("reset");
      $("reset-password").focus();
    } catch (err) {
      console.error("[VERIFY CODE ERROR]", err);
      showAlert("alert-code", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});

// Langkah 3: Password baru dan konfirmasi
views.reset.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = $("reset-password").value;
  const confirm = $("reset-confirm").value;

  if (!password || password !== confirm) {
    return showAlert("alert-reset", "Password Baru atau Konfirmasi Password tidak sesuai");
  }
  if (password.length < 8) {
    return showAlert("alert-reset", "Password minimal 8 karakter.");
  }

  await withButton($("btn-reset"), "Menyimpan...", async () => {
    try {
      const { ok, data } = await post(EP.reset, {
        email: pulih.email,
        kode: pulih.kode,
        token: pulih.token,
        password,
        password_confirmation: confirm,
      });
      if (!ok) {
        const errMsg = (data.errors && Object.values(data.errors)[0]?.[0]) || data.message || "Gagal mengubah password";
        return showAlert("alert-reset", errMsg);
      }

      showView("login");
      $("login-email").value = pulih.email;
      $("login-password").value = "";
      showAlert("alert-login", "Password berhasil diperbarui. Silakan masuk dengan password barumu.", "success");
      $("login-password").focus();
    } catch (err) {
      console.error("[RESET PASSWORD ERROR]", err);
      showAlert("alert-reset", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
=======
>>>>>>> 3619d1409b2ad972994775ad859e5e79023047dd
});