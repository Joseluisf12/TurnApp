// =================== app.js ===================
// Versión final: persistencia por turno + reglas de cadencia según lo acordado

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) themeBtn.addEventListener('click', () => document.body.classList.toggle('dark'));

  const btnApplyCadence = document.getElementById('btn-apply-cadence');
  const btnClearCadence = document.getElementById('btn-clear-cadence');
  if (btnApplyCadence) btnApplyCadence.addEventListener('click', ()=> applyCadencePrompt());
  if (btnClearCadence) btnClearCadence.addEventListener('click', ()=> clearCadencePrompt());
});

// ---------------- estado ----------------
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = []; // array de {date: Date, type: 'MT'|'N'|'libre'}

let manualEdits = {}; // mapa "YYYY-MM-DD" -> { M: { text?, color?, userColor? }, T:..., N:... }

// cargar manualEdits si existe
try {
  const raw = localStorage.getItem('turnapp.manualEdits');
  if (raw) manualEdits = JSON.parse(raw);
} catch(e){ manualEdits = {}; }

// festivos nacionales (simple lista, mes 0-11)
const spanishHolidays = [
  { day:1, month:0 }, { day:6, month:0 }, { day:1, month:4 },
  { day:15, month:7 }, { day:12, month:9 }, { day:1, month:10 },
  { day:6, month:11 }, { day:8, month:11 }, { day:25, month:11 }
];

// paleta color (intensa)
const colorPalette = [
  "#ff4d4d","#ffa64d","#ffd24d","#85e085","#4dd2ff",
  "#4d79ff","#b84dff","#ff4da6","#a6a6a6","#ffffff"
];

// ---------------- utilidades ----------------
function dateKey(year, month, day){
  const mm = String(month+1).padStart(2,'0');
  const dd = String(day).padStart(2,'0');
  return `${year}-${mm}-${dd}`; // YYYY-MM-DD
}
function saveManualEdits(){
  try { localStorage.setItem('turnapp.manualEdits', JSON.stringify(manualEdits)); } catch(e){}
}
function isColorLight(hex){
  if(!hex || hex[0] !== '#') return true;
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
}

// ---------------- render calendario ----------------
function renderCalendar(month, year){
  const calendar = document.getElementById('calendar');
  if(!calendar) return;
  calendar.innerHTML = '';

  const monthLabel = document.getElementById('monthLabel');
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  if(monthLabel) monthLabel.textContent = `${meses[month]} ${year}`;

  // primer día (lunes = 0)
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0) ? 6 : firstDay - 1;

  const daysInMonth = new Date(year, month+1, 0).getDate();

  // celdas vacías previas
  for(let i=0;i<firstDay;i++){
    const empty = document.createElement('div');
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

    // Shifts M y T (lado a lado)
    row.appendChild(createShiftElement(year, month, day, 'M'));
    row.appendChild(createShiftElement(year, month, day, 'T'));
    wrapper.appendChild(row);

    // Shift N debajo
    wrapper.appendChild(createShiftElement(year, month, day, 'N'));

    cell.appendChild(wrapper);
    calendar.appendChild(cell);
  }

  // reaplicar cadencia
  if(cadenceData.length > 0) applyCadenceRender(month, year);
}

// ---------------- crear turno ----------------
function createShiftElement(year, month, day, shiftKey){
  // contenedor para shift y handle si quieres (se puede ajustar CSS)
  const container = document.createElement('div');
  container.className = (shiftKey === 'N') ? 'shift-container night' : 'shift-container';

  const shift = document.createElement('div');
  shift.className = `shift-${shiftKey.toLowerCase()} shift-cell`;
  shift.contentEditable = true;
  shift.spellcheck = false;
  shift.dataset.shift = shiftKey;

  // restaurar texto/color guardados
  const dk = dateKey(year, month, day);
  if(manualEdits[dk] && manualEdits[dk][shiftKey]){
    const obj = manualEdits[dk][shiftKey];
    if(obj.text !== undefined && obj.text !== null) shift.textContent = obj.text;
    else shift.textContent = defaultTextFor(shiftKey);
    if(obj.color){
      shift.style.backgroundColor = obj.color;
      shift.style.color = isColorLight(obj.color) ? '#000' : '#fff';
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

  // cuando pierde foco, guardamos solo ese turno (sin tocar otros)
  shift.addEventListener('blur', ()=> {
    const text = shift.textContent.trim();
    saveShiftText(year, month, day, shiftKey, text);
    // actualizar flag edited
    shift.dataset.edited = (text !== defaultTextFor(shiftKey)) ? 'true' : 'false';
  });
  // evitar newline al pulsar Enter
  shift.addEventListener('keypress', (e)=> {
    if(e.key === 'Enter'){ e.preventDefault(); shift.blur(); }
  });

  // pequeño handle para abrir paleta (para no interferir con edición por click)
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'color-handle';
  handle.title = 'Elegir color';
  handle.innerText = '●';
  handle.addEventListener('click', (ev)=> {
    ev.stopPropagation();
    openColorPicker(handle, (color)=>{
      // aplicar color => marcar como userColor y guardar color para ese turno
      shift.style.backgroundColor = color;
      shift.style.color = isColorLight(color) ? '#000' : '#fff';
      shift.dataset.userColor = 'true';
      // asegurarse de que manualEdits[dk] existe
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

// ---------------- guardar texto/color específicos ----------------
function saveShiftText(year, month, day, shiftKey, text){
  const dk = dateKey(year, month, day);
  if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
  manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
  manualEdits[dk][shiftKey].text = text;
  // si guardas texto y no has cambiado color, no tocar color entry aquí (preservar)
  // marcar userColor no se toca
  saveManualEdits();
}
function saveShiftColor(year, month, day, shiftKey, color){
  const dk = dateKey(year, month, day);
  if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
  manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
  manualEdits[dk][shiftKey].color = color;
  manualEdits[dk][shiftKey].userColor = true;
  saveManualEdits();
}

// ---------------- paleta ----------------
function openColorPicker(anchorEl, onSelect){
  // quitar viejo
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

  colorPalette.forEach(color => {
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
  // ajustar si sale fuera
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

// ---------------- cadencia ----------------
function applyCadencePrompt(){
  const startDateStr = prompt("Introduce la fecha inicial de la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;
  const parts = startDateStr.split('/');
  if(parts.length!==3) return alert("Formato incorrecto");
  const day = parseInt(parts[0],10), month = parseInt(parts[1],10)-1, year = parseInt(parts[2],10);
  const startDate = new Date(year, month, day);
  if(isNaN(startDate)) return alert("Fecha inválida");

  cadenceData = [];
  for(let i=0;i<10000;i++){
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const type = ['MT','libre','MT','N','libre','libre','libre','libre'][i%8];
    cadenceData.push({ date: d, type: type });
  }
  renderCalendar(currentMonth, currentYear);
}
function clearCadencePrompt(){
  const startDateStr = prompt("Introduce la fecha desde la que quieres limpiar la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;
  const parts = startDateStr.split('/');
  if(parts.length!==3) return alert("Formato incorrecto");
  const day = parseInt(parts[0],10), month = parseInt(parts[1],10)-1, year = parseInt(parts[2],10);
  const startDate = new Date(year, month, day);
  if(isNaN(startDate)) return alert("Fecha inválida");

  cadenceData = cadenceData.filter(cd => cd.date < startDate);
  renderCalendar(currentMonth, currentYear);
}

// ---------------- aplicar cadencia (reglas precisas) ----------------
function applyCadenceRender(month, year){
  const cells = document.querySelectorAll('.day-cell');
  if(!cells) return;

  // colores por cadencia (puedes sacar variables CSS si quieres)
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

    // helper para obtener flags a partir de manualEdits persistidos (asegura consistencia)
    function getFlagsForShift(shiftEl, shiftKey){
      const dk = dateKey(year, month, day);
      const saved = (manualEdits[dk] && manualEdits[dk][shiftKey]) ? manualEdits[dk][shiftKey] : {};
      const userColor = !!saved.color || shiftEl.dataset.userColor === 'true';
      // texto editado: comparar texto guardado (si hay) o texto actual vs original
      let edited = false;
      if(saved.text !== undefined && saved.text !== null){
        edited = String(saved.text).trim() !== defaultTextFor(shiftKey);
      } else {
        edited = String(shiftEl.textContent || '').trim() !== defaultTextFor(shiftKey);
      }
      // also check whether current DOM has dataset.edited
      if(shiftEl.dataset.edited === 'true') edited = true;
      return { userColor, edited, savedText: saved.text, savedColor: saved.color };
    }

    function applyToShift(shiftEl, shiftKey, activeForCadence, cadenceColor){
      if(!shiftEl) return;
      const { userColor, edited } = getFlagsForShift(shiftEl, shiftKey);
      // decidir si la cadencia puede aplicar color:
      // allowCadence = NOT ( userColor && edited )
      // pero rule 3 says if userColor && text original -> cadence applies -> that's covered because edited=false -> allow true
      const allowCadence = !(userColor && edited);
      if(activeForCadence){
        if(allowCadence){
          // cadencia aplica color (manteniendo texto)
          shiftEl.style.backgroundColor = cadenceColor;
          shiftEl.style.color = '#fff';
          // mark that this is cadence-applied (we do not set dataset.userColor)
          shiftEl.dataset.cadenceApplied = 'true';
        } else {
          // do nothing (preserve user color and text)
          // ensure cadenceApplied flag removed
          shiftEl.dataset.cadenceApplied = 'false';
        }
      } else {
        // cadencia says "no active" -> if allowCadence, remove cadence color (but restore nothing)
        // If userColor exists and edited=false case, and cadence shouldn't apply, we must restore userColor. But by construction:
        // - If userColor && edited=false, allowCadence=true and we would have set cadence color above.
        // - If userColor && edited=true => allowCadence=false -> we must preserve user color (already present)
        if(allowCadence){
          // remove cadence color only if it was applied previously
          if(shiftEl.dataset.cadenceApplied === 'true'){
            shiftEl.style.backgroundColor = '';
            shiftEl.style.color = '';
            shiftEl.dataset.cadenceApplied = 'false';
          }
        } else {
          // nothing to do: preserve user color/text
        }
      }
    }

    if(cd){
      if(cd.type === 'MT'){
        applyToShift(shiftM,'M', true, cadColorMT);
        applyToShift(shiftT,'T', true, cadColorMT);
        applyToShift(shiftN,'N', false, cadColorN);
      } else if(cd.type === 'N'){
        applyToShift(shiftM,'M', false, cadColorMT);
        applyToShift(shiftT,'T', false, cadColorMT);
        applyToShift(shiftN,'N', true, cadColorN);
      } else if(cd.type === 'libre'){
        applyToShift(shiftM,'M', false, cadColorMT);
        applyToShift(shiftT,'T', false, cadColorMT);
        applyToShift(shiftN,'N', false, cadColorN);
      }
    } else {
      // no hay cadencia para este día -> limpiar posibles cadenciaApplied flags
      [ ['M',shiftM], ['T',shiftT], ['N',shiftN] ].forEach(([k,el])=>{
        if(!el) return;
        if(el.dataset.cadenceApplied === 'true'){
          el.style.backgroundColor = '';
          el.style.color = '';
          el.dataset.cadenceApplied = 'false';
        }
      });
    }
  }); // cells.forEach
}

// ================= export (no) =================
// No hay export; solo copiar/pegar el archivo completo en tu proyecto

