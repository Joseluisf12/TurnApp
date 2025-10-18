// ------------------------------
// TurnApp PWA - app.js
// ------------------------------

let currentUser = null;

// Función para inicializar la app
function initApp() {
  // Mostrar el logo y splash, si lo tienes
  console.log("Inicializando la app...");

  // Aquí puedes añadir más inicializaciones
  // Por ejemplo, cargar idioma, menús, etc.

  // Diferenciar roles
  if (currentUser.role === 'admin') {
    console.log('Bienvenido administrador');
    const btnAdmin = document.getElementById('btn-admin-section');
    if(btnAdmin) btnAdmin.style.display = 'block';
  } else {
    console.log('Bienvenido empleado');
    const btnAdmin = document.getElementById('btn-admin-section');
    if(btnAdmin) btnAdmin.style.display = 'none';
  }
}

// Función para cargar usuarios desde GitHub Pages
async function fetchUsers() {
  try {
    const res = await fetch('users.json?v=' + new Date().getTime());
    return await res.json();
  } catch (e) {
    console.error('No se pudo cargar users.json', e);
    return [];
  }
}

// Función para manejar login
async function handleLogin() {
  const users = await fetchUsers();
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  const found = users.find(x => x.username === u && x.password === p);

  if (found) {
    currentUser = found;
    localStorage.setItem('turnapp_user', JSON.stringify(found));
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initApp();
  } else {
    const err = document.getElementById('login-error');
    err.style.display = 'block';
  }
}

// Comprueba si ya hay un usuario logueado
const savedUser = localStorage.getItem('turnapp_user');
if (savedUser) {
  currentUser = JSON.parse(savedUser);
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
}

// ------------------------------
// Espera a que cargue el DOM
// ------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Si no hay usuario guardado, activa botón login
  if (!currentUser) {
    const btnLogin = document.getElementById('btn-login');
    if (btnLogin) btnLogin.addEventListener('click', handleLogin);
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('turnapp_user');
    location.reload();
  });
}

  // Theme toggle
  const btnTheme = document.getElementById('btn-toggle-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      document.body.classList.toggle('dark');
    });
  }
});

