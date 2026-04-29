// auth.js — Authentication helpers

const authUtils = {
  getToken: () => localStorage.getItem('insura_token'),

  getUser: () => {
    try { return JSON.parse(localStorage.getItem('insura_user') || 'null'); } catch { return null; }
  },

  getRole: () => {
    const u = authUtils.getUser();
    if (!u || !u.role) return null;
    return u.role.replace('ROLE_', '');
  },

  isAdmin: () => authUtils.getRole() === 'ADMIN',
  isUser: () => authUtils.getRole() === 'USER',

  store(data) {
    localStorage.setItem('insura_token', data.token);
    localStorage.setItem('insura_user', JSON.stringify({
      name: data.name,
      email: data.email,
      role: data.role,
    }));
  },

  logout() {
    localStorage.removeItem('insura_token');
    localStorage.removeItem('insura_user');
    window.location.href = 'login.html';
  },

  requireAuth() {
    if (!authUtils.getToken()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  redirectIfLoggedIn() {
    if (authUtils.getToken()) {
      window.location.href = 'index.html';
    }
  }
};

// ─── LOGIN ────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) { window.showToast('Please fill in all fields', 'warning'); return; }

  const btn = document.getElementById('login-btn');
  btn.innerHTML = '<span class="inline-spinner"></span> Signing in...';
  btn.disabled = true;

  // ✅ CORRECT
const data = await api.post('/api/auth/login', { email, password });

  btn.innerHTML = 'Sign In';
  btn.disabled = false;

  if (data && data.token) {
    authUtils.store(data);
    window.showToast(`Welcome back, ${data.name}!`, 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
  }
}

// ─── REGISTER ─────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const adminKey = document.getElementById('adminKey').value.trim();

  if (!name || !email || !password) { window.showToast('Please fill in all required fields', 'warning'); return; }
  if (password.length < 6) { window.showToast('Password must be at least 6 characters', 'warning'); return; }

  const btn = document.getElementById('register-btn');
  btn.innerHTML = '<span class="inline-spinner"></span> Creating account...';
  btn.disabled = true;

  const body = { name, email, password };
  if (adminKey) body.adminKey = adminKey;

  const data = await api.post('/api/auth/register', body)
  btn.innerHTML = 'Create Account';
  btn.disabled = false;

  if (data && data.token) {
    authUtils.store(data);
    window.showToast(`Account created! Welcome, ${data.name}!`, 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
  }
}

// ─── PASSWORD TOGGLE ──────────────────────────────────────
function initPasswordToggle() {
  document.querySelectorAll('.eye-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.input-with-icon').querySelector('input');
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.innerHTML = isText
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    });
  });
}

console.log('Auth module loaded');