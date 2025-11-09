// =================== app.js (Versión corregida y unificada) ===================
// Versión 1.2.1 - Unificado, corregido (sin duplicados), mantiene la misma lógica
// Mantén exactamente este archivo como reemplazo único para solucionar el error de sintaxis.

// Init
document.addEventListener('DOMContentLoaded', () => {
  initApp();

  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) themeBtn.addEventListener('click', () => document.body.classList.toggle('dark'));

  const applyBtn = document.getElementById('btn-apply-cadence');
  const clearBtn = document.getElementById('btn-clear-cadence');
  if (applyBtn) applyBtn.addEventListener('click', () => openCadenceModal());
  if (clearBtn) clearBtn.addEventListener('click', () => clearCadencePrompt());

    // conectar handles de licencia a la paleta unificada
  bindLicenciaHandles();

  // restaurar persistencia de manualEdits y cadenceSpec
  restoreManualEdits();
  restoreCadenceSpec();

  // inicializar módulo de peticiones (listeners + render)
  initPeticiones();
// Resaltar fila seleccionada en tabla coordinador
const tablaCoord = document.getElementById("tabla-coordinador");

if (tablaCoord) {
  tablaCoord.addEventListener("click", (e) => {
    let fila = e.target.closest("tr");
    if (!fila || fila.parentNode.tagName !== "TBODY") return;

    // Quitar selección previa
    tablaCoord.querySelectorAll("tbody tr").forEach(tr => tr.classList.remove("seleccionada"));

    // Añadir selección a la fila pulsada
    fila.classList.add("seleccionada");
  });
}

});

// ---------------- estado ----------------
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = []; // array con {date: Date, type: string}
let cadenceSpec = null; // { type: 'V-1'|'V-2'|'Personalizada', startISO: '', pattern: [...], v1Index:0 }
let manualEdits = {}; // mapa "YYYY-MM-DD" -> { M: { text?, color?, userColor? }, T:..., N:... }

// ---------------- utilidades ----------------
function dateKey(year, month, day){
  const mm = String(month+1).padStart(2,'0');
  const dd = String(day).padStart(2,'0');
  return `${year}-${mm}-${dd}`;
}
function isColorLight(hex){
  if(!hex) return true;
  if(hex.indexOf('rgba')===0 || hex.indexOf('rgb')===0){
    const nums = hex.replace(/[^\d,]/g,'').split(',').map(n=>parseInt(n,10)||0);
    const [r,g,b] = nums;
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    return lum > 200;
  }
  if(hex[0] !== '#') return true;
  const r = parseInt(hex.substr(1,2),16);
  const g = parseInt(hex.substr(3,2),16);
  const b = parseInt(hex.substr(5,2),16);
  const lum = 0.2126*r + 0.7152*g + 0.0722*b;
  return lum > 200;
}
function defaultTextFor(shiftKey){ return shiftKey; }

// ---------------- persistencia manualEdits ----------------
function restoreManualEdits(){
  try {
    const raw = localStorage.getItem('turnapp.manualEdits');
    if (raw) manualEdits = JSON.parse(raw);
  } catch(e){
    manualEdits = {};
  }
  // restaurar licencias values/colors UI
  const licenciaItems = document.querySelectorAll('.licencia-item');
  licenciaItems.forEach(item=>{
    const tipo = item.dataset.tipo;
    const input = item.querySelector('.cantidad-input');
    const colorBtn = item.querySelector('.licencia-color');
    if(!input || !colorBtn) return;
    try {
      const saved = JSON.parse(localStorage.getItem('turnapp.licencia.'+tipo));
      if(saved){
        if(typeof saved.value !== 'undefined') input.value = saved.value;
        if(saved.color) colorBtn.style.backgroundColor = saved.color;
      }
    } catch(e){}
  });
  recalcLicenciasTotal();
}
function saveManualEdits(){
  try { localStorage.setItem('turnapp.manualEdits', JSON.stringify(manualEdits)); } catch(e){}
}
function saveLicenciaValue(tipo, value, color){
  try { localStorage.setItem('turnapp.licencia.'+tipo, JSON.stringify({ value: value, color: color })); } catch(e){}
}
function recalcLicenciasTotal(){
  const inputs = Array.from(document.querySelectorAll('.cantidad-input'));
  const totalField = document.getElementById('total-licencias');
  if(!totalField) return;
  let total = 0;
  inputs.forEach(i => total += Number(i.value)||0);
  totalField.value = total;
}

// festivos nacionales (mes 0-11)
const spanishHolidays = [
  { day:1, month:0 }, { day:6, month:0 }, { day:3, month:3 }, { day:1, month:4 },
  { day:15, month:7 }, { day:12, month:9 }, { day:2, month:10 },
  { day:6, month:11 }, { day:8, month:11 }, { day:25, month:11 }
];

// paleta color
const colorPalette = [
  "#ff4d4d","#ffa64d","#ffd24d","#85e085","#4dd2ff",
  "#4d79ff","#b84dff","#ff4da6","#a6a6a6","#ffffff",
  "rgba(232,240,255,1)","rgba(163,193,255,0.65)","rgba(255,179,179,0.45)"
];

// ---------------- init / navegación ----------------
function initApp(){
  renderCalendar(currentMonth, currentYear);

  const prev = document.getElementById('prevMonth');
  const next = document.getElementById('nextMonth');
  if(prev) prev.addEventListener('click', ()=> {
    currentMonth--; if(currentMonth < 0){ currentMonth = 11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  });
  if(next) next.addEventListener('click', ()=> {
    currentMonth++; if(currentMonth > 11){ currentMonth = 0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
  });

  // licencia inputs binding
  const licenciaInputs = document.querySelectorAll('.cantidad-input');
  licenciaInputs.forEach(input => {
    input.addEventListener('input', (ev)=>{
      const item = input.closest('.licencia-item');
      const tipo = item && item.dataset && item.dataset.tipo;
      const colorBtn = item.querySelector('.licencia-color');
      saveLicenciaValue(tipo, input.value, colorBtn && colorBtn.style.backgroundColor);
      recalcLicenciasTotal();
    });
  });
  recalcLicenciasTotal();
}

// ---------------- render calendario ----------------
function renderCalendar(month, year){
  const calendar = document.getElementById('calendar');
  if(!calendar) return;
  calendar.innerHTML = '';

  const monthLabel = document.getElementById('monthLabel');
  const meses = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];
  if(monthLabel) monthLabel.textContent = `${meses[month]} ${year}`;

  // Primer día del mes (lunes=0)
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0)? 6 : firstDay-1;

  const daysInMonth = new Date(year, month+1, 0).getDate();

  for(let i=0;i<firstDay;i++){
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell empty';
    calendar.appendChild(emptyCell);
  }

  for(let day=1; day<=daysInMonth; day++){
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const dateObj = new Date(year, month, day);
    const weekday = dateObj.getDay();
    if(weekday===6) cell.classList.add('saturday');
    if(weekday===0) cell.classList.add('sunday');

    if(spanishHolidays.some(h => h.day===day && h.month===month)){
      cell.classList.add('holiday');
    }

    const label = document.createElement('div');
    label.className = 'day-label';
    label.textContent = `${day}`;
    cell.appendChild(label);

    const wrapper = document.createElement('div');
    wrapper.className = 'shifts-wrapper';

    const row = document.createElement('div');
    row.className = 'shifts-row';

    row.appendChild(createShiftElement(year, month, day, 'M'));
    row.appendChild(createShiftElement(year, month, day, 'T'));
    wrapper.appendChild(row);

    wrapper.appendChild(createShiftElement(year, month, day, 'N'));

    cell.appendChild(wrapper);
    calendar.appendChild(cell);
  }

  if(cadenceData.length>0){
    applyCadenceRender(month, year);
  }
}

// ---------------- crear turno ----------------
function createShiftElement(year, month, day, shiftKey){
  const container = document.createElement('div');
  container.className = (shiftKey === 'N') ? 'shift-container night' : 'shift-container';

  const shift = document.createElement('div');
  shift.className = `shift-${shiftKey.toLowerCase()} shift-cell`;
  shift.contentEditable = true;
  shift.spellcheck = false;
  shift.dataset.shift = shiftKey;

  const dk = dateKey(year, month, day);
  let defaultBg = '#e8f0ff';
  const weekday = new Date(year, month, day).getDay();
  if(weekday === 6) defaultBg = 'rgba(163,193,255,0.65)';
  if(weekday === 0 || spanishHolidays.some(h=>h.day===day && h.month===month)) defaultBg = 'rgba(255,179,179,0.45)';
  shift.style.backgroundColor = defaultBg;
  shift.style.color = '#000';

  if(manualEdits[dk] && manualEdits[dk][shiftKey]){
    const obj = manualEdits[dk][shiftKey];
    if(obj.text !== undefined && obj.text !== null) shift.textContent = obj.text;
    else shift.textContent = defaultTextFor(shiftKey);
    if(obj.color){
      shift.style.backgroundColor = obj.color;
      shift.dataset.userColor = 'true';
    }
    if(obj.text !== undefined && obj.text !== null){
      shift.dataset.edited = (String(obj.text).trim() !== defaultTextFor(shiftKey)) ? 'true' : 'false';
    } else {
      shift.dataset.edited = 'false';
    }
  } else {
    shift.textContent = defaultTextFor(shiftKey);
    shift.dataset.edited = 'false';
  }

  shift.addEventListener('blur', ()=> {
    const text = shift.textContent.trim();
    saveShiftText(year, month, day, shiftKey, text);
    shift.dataset.edited = (text !== defaultTextFor(shiftKey)) ? 'true' : 'false';
  });
  shift.addEventListener('keypress', (e)=> {
    if(e.key === 'Enter'){ e.preventDefault(); shift.blur(); }
  });

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'color-handle';
  handle.title = 'Elegir color';
  handle.innerText = '●';
  handle.style.height = '10px';
  handle.style.width = '24px';
  handle.style.fontSize = '10px';
  handle.style.opacity = '0.28';
  handle.style.background = 'transparent';
  handle.style.border = 'none';
  handle.style.cursor = 'pointer';
  handle.addEventListener('mouseenter', ()=> handle.style.opacity = '0.6');
  handle.addEventListener('mouseleave', ()=> handle.style.opacity = '0.28');

  handle.addEventListener('click', (ev)=> {
    ev.stopPropagation();
    openColorPicker(handle, (color)=>{
      shift.style.backgroundColor = color;
      shift.style.color = isColorLight(color) ? '#000' : '#fff';
      shift.dataset.userColor = 'true';
      if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
      manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
      manualEdits[dk][shiftKey].color = color;
      manualEdits[dk][shiftKey].userColor = true;
      saveManualEdits();
    }, colorPalette);
  });

  container.appendChild(shift);
  container.appendChild(handle);
  return container;
}

// ---------------- guardar texto/color específicos ----------------
function saveShiftText(year, month, day, shiftKey, text){
  const dk = dateKey(year, month, day);
  if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
  manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
  manualEdits[dk][shiftKey].text = text;
  saveManualEdits();
}

// ---------------- paleta ----------------
function bindLicenciaHandles(){
  const licenciaHandles = document.querySelectorAll('.licencia-color-handle');
  licenciaHandles.forEach(handle => {
    handle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const item = handle.closest('.licencia-item');
      if(!item) return;
      openColorPicker(handle, (color) => {
        handle.style.backgroundColor = color;
        const tipo = item.dataset.tipo;
        const value = (item.querySelector('.cantidad-input')||{value:0}).value;
        saveLicenciaValue(tipo, value, color);
      }, colorPalette);
    });
  });

  const inputs = Array.from(document.querySelectorAll('.cantidad-input'));
  inputs.forEach(i=>i.addEventListener('input', ()=> {
    const item = i.closest('.licencia-item');
    const tipo = item.dataset.tipo;
    const colorBtn = item.querySelector('.licencia-color');
    saveLicenciaValue(tipo, i.value, colorBtn && colorBtn.style.backgroundColor);
    recalcLicenciasTotal();
  }));
}

function openColorPicker(anchorEl, onSelect, palette = colorPalette){
  const existing = document.getElementById('color-picker-popup');
  if(existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'color-picker-popup';
  popup.style.position = 'absolute';
  popup.style.display = 'flex';
  popup.style.flexWrap = 'wrap';
  popup.style.background = '#fff';
  popup.style.border = '1px solid #ccc';
  popup.style.padding = '6px';
  popup.style.borderRadius = '6px';
  popup.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  popup.style.zIndex = 10000;

  palette.forEach(color => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.width = '22px';
    b.style.height = '22px';
    b.style.margin = '4px';
    b.style.border = '1px solid rgba(0,0,0,0.06)';
    b.style.borderRadius = '4px';
    b.style.cursor = 'pointer';
    b.style.backgroundColor = color;
    b.addEventListener('click', (e)=> {
      e.stopPropagation();
      onSelect(color);
      popup.remove();
    });
    popup.appendChild(b);
  });

  document.body.appendChild(popup);

  const rect = anchorEl.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 6;
  const guessW = 180;
  if(left + guessW > window.scrollX + window.innerWidth) left = window.scrollX + window.innerWidth - guessW - 8;
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  const closeFn = (ev) => {
    if(!popup.contains(ev.target) && ev.target !== anchorEl) {
      popup.remove();
      document.removeEventListener('click', closeFn);
    }
  };
  setTimeout(()=> document.addEventListener('click', closeFn), 10);
}

// ---------------- persistencia/CADENCIA spec ----------------
function saveCadenceSpec(spec){
  try { localStorage.setItem('turnapp.cadenceSpec', JSON.stringify(spec)); } catch(e){}
}
function restoreCadenceSpec(){
  try {
    const raw = localStorage.getItem('turnapp.cadenceSpec');
    if(!raw) return;
    cadenceSpec = JSON.parse(raw);
    if(cadenceSpec && cadenceSpec.startISO && cadenceSpec.pattern){
      cadenceData = [];
      const start = new Date(cadenceSpec.startISO);
      for(let i=0;i<10000;i++){
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const type = cadenceSpec.pattern[i % cadenceSpec.pattern.length];
        cadenceData.push({ date: d, type: type });
      }
      renderCalendar(currentMonth, currentYear);
    }
  } catch(e){ cadenceSpec = null; }
}

// ------------------ CADENCIAS (modal) ------------------
function openCadenceModal(){
  const overlay = document.getElementById('cadence-modal-overlay');
  const modal = document.getElementById('cadence-modal');
  if(!overlay || !modal) return;

  document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
  const v1 = document.getElementById('v1-options');
  const v2 = document.getElementById('v2-options');
  const custom = document.getElementById('custom-section');
  if(v1) v1.style.display = 'none';
  if(v2) v2.style.display = 'none';
  if(custom) custom.style.display = 'none';
  const cp = document.getElementById('custom-pattern');
  if(cp) cp.value = '';
  const cs = document.getElementById('cadence-start');
  if(cs) cs.value = '';

  if(cadenceSpec){
    if(cs) cs.value = (new Date(cadenceSpec.startISO)).toLocaleDateString('es-ES');
    if(cadenceSpec.type === 'V-1'){
      const btn = document.querySelector('.modal-type-btn[data-type="V-1"]');
      if(btn) btn.classList.add('active');
      if(v1) v1.style.display = 'block';
      if(typeof cadenceSpec.v1Index !== 'undefined'){
        const r = document.querySelector(`input[name="v1opt"][value="${cadenceSpec.v1Index}"]`);
        if(r) r.checked = true;
      }
    } else if(cadenceSpec.type === 'V-2'){
      const btn = document.querySelector('.modal-type-btn[data-type="V-2"]');
      if(btn) btn.classList.add('active');
      if(v2) v2.style.display = 'block';
    } else if(cadenceSpec.type === 'Personalizada'){
      const btn = document.querySelector('.modal-type-btn[data-type="Personalizada"]');
      if(btn) btn.classList.add('active');
      if(custom) custom.style.display = 'block';
      if(cadenceSpec.pattern && cp) cp.value = cadenceSpec.pattern.join(',');
    }
  }

  document.querySelectorAll('.modal-type-btn').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.dataset.type;
      if(v1) v1.style.display = (t==='V-1') ? 'block' : 'none';
      if(v2) v2.style.display = (t==='V-2') ? 'block' : 'none';
      if(custom) custom.style.display = (t==='Personalizada') ? 'block' : 'none';
    };
  });

  const closeBtn = document.getElementById('close-cadence');
  if(closeBtn) closeBtn.onclick = () => {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden','true');
  };

  const applyBtn = document.getElementById('apply-cadence-confirm');
  if(applyBtn) applyBtn.onclick = () => {
    const activeBtn = document.querySelector('.modal-type-btn.active');
    if(!activeBtn) return alert('Seleccione un tipo de cadencia.');
    const typ = activeBtn.dataset.type;
    const startStr = (document.getElementById('cadence-start')||{}).value;
    if(!startStr) return alert('Introduce la fecha de inicio (DD/MM/AAAA).');
    const parts = startStr.split('/');
    if(parts.length !== 3) return alert('Formato de fecha incorrecto.');
    const d = parseInt(parts[0],10), m = parseInt(parts[1],10)-1, y = parseInt(parts[2],10);
    const start = new Date(y,m,d);
    if(isNaN(start)) return alert('Fecha inválida.');

    if(typ === 'V-1'){
      const r = document.querySelector('input[name="v1opt"]:checked');
      if(!r) return alert('Selecciona una opción de V-1.');
      const idx = parseInt(r.value,10);
      const v1options = [
        ['M/T', 'L', 'M/T', 'N', 'L', 'L', 'L', 'L'],
        ['M/T', 'M/T', 'N', 'L', 'L', 'L', 'L', 'L'],
        ['T', 'M/T', 'M/N', 'L', 'L', 'L', 'L', 'L'],
        ['M/T', 'N', 'L', 'L', 'L'],
        ['T', 'M/N', 'L', 'L', 'L']
      ];
      const pattern = v1options[idx];
      cadenceSpec = { type: 'V-1', startISO: start.toISOString(), pattern: pattern, v1Index: idx };
      saveCadenceSpec(cadenceSpec);
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    } else if(typ === 'V-2'){
      const pattern = ['M/T', 'M/T', 'L', 'L', 'L', 'L'];
      cadenceSpec = { type: 'V-2', startISO: start.toISOString(), pattern: pattern };
      saveCadenceSpec(cadenceSpec);
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    } else if(typ === 'Personalizada'){
      const raw = (document.getElementById('custom-pattern')||{}).value;
      if(!raw) return alert('Introduce un patrón personalizado.');
      const pattern = raw.split(',').map(s=>s.trim()).filter(Boolean);
      if(pattern.length === 0) return alert('Patrón inválido.');
      cadenceSpec = { type: 'Personalizada', startISO: start.toISOString(), pattern: pattern };
      saveCadenceSpec(cadenceSpec);
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    }
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden','true');
  };

  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden','false');
}

// construir cadenceData a partir de cadenceSpec
function buildCadenceDataFromSpec(){
  if(!cadenceSpec || !cadenceSpec.startISO || !cadenceSpec.pattern) { cadenceData = []; return; }
  cadenceData = [];
  const start = new Date(cadenceSpec.startISO);
  for(let i=0;i<10000;i++){
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cadenceData.push({ date: d, type: cadenceSpec.pattern[i % cadenceSpec.pattern.length] });
  }
}

// Limpieza de cadencia desde fecha
function clearCadencePrompt(){
  const startDateStr = prompt("Introduce la fecha desde la que quieres limpiar la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;
  const parts = startDateStr.split('/');
  if(parts.length!==3) return alert("Formato incorrecto");
  const day = parseInt(parts[0],10), month = parseInt(parts[1],10)-1, year = parseInt(parts[2],10);
  const startDate = new Date(year, month, day);
  if(isNaN(startDate)) return alert("Fecha inválida");

  cadenceData = cadenceData.filter(cd => cd.date < startDate);

  if(cadenceSpec && new Date(cadenceSpec.startISO) >= startDate){
    cadenceSpec = null;
    try { localStorage.removeItem('turnapp.cadenceSpec'); } catch(e){}
  }
  renderCalendar(currentMonth, currentYear);
}

// ---------------- aplicar cadencia sobre DOM ----------------
function applyCadenceRender(month, year){
  const cells = document.querySelectorAll('.day-cell');
  if(!cells) return;

  const cadColorMT = '#ffa94d';
  const cadColorN = '#d87d00';

  cells.forEach(cell=>{
    const label = cell.querySelector('.day-label');
    if(!label) return;
    const parts = label.textContent.split(' ');
    const day = parseInt(parts[0],10);
    if(isNaN(day)) return;

    const cellDate = new Date(year, month, day);
    const cd = cadenceData.find(c=> c.date.getFullYear()===cellDate.getFullYear() &&
                                     c.date.getMonth()===cellDate.getMonth() &&
                                     c.date.getDate()===cellDate.getDate());

    const shiftM = cell.querySelector('.shift-m');
    const shiftT = cell.querySelector('.shift-t');
    const shiftN = cell.querySelector('.shift-n');

    function getFlagsForShift(shiftEl, shiftKey){
      const dk = dateKey(year, month, day);
      const saved = (manualEdits[dk] && manualEdits[dk][shiftKey]) ? manualEdits[dk][shiftKey] : {};
      const userColor = !!saved.color || shiftEl.dataset.userColor === 'true';
      let edited = false;
      if(saved.text !== undefined && saved.text !== null){
        edited = String(saved.text).trim() !== defaultTextFor(shiftKey);
      } else {
        edited = String(shiftEl.textContent || '').trim() !== defaultTextFor(shiftKey);
      }
      if(shiftEl.dataset.edited === 'true') edited = true;
      return { userColor, edited, savedText: saved.text, savedColor: saved.color };
    }

    function applyToShift(shiftEl, shiftKey, activeForCadence, cadenceColor){
      if(!shiftEl) return;
      const { userColor, edited } = getFlagsForShift(shiftEl, shiftKey);
      const allowCadence = !(userColor && edited);
      if(activeForCadence){
        if(allowCadence){
          shiftEl.style.backgroundColor = cadenceColor;
          shiftEl.style.color = (shiftKey === 'N') ? '#fff' : '#000';
          shiftEl.dataset.cadenceApplied = 'true';
        } else {
          shiftEl.dataset.cadenceApplied = 'false';
        }
      } else {
        if(allowCadence){
          if(shiftEl.dataset.cadenceApplied === 'true'){
            shiftEl.style.backgroundColor = '';
            shiftEl.style.color = '#000';
            shiftEl.dataset.cadenceApplied = 'false';
          }
        }
      }
    }

    if(cd){
      const types = String(cd.type).split('/');
      applyToShift(shiftM,'M', types.includes('M') || types.includes('MT'), cadColorMT);
      applyToShift(shiftT,'T', types.includes('T') || types.includes('MT'), cadColorMT);
      applyToShift(shiftN,'N', types.includes('N') || types.includes('M/N'), cadColorN);
    } else {
      [['M',shiftM],['T',shiftT],['N',shiftN]].forEach(([k,el])=>{
        if(!el) return;
        if(el.dataset.cadenceApplied === 'true'){
          el.style.backgroundColor = '';
          el.style.color = '#000';
          el.dataset.cadenceApplied = 'false';
        }
      });
    }
  });
}
// ------------------ MÓDULO PETICIONES (solo usuario, sin duplicar) ------------------
function initPeticiones(){
  const listaUsuario = document.getElementById('lista-peticiones-usuario');
  const peticionTexto = document.getElementById('peticion-texto');
  const enviarPeticionBtn = document.getElementById('enviar-peticion');
  const listaAdmin = null; // ya no existe visualmente, pero mantenemos datos


  if (!listaUsuario || !peticionTexto || !enviarPeticionBtn){
    console.warn("initPeticiones: faltan elementos del DOM.");
    return;
  }

  const KEY_USER = 'peticionesUsuario';

  function load(){
    return JSON.parse(localStorage.getItem(KEY_USER) || '[]');
  }
  function save(arr){
    localStorage.setItem(KEY_USER, JSON.stringify(arr));
  }

  function render(){
    const user = load();
    listaUsuario.innerHTML = '';
    user.forEach((p, idx) => {
      const li = document.createElement('li');
      li.className = 'peticion-item';

      const left = document.createElement('div');
      left.className = 'peticion-left';

      const textoDiv = document.createElement('div');
      textoDiv.textContent = p.texto;
      left.appendChild(textoDiv);

      if(p.fecha){
        const fechaDiv = document.createElement('div');
        fechaDiv.className = 'fecha-hora';
        fechaDiv.textContent = p.fecha;
        fechaDiv.style.fontSize = '0.85em';
        fechaDiv.style.opacity = '0.85';
        left.appendChild(fechaDiv);
      }

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '8px';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!p.visto;
      chk.addEventListener('change', () => {
        const u = load();
        u[idx].visto = chk.checked;
        save(u);
        render();
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', ()=> {
        const u = load();
        u.splice(idx,1);
        save(u);
        render();
      });

      right.appendChild(chk);
      right.appendChild(delBtn);

      li.appendChild(left);
      li.appendChild(right);
      listaUsuario.appendChild(li);
    });
  }

  function agregarPeticion(textoRaw){
    const texto = String(textoRaw || '').trim();
    if(!texto) return;
    const nueva = { texto, fecha: new Date().toLocaleString(), visto: false };
    const u = load();
    u.unshift(nueva);
    save(u);
    render();
  }

  enviarPeticionBtn.addEventListener('click', ()=> {
    agregarPeticion(peticionTexto.value);
    peticionTexto.value = '';
  });

  render();
}
// === CONTROL FINAL DE BOTÓN DE PETICIONES (versión calendario siempre visible) ===
document.addEventListener("DOMContentLoaded", () => {
  const btnPeticiones = document.getElementById("btn-peticiones");
  const peticionesSection = document.getElementById("peticiones-section");

  if (!btnPeticiones || !peticionesSection) {
    console.warn("No se encuentran los elementos necesarios para el control de Peticiones.");
    return;
  }

  // Estado inicial: el cajón de peticiones oculto
  peticionesSection.classList.add("oculto");
  peticionesSection.style.display = "none";

  // Función central: alternar sólo el cajón de peticiones
  const togglePeticiones = () => {
    const visible = !peticionesSection.classList.contains("oculto") && 
                    peticionesSection.style.display !== "none";

    if (visible) {
      // 🔹 Oculta el cajón de peticiones
      peticionesSection.classList.add("oculto");
      peticionesSection.style.display = "none";
    } else {
      // 🔹 Muestra el cajón de peticiones
      peticionesSection.classList.remove("oculto");
      peticionesSection.style.display = "block";
      peticionesSection.removeAttribute("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  btnPeticiones.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePeticiones();
  });
});

// === CONTROL FINAL Y DEFINITIVO DE BOTÓN "PETICIONES" ===
document.addEventListener("DOMContentLoaded", () => {
  const btnPeticiones = document.getElementById("btn-peticiones");
  const peticionesSection = document.getElementById("peticiones-section");

  if (!btnPeticiones || !peticionesSection) {
    console.warn("No se encuentran los elementos necesarios para el control de Peticiones.");
    return;
  }

  // Estado inicial: peticiones ocultas
  peticionesSection.classList.add("oculto");
  peticionesSection.style.display = "none";

  btnPeticiones.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const visible = peticionesSection.style.display !== "none" && !peticionesSection.classList.contains("oculto");

    if (visible) {
      // 🔹 Oculta el cajón de peticiones
      peticionesSection.classList.add("oculto");
      peticionesSection.style.display = "none";
    } else {
      // 🔹 Muestra el cajón de peticiones
      peticionesSection.classList.remove("oculto");
      peticionesSection.style.display = "block";
    }
  });
});
// === EXCEL DEL COORDINADOR ===
document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("excel-coordinador");
  if (!tabla) return;

  // Cargar desde localStorage
  const guardado = JSON.parse(localStorage.getItem("tablaCoordinador") || "[]");
  const filas = tabla.querySelectorAll("tbody tr");
  guardado.forEach((fila, i) => {
    if (filas[i]) {
      const celdas = filas[i].querySelectorAll("td");
      fila.forEach((valor, j) => {
        if (celdas[j]) celdas[j].textContent = valor;
      });
    }
  });

  // Guardado automático en cada cambio
  tabla.addEventListener("input", () => {
    const datos = [];
    tabla.querySelectorAll("tbody tr").forEach(fila => {
      const filaDatos = [];
      fila.querySelectorAll("td").forEach(td => filaDatos.push(td.textContent.trim()));
      datos.push(filaDatos);
    });
    localStorage.setItem("tablaCoordinador", JSON.stringify(datos));
  });
});
// === Auto-Guardado del Excel del Coordinador ===
document.addEventListener("DOMContentLoaded", () => {
  const tabla = document.getElementById("tabla-coordinador");
  if (!tabla) return;

  const cells = tabla.querySelectorAll("td[contenteditable], th.titulo-ciclo");

  // Cargar estado guardado al abrir
  const savedData = JSON.parse(localStorage.getItem("tablaCoordinador")) || [];
  savedData.forEach((text, i) => {
    if (cells[i]) cells[i].innerText = text;
  });

  // Guardar en cada cambio
  cells.forEach((cell, i) => {
    cell.addEventListener("input", () => {
      const data = Array.from(cells).map(c => c.innerText);
      localStorage.setItem("tablaCoordinador", JSON.stringify(data));
    });
  });
});

// Abre un selector de color tipo "paleta" y aplica el callback
function openColorPicker(targetCell, callback, paletteColors = []) {

  // Elimina paletas anteriores si quedaran abiertas
  const existing = document.getElementById("temp-color-picker");
  if (existing) existing.remove();

  // Crear contenedor flotante
  const picker = document.createElement("div");
  picker.id = "temp-color-picker";
  picker.style.position = "absolute";
  picker.style.padding = "8px";
  picker.style.background = "white";
  picker.style.border = "1px solid #ccc";
  picker.style.borderRadius = "6px";
  picker.style.display = "flex";
  picker.style.gap = "6px";
  picker.style.zIndex = "9999";
  picker.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";

  // Posicionar cerca de la celda pulsada
  const rect = targetCell.getBoundingClientRect();
  picker.style.top = (window.scrollY + rect.bottom + 5) + "px";
  picker.style.left = (window.scrollX + rect.left) + "px";

  // Añadir colores
  paletteColors.forEach(color => {
    const dot = document.createElement("div");
    dot.style.width = "28px";
    dot.style.height = "28px";
    dot.style.borderRadius = "50%";
    dot.style.border = "1px solid #666";
    dot.style.cursor = "pointer";
    dot.style.background = color;

    dot.addEventListener("click", () => {
      callback(color); // ✅ AQUÍ SE APLICA EL COLOR
      picker.remove(); // cerrar paleta
    });

    picker.appendChild(dot);
  });

  document.body.appendChild(picker);

  // Cerrar si clicas fuera
  document.addEventListener("click", function close(e){
    if (!picker.contains(e.target) && e.target !== targetCell) {
      picker.remove();
      document.removeEventListener("click", close);
    }
  });

}

document.getElementById("limpiar-tabla").addEventListener("click", function () {
  const celdas = document.querySelectorAll("#tabla-coordinador tbody td[contenteditable='true']");
  celdas.forEach(celda => celda.textContent = "");
});

document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const app = document.getElementById("app");
  const logo = document.getElementById("splash-logo");

  const calendarioSection = document.getElementById("calendar-panel");
  const licenciasSection = document.getElementById("licencias-container");

  // Estado inicial: solo splash visible
  app.classList.add("oculto");
  calendarioSection.classList.add("oculto");
  licenciasSection.classList.add("oculto");

  logo.addEventListener("click", () => {
    // Oculta splash y muestra app
    splash.classList.add("oculto");
    app.classList.remove("oculto");

    // Mostrar solo el calendario
    calendarioSection.classList.remove("oculto");
    licenciasSection.classList.add("oculto");

    // Animación
    calendarioSection.classList.add("fade-in-up");

    // Desplazar suave al calendario
    setTimeout(() => {
      calendarioSection.scrollIntoView({ behavior: "smooth" });
    }, 200);
  });
});

// Añade clase solo a las casillas de turnos (3ª a 7ª columna)
document.querySelectorAll("tbody tr").forEach(fila => {
  const celdas = fila.querySelectorAll("td");
  celdas.forEach((celda, index) => {
    if (index >= 2 && index <= 6) {
      celda.classList.add("turno-editable");
    }
  });
});

  // ------------------ FIN app.js ------------------
