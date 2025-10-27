// app.js - Versión 1.1 mejorada: persistencia completa de licencias + modal cadencia
// Mantiene todas tus reglas de cadencia y formato visual

document.addEventListener('DOMContentLoaded', () => {
  initApp();

  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) themeBtn.addEventListener('click', () => document.body.classList.toggle('dark'));

  const applyBtn = document.getElementById('btn-apply-cadence');
  const clearBtn = document.getElementById('btn-clear-cadence');
  if (applyBtn) applyBtn.addEventListener('click', () => openCadenceModal());
  if (clearBtn) clearBtn.addEventListener('click', () => clearCadencePrompt());

  // connect licencia color handles
  bindLicenciaHandles();
  bindLicenciaInputs();
});

// ---------------- state ----------------
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = []; // array {date: Date, type: string}
let manualEdits = {}; // persisted per user
let licenciasState = {}; // persisted { tipo: { cantidad, color } }

// load persisted data
try {
  const raw = localStorage.getItem('turnapp.manualEdits');
  if (raw) manualEdits = JSON.parse(raw);
} catch (e) { manualEdits = {}; }

try {
  const rawL = localStorage.getItem('turnapp.licencias');
  if (rawL) licenciasState = JSON.parse(rawL);
} catch (e) { licenciasState = {}; }

try {
  const rawC = localStorage.getItem('turnapp.cadenceData');
  if (rawC) {
    // store dates as ISO then parse back to Date when needed
    const parsed = JSON.parse(rawC);
    cadenceData = parsed.map(p => ({ date: new Date(p.date), type: p.type }));
  }
} catch (e) { cadenceData = []; }

// ---------------- constants ----------------
const spanishHolidays = [
  { day:1, month:0 }, { day:6, month:0 }, { day:1, month:4 },
  { day:15, month:7 }, { day:12, month:9 }, { day:1, month:10 },
  { day:6, month:11 }, { day:8, month:11 }, { day:25, month:11 }
];

const colorPalette = [
  "#ff4d4d","#ffa64d","#ffd24d","#85e085","#4dd2ff",
  "#4d79ff","#b84dff","#ff4da6","#a6a6a6","#ffffff",
  "rgba(232,240,255,1)",
  "rgba(163,193,255,0.55)",
  "rgba(255,179,179,0.35)"
];

// ---------------- utils ----------------
function dateKey(y,m,d){
  const mm = String(m+1).padStart(2,'0');
  const dd = String(d).padStart(2,'0');
  return `${y}-${mm}-${dd}`;
}
function saveManualEdits(){ try{ localStorage.setItem('turnapp.manualEdits', JSON.stringify(manualEdits)); }catch(e){} }
function saveLicencias(){ try{ localStorage.setItem('turnapp.licencias', JSON.stringify(licenciasState)); }catch(e){} }
function saveCadenceData(){ try{ localStorage.setItem('turnapp.cadenceData', JSON.stringify(cadenceData.map(c=>({date:c.date.toISOString(), type:c.type}))) ); }catch(e){} }
function isColorLight(hex){
  if(!hex) return true;
  // accept rgba(...) too => fallback light
  if(hex.indexOf('rgb')===0) return true;
  if(hex[0] !== '#') return true;
  const r = parseInt(hex.substr(1,2),16);
  const g = parseInt(hex.substr(3,2),16);
  const b = parseInt(hex.substr(5,2),16);
  const lum = 0.2126*r + 0.7152*g + 0.0722*b;
  return lum > 200;
}
function defaultTextFor(k){ return k; }

// ---------------- init / navigation ----------------
function initApp(){
  // set up calendar UI
  renderCalendar(currentMonth, currentYear);

  // prev / next
  const prev = document.getElementById('prevMonth');
  const next = document.getElementById('nextMonth');
  if(prev) prev.addEventListener('click', ()=> {
    currentMonth--; if(currentMonth<0){ currentMonth=11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  });
  if(next) next.addEventListener('click', ()=> {
    currentMonth++; if(currentMonth>11){ currentMonth=0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
  });

  // init licencias UI values from persisted state
  hydrateLicenciasUI();
  recalcLicenciasTotal();
}

// ---------------- render calendar ----------------
function renderCalendar(month, year){
  const calendar = document.getElementById('calendar');
  if(!calendar) return;
  calendar.innerHTML = '';

  const monthLabel = document.getElementById('monthLabel');
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  if(monthLabel) monthLabel.textContent = `${meses[month]} ${year}`;

  // first day starting Monday=0
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0) ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month+1, 0).getDate();

  for(let i=0;i<firstDay;i++){
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    calendar.appendChild(empty);
  }

  for(let day=1; day<=daysInMonth; day++){
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const dateObj = new Date(year, month, day);
    const weekday = dateObj.getDay();
    if(weekday === 6) cell.classList.add('saturday');
    if(weekday === 0) cell.classList.add('sunday');
    if(spanishHolidays.some(h=>h.day===day && h.month===month)) cell.classList.add('holiday');

    const label = document.createElement('div');
    label.className = 'day-label';
    const weekdayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    label.textContent = `${day} ${weekdayNames[weekday===0?6:weekday-1]}`;
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

  // apply cadence if any
  if(cadenceData.length > 0) applyCadenceRender(month, year);
}

// ---------------- create shift element ----------------
function createShiftElement(year, month, day, shiftKey){
  const container = document.createElement('div');
  container.className = (shiftKey === 'N') ? 'shift-container night' : 'shift-container';

  const shift = document.createElement('div');
  shift.className = `shift-${shiftKey.toLowerCase()} shift-cell`;
  shift.contentEditable = true;
  shift.spellcheck = false;
  shift.dataset.shift = shiftKey;

  const dk = dateKey(year, month, day);

  // determine default background by day
  let defaultBg = '#e8f0ff';
  const weekday = new Date(year, month, day).getDay();
  if(weekday === 6) defaultBg = 'rgba(163,193,255,0.55)';
  if(weekday === 0 || spanishHolidays.some(h=>h.day===day && h.month===month)) defaultBg = 'rgba(255,179,179,0.35)';

  // set default bg so palette includes same visually by default
  shift.style.backgroundColor = defaultBg;
  shift.style.color = '#000';

  // restore manual edits if exist
  if(manualEdits[dk] && manualEdits[dk][shiftKey]){
    const obj = manualEdits[dk][shiftKey];
    shift.textContent = (obj.text !== undefined && obj.text !== null) ? obj.text : defaultTextFor(shiftKey);
    if(obj.color){
      shift.style.backgroundColor = obj.color;
      shift.dataset.userColor = 'true';
      shift.style.color = isColorLight(obj.color)?'#000':'#fff';
    }
    shift.dataset.edited = (obj.text !== undefined && String(obj.text).trim() !== defaultTextFor(shiftKey)) ? 'true' : 'false';
  } else {
    shift.textContent = defaultTextFor(shiftKey);
    shift.dataset.edited = 'false';
  }

  // save text on blur
  shift.addEventListener('blur', ()=> {
    const text = shift.textContent.trim();
    saveShiftText(year, month, day, shiftKey, text);
    shift.dataset.edited = (text !== defaultTextFor(shiftKey)) ? 'true' : 'false';
  });

  // prevent newline on enter
  shift.addEventListener('keypress', (e)=> {
    if(e.key === 'Enter'){ e.preventDefault(); shift.blur(); }
  });

  // tiny handle (discreet)
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'color-handle';
  handle.title = 'Elegir color';
  handle.innerText = '●';
  handle.addEventListener('click', (ev)=> {
    ev.stopPropagation();
    openColorPicker(handle, (color) => {
      shift.style.backgroundColor = color;
      shift.style.color = isColorLight(color) ? '#000' : '#fff';
      shift.dataset.userColor = 'true';
      if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
      manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
      manualEdits[dk][shiftKey].color = color;
      manualEdits[dk][shiftKey].userColor = true;
      saveManualEdits();
    });
  });

  container.appendChild(shift);
  container.appendChild(handle);
  return container;
}

// ---------------- save text/color ----------------
function saveShiftText(year, month, day, shiftKey, text){
  const dk = dateKey(year, month, day);
  if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
  manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
  manualEdits[dk][shiftKey].text = text;
  saveManualEdits();
}

// ---------------- color picker (used by shifts & licencias) ----------------
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
    if(!popup.contains(ev.target) && ev.target !== anchorEl){
      popup.remove();
      document.removeEventListener('click', closeFn);
    }
  };
  setTimeout(()=> document.addEventListener('click', closeFn), 10);
}

// ---------------- Licencias: bind handles & inputs ----------------
function bindLicenciaHandles(){
  document.querySelectorAll('.licencia-color-handle').forEach(handle => {
    handle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const item = handle.closest('.licencia-item');
      if(!item) return;
      const tipo = item.dataset.tipo;
      // target will be the cantidad input (for visual color)
      const cantidad = item.querySelector('.cantidad-input');
      const targetEl = cantidad || handle;
      openColorPicker(handle, (color) => {
        targetEl.style.backgroundColor = color;
        targetEl.dataset.userColor = 'true';
        // persist
        if(!licenciasState[tipo]) licenciasState[tipo] = { cantidad: Number((cantidad && cantidad.value) || 0), color: color };
        else { licenciasState[tipo].color = color; }
        saveLicencias();
      });
    });
  });
}
function bindLicenciaInputs(){
  const inputs = Array.from(document.querySelectorAll('.cantidad-input'));
  inputs.forEach(i => {
    i.addEventListener('input', () => {
      const item = i.closest('.licencia-item');
      const tipo = item && item.dataset.tipo;
      if(!tipo) return;
      if(!licenciasState[tipo]) licenciasState[tipo] = { cantidad:0, color:null };
      licenciasState[tipo].cantidad = Number(i.value) || 0;
      saveLicencias();
      recalcLicenciasTotal();
    });
  });
}

// hydrate licencias UI from storage
function hydrateLicenciasUI(){
  const items = document.querySelectorAll('.licencia-item');
  items.forEach(item => {
    const tipo = item.dataset.tipo;
    const input = item.querySelector('.cantidad-input');
    const handle = item.querySelector('.licencia-color-handle');
    const state = licenciasState[tipo];
    if(state){
      if(input) input.value = Number(state.cantidad) || 0;
      if(state.color && input) {
        input.style.backgroundColor = state.color;
        input.dataset.userColor = 'true';
      }
    }
  });
  // attach recalc
  recalcLicenciasTotal();
}
function recalcLicenciasTotal(){
  const inputs = Array.from(document.querySelectorAll('.cantidad-input'));
  let total = 0;
  inputs.forEach(i => total += Number(i.value) || 0);
  const totalField = document.getElementById('total-licencias');
  if(totalField) totalField.value = total;
}

// ---------------- Cadence modal ----------------
function openCadenceModal(){
  const modal = document.getElementById('cadence-modal');
  if(!modal) return;
  const card = modal.querySelector('.modal-card');
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden','false');
  setTimeout(()=> card.classList.add('show'), 10);

  // elements
  const typeSel = document.getElementById('modal-cadence-type');
  const v1Options = document.getElementById('v1-options');
  const v1Choice = document.getElementById('modal-v1-choice');
  const personalRow = document.getElementById('personal-row');
  const customInput = document.getElementById('modal-custom-pattern');
  const startInput = document.getElementById('modal-start-date');
  const cancelBtn = document.getElementById('modal-cancel');
  const applyBtn = document.getElementById('modal-apply');

  // show/hide logic
  function updateModalUI(){
    const t = typeSel.value;
    if(t === 'V-1'){
      v1Options.style.display = 'flex';
      personalRow.style.display = 'none';
    } else if(t === 'Personalizada'){
      v1Options.style.display = 'none';
      personalRow.style.display = 'flex';
    } else {
      v1Options.style.display = 'none';
      personalRow.style.display = 'none';
    }
  }
  typeSel.addEventListener('change', updateModalUI);
  updateModalUI();

  // cancel handler
  function closeModal(){
    card.classList.remove('show');
    setTimeout(()=> {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden','true');
    }, 180);
    // cleanup listeners
    cancelBtn.removeEventListener('click', onCancel);
    applyBtn.removeEventListener('click', onApply);
  }
  function onCancel(){ closeModal(); }

  // apply handler
  function onApply(){
    const t = typeSel.value;
    const startVal = startInput.value && startInput.value.trim();
    if(!startVal) { alert('Introduce la fecha de inicio (DD/MM/AAAA)'); return; }
    const parts = startVal.split('/');
    if(parts.length!==3) { alert('Formato de fecha incorrecto'); return; }
    const d = parseInt(parts[0],10), m = parseInt(parts[1],10)-1, y = parseInt(parts[2],10);
    const startDate = new Date(y,m,d);
    if(isNaN(startDate)) { alert('Fecha inválida'); return; }

    if(t === 'V-1'){
      const idx = parseInt(v1Choice.value,10);
      const v1options = [
        ['MT','L','MT','N','L','L','L','L'],
        ['MT','MT','N','L','L','L','L','L'],
        ['T','MT','M/N','L','L','L','L','L'],
        ['MT','N','L','L','L'],
        ['T','M/N','L','L','L']
      ];
      const pattern = v1options[idx];
      cadenceData = buildCadenceFromPattern(startDate, pattern);
    } else if(t === 'V-2'){
      const pattern = ['MT','MT','L','L','L','L'];
      cadenceData = buildCadenceFromPattern(startDate, pattern);
    } else if(t === 'Personalizada'){
      const raw = customInput.value && customInput.value.trim();
      if(!raw){ alert('Escribe el patrón personalizado'); return; }
      const pattern = raw.split(',').map(s=>s.trim()).filter(Boolean);
      if(pattern.length === 0){ alert('Patrón inválido'); return; }
      cadenceData = buildCadenceFromPattern(startDate, pattern);
    }

    // persist cadence
    saveCadenceData();
    renderCalendar(currentMonth, currentYear);
    closeModal();
  }

  cancelBtn.addEventListener('click', onCancel);
  applyBtn.addEventListener('click', onApply);
}

// helper to generate large cadence array (effectively 'infinite' coverage)
function buildCadenceFromPattern(startDate, pattern){
  const out = [];
  for(let i=0;i<10000;i++){
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    out.push({ date: d, type: pattern[i % pattern.length] });
  }
  return out;
}

// ---------------- clear cadence prompt (keeps same UI behavior as before) ----------------
function clearCadencePrompt(){
  const startDateStr = prompt("Introduce la fecha desde la que quieres limpiar la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;
  const parts = startDateStr.split('/');
  if(parts.length !== 3) return alert("Formato incorrecto");
  const day = parseInt(parts[0],10), month = parseInt(parts[1],10)-1, year = parseInt(parts[2],10);
  const startDate = new Date(year, month, day);
  if(isNaN(startDate)) return alert("Fecha inválida");

  cadenceData = cadenceData.filter(cd => cd.date < startDate);
  saveCadenceData();
  renderCalendar(currentMonth, currentYear);
}

// ---------------- apply cadence render (rules respected) ----------------
function applyCadenceRender(month, year){
  const cells = document.querySelectorAll('.day-cell');
  if(!cells) return;

  const cadColorMT = '#ffa94d';
  const cadColorN = '#d87d00';

  cells.forEach(cell => {
    const label = cell.querySelector('.day-label');
    if(!label) return;
    const parts = label.textContent.split(' ');
    const day = parseInt(parts[0],10);
    if(isNaN(day)) return;

    const cellDate = new Date(year, month, day);
    const cd = cadenceData.find(c => 
      c.date.getFullYear() === cellDate.getFullYear() &&
      c.date.getMonth() === cellDate.getMonth() &&
      c.date.getDate() === cellDate.getDate()
    );

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
          // N uses darker text contrast in many places - we keep this rule:
          shiftEl.style.color = (shiftKey === 'N') ? '#fff' : '#000';
          shiftEl.dataset.cadenceApplied = 'true';
        } else {
          shiftEl.dataset.cadenceApplied = 'false';
        }
      } else {
        if(allowCadence && shiftEl.dataset.cadenceApplied === 'true'){
          // remove cadence color (restore default background color by clearing inline style)
          shiftEl.style.backgroundColor = '';
          shiftEl.style.color = '#000';
          shiftEl.dataset.cadenceApplied = 'false';
        }
      }
    }

    if(cd){
      // allow combined types (e.g. M/N or M/N combos). We split on '/'
      const types = (typeof cd.type === 'string') ? cd.type.split('/') : [cd.type];
      applyToShift(shiftM, 'M', types.includes('M') || types.includes('MT'), cadColorMT);
      applyToShift(shiftT, 'T', types.includes('T') || types.includes('MT'), cadColorMT);
      applyToShift(shiftN, 'N', types.includes('N') || types.includes('M/N') || types.includes('M/N'), cadColorN);
    } else {
      [['M',shiftM],['T',shiftT],['N',shiftN]].forEach(([k, el])=>{
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

// ---------------- Licencias state management (public helpers) ----------------
function updateLicenciaStateFromUI(){
  document.querySelectorAll('.licencia-item').forEach(item => {
    const tipo = item.dataset.tipo;
    const input = item.querySelector('.cantidad-input');
    const colorHandle = item.querySelector('.licencia-color-handle');
    if(!tipo) return;
    const cantidad = Number(input.value) || 0;
    const color = input.style.backgroundColor || colorHandle.style.backgroundColor || null;
    if(!licenciasState[tipo]) licenciasState[tipo] = { cantidad: cantidad, color: color };
    else { licenciasState[tipo].cantidad = cantidad; licenciasState[tipo].color = color; }
  });
  saveLicencias();
  recalcLicenciasTotal();
}

// ensure handles & inputs functional after render
function rebindAll() {
  bindLicenciaHandles();
  bindLicenciaInputs();
}

// We rebind handles when needed (but we keep bindings stable by calling this at init and not overwriting layout)
// Note: createShiftElement attaches its own handle behaviour on each render

// ---------------- Export note ----------------
// This file is complete. Pega y reemplaza el app.js de tu proyecto.
// Persistencia silenciosa implementada para manualEdits y licencias, y para cadenceData.
