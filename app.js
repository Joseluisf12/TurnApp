let currentUser = null;

async function fetchUsers() {
  try {
    const res = await fetch('users.json?v=' + new Date().getTime());
    return await res.json();
  } catch (e) {
    console.error('No se pudo cargar users.json', e);
    return [];
  }
}

async function handleLogin() {
  const users = await fetchUsers();
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  const found = users.find(x => x.username === u && x.password === p);
  
  if(found){
    currentUser = found;
    localStorage.setItem('turnapp_user', JSON.stringify(found));
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initApp(); // inicia tu app normalmente
  } else {
    const err = document.getElementById('login-error');
    err.style.display = 'block';
  }
}

// Comprueba si ya hay usuario logueado
const savedUser = localStorage.getItem('turnapp_user');
if(savedUser){
  currentUser = JSON.parse(savedUser);
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  initApp();
} else {
  document.getElementById('btn-login').addEventListener('click', handleLogin);
}
/* TurnApp minimal core (v1) */
const LANGS = ['es','en','gl'];
let locale = 'es';

async function loadLocale(lang){
  try{
    const res = await fetch(`locales/${lang}.json`);
    const data = await res.json();
    return data;
  }catch(e){
    console.warn('No se pudo cargar locale',lang,e);
    return null;
  }
}

function detectLanguage(){
  const nav = navigator.language || navigator.userLanguage || 'es';
  const code = nav.split('-')[0];
  return LANGS.includes(code) ? code : 'es';
}

function showSplashThenApp(){
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  setTimeout(()=>{
    splash.style.opacity = 0;
    setTimeout(()=>{ splash.classList.add('hidden'); app.classList.remove('hidden'); }, 350);
  }, 900);
}

function setUpNav(strings){
  const content = document.getElementById('content');
  const buttons = document.querySelectorAll('.nav-btn');
  buttons.forEach(b=>{
    b.addEventListener('click', ()=> {
      document.querySelector('.nav-btn.active')?.classList.remove('active');
      b.classList.add('active');
      loadSection(b.dataset.section, strings);
    });
  });
  loadSection('turnos', strings);
}

function loadSection(section, strings){
  const content = document.getElementById('content');
  if(section === 'turnos'){
    content.innerHTML = `<div class="card"><h3>${strings.turnos}</h3><p>Lista de turnos (ejemplo)</p></div>`;
  } else if(section === 'peticiones'){
    content.innerHTML = `<div class="card"><h3>${strings.peticiones}</h3><p>Solicitudes de cambio de turno</p></div>`;
  } else if(section === 'ajustes'){
    content.innerHTML = `<div class="card"><h3>${strings.ajustes}</h3>
      <label>Idioma:
        <select id="sel-lang">
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="gl">Galego</option>
        </select>
      </label>
      <p><button id="btn-srv">Apagar / Segundo plano (simulado)</button></p>
    </div>`;
    document.getElementById('sel-lang').value = locale;
    document.getElementById('sel-lang').addEventListener('change', e=>{
      locale = e.target.value;
      initApp(); // reload texts
    });
  }
}

async function initApp(){
  locale = detectLanguage();
  // override if user set manual previously
  const strings = await loadLocale(locale) || { turnos:'Turnos', peticiones:'Peticiones', ajustes:'Ajustes', apagar:'Apagar / Segundo plano' };
  document.getElementById('app-title').textContent = 'TurnApp';
  showSplashThenApp();
  setUpNav(strings);
  // SSE placeholder: try to connect if available
  try {
    const es = new EventSource('/events');
    es.onmessage = e => console.log('SSE:', e.data);
    es.onerror = ()=>{ es.close(); };
  } catch(e){ /* running file:// or no server — ignore */ }
}
if(currentUser.role === 'admin'){
  console.log('Bienvenido administrador');
  // aquí puedes mostrar botones o secciones solo para admin
  // ejemplo:
  // document.getElementById('btn-admin-section').style.display='block';
} else {
  console.log('Bienvenido empleado');
  // ocultar botones de admin
  // document.getElementById('btn-admin-section').style.display='none';
}

document.addEventListener('DOMContentLoaded', ()=>{
  initApp();
  // theme toggle
  document.getElementById('btn-toggle-theme').addEventListener('click', ()=>{
    document.body.classList.toggle('dark');
  });
});
