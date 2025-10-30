// =================== app.js ===================
// Versión 1.2.1 - base 1.2 con modal cadencias translúcido y persistencia localStorage
// ÚNICO objetivo: mantener exactamente la lógica/estructura anterior, añadir modal visual
// y persistencia de cadencias además de las licencias (colors+values).

// Init
document.addEventListener('DOMContentLoaded', () => {
  initApp();

  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) themeBtn.addEventListener('click', () => document.body.classList.toggle('dark'));

  const applyBtn = document.getElementById('btn-apply-cadence');
  const clearBtn = document.getElementById('btn-clear-cadence');
  if (applyBtn) applyBtn.addEventListener('click', () => openCadenceModal());
  if (clearBtn) clearBtn.addEventListener('click', () => clearCadencePrompt());

  // conectar handles de licencia a la paleta unificada (se usan mismas paletas)
  bindLicenciaHandles();

  // restaurar persistencia de manualEdits y cadenceSpec
  restoreManualEdits();
  restoreCadenceSpec();
});

// ---------------- estado ----------------
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = []; // array con {date: Date, type: string}
let cadenceSpec = null; // { type: 'V-1'|'V-2'|'Personalizada', startISO: '', pattern: [...], v1Index:0 }
let manualEdits = {}; // mapa "YYYY-MM-DD" -> { M: { text?, color?, userColor? }, T:..., N:... }

// cargar manualEdits si existe
function restoreManualEdits(){
  try {
    const raw = localStorage.getItem('turnapp.manualEdits');
    if (raw) manualEdits = JSON.parse(raw);
  } catch(e){ manualEdits = {}; }
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
  // total
  recalcLicenciasTotal();
}
function saveManualEdits(){
  try { localStorage.setItem('turnapp.manualEdits', JSON.stringify(manualEdits)); } catch(e){}
}
function saveLicenciaValue(tipo, value, color){
  try {
    localStorage.setItem('turnapp.licencia.'+tipo, JSON.stringify({ value: value, color: color }));
  } catch(e){}
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

// paleta color (intensa)
const colorPalette = [
  "#ff4d4d","#ffa64d","#ffd24d","#85e085","#4dd2ff",
  "#4d79ff","#b84dff","#ff4da6","#a6a6a6","#ffffff",
  "rgba(232,240,255,1)","rgba(163,193,255,0.65)","rgba(255,179,179,0.45)"
];

// ---------------- utilidades ----------------
function dateKey(year, month, day){
  const mm = String(month+1).padStart(2,'0');
  const dd = String(day).padStart(2,'0');
  return `${year}-${mm}-${dd}`; // YYYY-MM-DD
}
function isColorLight(hex){
  if(!hex) return true;
  // Accept rgba(...) too: approximate by ignoring alpha if present
  if(hex.indexOf('rgba')===0 || hex.indexOf('rgb')===0){
    // crude parse
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
function defaultTextFor(shiftKey){ return shiftKey; } // 'M','T','N'

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

  // licencia inputs binding + initial recalc
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

  // Primer día del mes (adaptado para lunes=0)
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0)? 6 : firstDay-1;

  const daysInMonth = new Date(year, month+1, 0).getDate();

  // Añadir días vacíos previos
  for(let i=0;i<firstDay;i++){
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell empty';
    calendar.appendChild(emptyCell);
  }

  // Añadir días
  for(let day=1; day<=daysInMonth; day++){
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const dateObj = new Date(year, month, day);
    const weekday = dateObj.getDay();
    if(weekday===6) cell.classList.add('saturday'); // sábado
    if(weekday===0) cell.classList.add('sunday');   // domingo

    // Festivos nacionales España: comparar día y mes directamente
    if(spanishHolidays.some(h => h.day===day && h.month===month)){
      cell.classList.add('holiday'); // mismo color que domingo
    }

    const label = document.createElement('div');
    label.className = 'day-label';
    const weekdayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    label.textContent = `${day} ${weekdayNames[weekday===0?6:weekday-1]}`;
    cell.appendChild(label);

    // Shifts wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'shifts-wrapper';

    const row = document.createElement('div');
    row.className = 'shifts-row';

    // Shifts M y T (lado a lado)
    row.appendChild(createShiftElement(year, month, day, 'M'));
    row.appendChild(createShiftElement(year, month, day, 'T'));
    wrapper.appendChild(row);

    // Shift N debajo
    wrapper.appendChild(createShiftElement(year, month, day, 'N'));

    cell.appendChild(wrapper);
    calendar.appendChild(cell);
  }

  // Aplicar cadencia si existe
  if(cadenceData.length>0){
    applyCadenceRender(month, year);
  }
}

// ---------------- crear turno ----------------
function createShiftElement(year, month, day, shiftKey){
  // contenedor para shift y handle
  const container = document.createElement('div');
  container.className = (shiftKey === 'N') ? 'shift-container night' : 'shift-container';

  const shift = document.createElement('div');
  shift.className = `shift-${shiftKey.toLowerCase()} shift-cell`;
  shift.contentEditable = true;
  shift.spellcheck = false;
  shift.dataset.shift = shiftKey;

  // restaurar texto/color guardados (si hay)
  const dk = dateKey(year, month, day);
  // Determinar fondo por defecto según día
  let defaultBg = '#e8f0ff'; // laboral
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
    // marcar si el text guardado es distinto del original
    if(obj.text !== undefined && obj.text !== null){
      shift.dataset.edited = (String(obj.text).trim() !== defaultTextFor(shiftKey)) ? 'true' : 'false';
    } else {
      shift.dataset.edited = 'false';
    }
  } else {
    shift.textContent = defaultTextFor(shiftKey);
    shift.dataset.edited = 'false';
  }

  // guardar al perder foco
  shift.addEventListener('blur', ()=> {
    const text = shift.textContent.trim();
    saveShiftText(year, month, day, shiftKey, text);
    shift.dataset.edited = (text !== defaultTextFor(shiftKey)) ? 'true' : 'false';
  });
  // evitar newline al pulsar Enter
  shift.addEventListener('keypress', (e)=> {
    if(e.key === 'Enter'){ e.preventDefault(); shift.blur(); }
  });

  // handle color (discreto)
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'color-handle';
  handle.title = 'Elegir color';
  handle.innerText = '●';
  // estilo mínimo inline (ya en CSS hay reglas pero dejamos esto para seguridad de tamaño)
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
      let target = handle;
      if(item){
        const cantidad = item.querySelector('.cantidad-input');
        if(cantidad) target = cantidad;
      }
      openColorPicker(handle, (color) => {
        // aplicar color visual al botón (licencia)
        handle.style.backgroundColor = color;
        // persistir
        const tipo = item.dataset.tipo;
        const value = (item.querySelector('.cantidad-input')||{value:0}).value;
        saveLicenciaValue(tipo, value, color);
      }, colorPalette);
    });
  });

  // asegurarse de recalcular total al inicio
  const inputs = Array.from(document.querySelectorAll('.cantidad-input'));
  inputs.forEach(i=>i.addEventListener('input', ()=> {
    const item = i.closest('.licencia-item');
    const tipo = item.dataset.tipo;
    const colorBtn = item.querySelector('.licencia-color');
    saveLicenciaValue(tipo, i.value, colorBtn && colorBtn.style.backgroundColor);
    recalcLicenciasTotal();
  }));
}

// Seleccion de color (popup) - palette por defecto colorPalette
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
  try {
    localStorage.setItem('turnapp.cadenceSpec', JSON.stringify(spec));
  } catch(e){}
}
function restoreCadenceSpec(){
  try {
    const raw = localStorage.getItem('turnapp.cadenceSpec');
    if(!raw) return;
    cadenceSpec = JSON.parse(raw);
    // construir cadenceData a partir de cadenceSpec
    if(cadenceSpec && cadenceSpec.startISO && cadenceSpec.pattern){
      cadenceData = [];
      const start = new Date(cadenceSpec.startISO);
      for(let i=0;i<10000;i++){
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const type = cadenceSpec.pattern[i % cadenceSpec.pattern.length];
        cadenceData.push({ date: d, type: type });
      }
      // render del mes actual para que se vea aplicada
      renderCalendar(currentMonth, currentYear);
    }
  } catch(e){ cadenceSpec = null; }
}

// ------------------ CADENCIAS (modal) ------------------
function openCadenceModal(){
  const overlay = document.getElementById('cadence-modal-overlay');
  const modal = document.getElementById('cadence-modal');
  if(!overlay || !modal) return;

  // reset UI
  document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('v1-options').style.display = 'none';
  document.getElementById('v2-options').style.display = 'none';
  document.getElementById('custom-section').style.display = 'none';
  document.getElementById('custom-pattern').value = '';
  document.getElementById('cadence-start').value = '';

  // if there is saved cadenceSpec, prefill
  if(cadenceSpec){
    document.getElementById('cadence-start').value = (new Date(cadenceSpec.startISO)).toLocaleDateString('es-ES');
    if(cadenceSpec.type === 'V-1'){
      document.querySelector('.modal-type-btn[data-type="V-1"]').classList.add('active');
      document.getElementById('v1-options').style.display = 'block';
      // choose radio if v1Index known
      if(typeof cadenceSpec.v1Index !== 'undefined'){
        const r = document.querySelector(`input[name="v1opt"][value="${cadenceSpec.v1Index}"]`);
        if(r) r.checked = true;
      }
    } else if(cadenceSpec.type === 'V-2'){
      document.querySelector('.modal-type-btn[data-type="V-2"]').classList.add('active');
      document.getElementById('v2-options').style.display = 'block';
    } else if(cadenceSpec.type === 'Personalizada'){
      document.querySelector('.modal-type-btn[data-type="Personalizada"]').classList.add('active');
      document.getElementById('custom-section').style.display = 'block';
      if(cadenceSpec.pattern) document.getElementById('custom-pattern').value = cadenceSpec.pattern.join(',');
    }
  }

  // events for selecting type within modal
  document.querySelectorAll('.modal-type-btn').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.dataset.type;
      document.getElementById('v1-options').style.display = (t==='V-1') ? 'block' : 'none';
      document.getElementById('v2-options').style.display = (t==='V-2') ? 'block' : 'none';
      document.getElementById('custom-section').style.display = (t==='Personalizada') ? 'block' : 'none';
    };
  });

  document.getElementById('close-cadence').onclick = () => {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden','true');
  };

  document.getElementById('apply-cadence-confirm').onclick = () => {
    // detect selected type
    const activeBtn = document.querySelector('.modal-type-btn.active');
    if(!activeBtn) return alert('Seleccione un tipo de cadencia.');
    const typ = activeBtn.dataset.type;
    const startStr = document.getElementById('cadence-start').value;
    if(!startStr) return alert('Introduce la fecha de inicio (DD/MM/AAAA).');
    // parse DD/MM/YYYY
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
        ['M/T','L','M/T','N','L','L','L','L'],
        ['M/T','M/T','N','L','L','L','L','L'],
        ['T','M/T','M/N','L','L','L','L','L'],
        ['M/T','N','L','L','L'],
        ['T','M/N','L','L','L']
      ];
      const pattern = v1options[idx];
      cadenceSpec = { type: 'V-1', startISO: start.toISOString(), pattern: pattern, v1Index: idx };
      saveCadenceSpec(cadenceSpec);
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    } else if(typ === 'V-2'){
      const pattern = ['M/T','M/T','L','L','L','L'];
      cadenceSpec = { type: 'V-2', startISO: start.toISOString(), pattern: pattern };
      saveCadenceSpec(cadenceSpec);
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    } else if(typ === 'Personalizada'){
      const raw = document.getElementById('custom-pattern').value;
      if(!raw) return alert('Introduce un patrón personalizado.');
      const pattern = raw.split(',').map(s=>s.trim()).filter(Boolean);
      if(pattern.length === 0) return alert('Patrón inválido.');
      cadenceSpec = { type: 'Personalizada', startISO: start.toISOString(), pattern: pattern };
      saveCadenceSpec(cadenceSpec);
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    }
    // cerrar
    const overlay2 = document.getElementById('cadence-modal-overlay');
    overlay2.style.display = 'none';
    overlay2.setAttribute('aria-hidden','true');
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

  // limpiar cadenceData desde esa fecha
  cadenceData = cadenceData.filter(cd => cd.date < startDate);

  // si la cadenceSpec empieza en/after startDate -> eliminar spec
  if(cadenceSpec && new Date(cadenceSpec.startISO) >= startDate){
    cadenceSpec = null;
    try { localStorage.removeItem('turnapp.cadenceSpec'); } catch(e){}
  } else {
    // conservar cadenceSpec pero nada que hacer
  }
  renderCalendar(currentMonth, currentYear);
}

// Restaurar cadenceSpec a partir de localStorage (ya se llama en init)
// function restoreCadenceSpec(){ ... } -> implementada arriba

// ---------------- aplicar cadencia sobre DOM (reglas precisas) ----------------
function applyCadenceRender(month, year){
  const cells = document.querySelectorAll('.day-cell');
  if(!cells) return;

  // colores por cadencia
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
          // N tiene texto blanco para contraste si se desea
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
      // Manejo múltiple: si hay M/T/N combinados
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
