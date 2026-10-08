// ---------- Helper ----------
const $ = (id) => document.getElementById(id);

const views = {
  login:  $("form-login"),
  forgot: $("form-forgot"),
  code:   $("form-code"),
  reset:  $("form-reset"),
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
  login:  ENDPOINTS.login,
  forgot: ENDPOINTS.forgot,
};

// ---------- Data palsu untuk uji coba (USE_MOCK = true di config.js) ----------
let mockKode = "";
const acakKode = () => {
  const huruf = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => huruf[Math.floor(Math.random() * huruf.length)]).join("");
};

function mockPost(path, body) {
  if (path === EP.login) {
    if (body.password !== "12345678") return { ok: false, data: {} };
    if (body.email === "pembudidaya@selasi.com") {
      return { ok: true, data: { token: "token-palsu", user: { id_pengguna: 1, email: body.email, role: "pembudidaya" } } };
    }
    if (body.email === "admin@selasi.com") {
      return { ok: true, data: { token: "token-palsu", user: { id_pengguna: 2, email: body.email, role: "admin" } } };
    }
    return { ok: false, data: {} };
  }
  if (path === EP.forgot) {
    if (body.email !== "pembudidaya@selasi.com") return { ok: false, data: {} };
    mockKode = acakKode();
    return { ok: true, data: { kode_uji: mockKode } };
  }
  return { ok: true, data: {} };
}

async function post(path, body) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 600));
    return mockPost(path, body);
  }
  const res = await fetch(API_BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  // Backend mengirim format: { success: true/false, message: "...", data: { user: {...}, token: "..." } }
  return { ok: res.ok, data };
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
    return showAlert("alert-login", "Email atau Password salah");
  }

  await withButton($("btn-login"), "Memproses...", async () => {
    try {
      const { ok, data } = await post(EP.login, { email, password });
      if (!ok) return showAlert("alert-login", data.message || "Email atau Password salah");

      // Backend response format: { success, message, data: { user: {...}, token: "..." } }
      // Mode mock: { ok, data: { user: {...}, token: "..." } }
      const payload = data.data || data; // data.data untuk BE sungguhan, data untuk mock
      const user = payload.user;
      const token = payload.token;
      const role = String(user?.role ?? "").toLowerCase();

      if (role !== ROLE_PEMBUDIDAYA) {
        return showAlert("alert-login", "Akun ini bukan akun Pembudidaya.");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", ROLE_PEMBUDIDAYA);
      localStorage.setItem("user", JSON.stringify(user ?? {}));
      window.location.href = DASHBOARD_URL;
    } catch (err) {
      showAlert("alert-login", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});

// ---------- UC2 Lupa password ----------
const pulih = { email: "" };

views.forgot.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("forgot-email").value.trim();
  if (!isEmail(email)) return showAlert("alert-forgot", "Email Pemulihan tidak sesuai");

  await withButton($("btn-forgot"), "Mengirim...", async () => {
    try {
      const { ok, data } = await post(EP.forgot, { email });
      if (!ok) return showAlert("alert-forgot", data.message || "Email Pemulihan tidak sesuai");

      pulih.email = email;
      // Backend berhasil mengirim link reset
      showView("login");
      showAlert("alert-login", data.message || data.data?.message || "Link reset password telah dikirim ke email Anda.", "success");
    } catch (err) {
      showAlert("alert-forgot", "Tidak bisa terhubung ke server. Coba lagi nanti.");
    }
  });
});