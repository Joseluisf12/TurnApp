// =================== app.js ===================
// Versión estable y completa (persistencia por turno + cadencia + reglas)
// ÚNICO cambio añadido: selector de cadencias múltiples y M/N combinado

// Init
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) themeBtn.addEventListener('click', () => document.body.classList.toggle('dark'));
document.querySelectorAll('.cantidad-input').forEach(i => {
  i.addEventListener('input', saveLicenciasState);
});

  const applyBtn = document.getElementById('btn-apply-cadence');
  const clearBtn = document.getElementById('btn-clear-cadence');
  if(applyBtn) applyBtn.addEventListener('click', () => chooseCadence());
  if(clearBtn) clearBtn.addEventListener('click', () => clearCadencePrompt());

  // conectar handles de licencia a la paleta unificada
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
        target.style.backgroundColor = color;
        target.dataset.userColor = 'true';
      });
    });
  });
});

// Estado
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = [];
let manualEdits = {};

// Cargar persistencia
try {
  const raw = localStorage.getItem('turnapp.manualEdits');
  if(raw) manualEdits = JSON.parse(raw);
} catch(e){ manualEdits = {}; }

// Festivos nacionales
const spanishHolidays = [
  { day:1, month:0 }, { day:6, month:0 }, { day:1, month:4 },
  { day:15, month:7 }, { day:12, month:9 }, { day:1, month:10 },
  { day:6, month:11 }, { day:8, month:11 }, { day:25, month:11 }
];

// Paleta
const colorPalette = [
  "#ff4d4d","#ffa64d","#ffd24d","#85e085","#4dd2ff",
  "#4d79ff","#b84dff","#ff4da6","#a6a6a6","#ffffff",
  "rgba(232,240,255,1)",
  "rgba(163,193,255,0.55)",
  "rgba(255,179,179,0.35)"
];

// Utiles
function dateKey(y,m,d){
  const mm = String(m+1).padStart(2,'0');
  const dd = String(d).padStart(2,'0');
  return `${y}-${mm}-${dd}`;
}
function saveManualEdits(){
  try{ localStorage.setItem('turnapp.manualEdits', JSON.stringify(manualEdits)); }catch(e){}
}
function saveLicenciasState() {
  const items = document.querySelectorAll('.licencia-item');
  const data = {};
  items.forEach(item => {
    const tipo = item.dataset.tipo;
    const cantidad = item.querySelector('.cantidad-input')?.value || '0';
    const color = item.querySelector('.cantidad-input')?.style.backgroundColor || '';
    data[tipo] = { cantidad, color };
  });
  try {
    localStorage.setItem('turnapp.licencias', JSON.stringify(data));
  } catch (e) {}
}

function loadLicenciasState() {
  try {
    const raw = localStorage.getItem('turnapp.licencias');
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.entries(data).forEach(([tipo, { cantidad, color }]) => {
      const item = document.querySelector(`.licencia-item[data-tipo="${tipo}"]`);
      if (!item) return;
      const input = item.querySelector('.cantidad-input');
      if (input) {
        input.value = cantidad;
        if (color) {
          input.style.backgroundColor = color;
          input.dataset.userColor = 'true';
        }
      }
    });
  } catch (e) {}
}

function isColorLight(hex){
  if(!hex || hex[0] !== '#') return true;
  const r = parseInt(hex.substr(1,2),16);
  const g = parseInt(hex.substr(3,2),16);
  const b = parseInt(hex.substr(5,2),16);
  const lum = 0.2126*r + 0.7152*g + 0.0722*b;
  return lum > 200;
}
function defaultTextFor(k){ return k; }

// Init / navegación
function initApp(){
  renderCalendar(currentMonth, currentYear);
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
}

// Render calendario
function renderCalendar(month, year){
  const calendar = document.getElementById('calendar');
  if(!calendar) return;
  calendar.innerHTML = '';

  const monthLabel = document.getElementById('monthLabel');
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  if(monthLabel) monthLabel.textContent = `${meses[month]} ${year}`;

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

  if(cadenceData.length > 0) applyCadenceRender(month, year);
}

// Crear elemento turno
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
  if(weekday===6) defaultBg='rgba(163,193,255,0.55)';
  if(weekday===0 || spanishHolidays.some(h=>h.day===day && h.month===month)) defaultBg='rgba(255,179,179,0.35)';
  shift.style.backgroundColor = defaultBg;
  shift.style.color = '#000';

  if(manualEdits[dk] && manualEdits[dk][shiftKey]){
    const obj = manualEdits[dk][shiftKey];
    shift.textContent = (obj.text!==undefined && obj.text!==null)? obj.text: defaultTextFor(shiftKey);
    if(obj.color){
      shift.style.backgroundColor = obj.color;
      shift.dataset.userColor = 'true';
    }
    shift.dataset.edited = (obj.text!==undefined && String(obj.text).trim() !== defaultTextFor(shiftKey))?'true':'false';
  } else {
    shift.textContent = defaultTextFor(shiftKey);
    shift.dataset.edited='false';
  }

  shift.addEventListener('blur', ()=>{
    const text = shift.textContent.trim();
    saveShiftText(year, month, day, shiftKey, text);
    shift.dataset.edited = (text!==defaultTextFor(shiftKey))?'true':'false';
  });

  shift.addEventListener('keypress', (e)=>{
    if(e.key==='Enter'){ e.preventDefault(); shift.blur(); }
  });

  const handle = document.createElement('button');
  handle.type='button';
  handle.className='color-handle';
  handle.title='Elegir color';
  handle.innerText='●';
  handle.style.height='6px';
  handle.style.width='18px';
  handle.style.fontSize='7px';
  handle.style.opacity='0.28';
  handle.style.background='transparent';
  handle.style.border='none';
  handle.style.cursor='pointer';
  handle.style.marginLeft='6px';
  handle.addEventListener('mouseenter',()=>handle.style.opacity='0.6');
  handle.addEventListener('mouseleave',()=>handle.style.opacity='0.28');

  handle.addEventListener('click',(ev)=>{
    ev.stopPropagation();
    openColorPicker(handle,(color)=>{
      shift.style.backgroundColor=color;
      shift.style.color='#000';
      shift.dataset.userColor='true';
      if(!manualEdits[dk]) manualEdits[dk]={M:{},T:{},N:{}};
      manualEdits[dk][shiftKey]=manualEdits[dk][shiftKey]||{};
      manualEdits[dk][shiftKey].color=color;
      manualEdits[dk][shiftKey].userColor=true;
      saveManualEdits();
    }, colorPalette);
  });

  container.appendChild(shift);
  container.appendChild(handle);
  return container;
}

// Guardar texto/color
function saveShiftText(year, month, day, shiftKey, text){
  const dk=dateKey(year,month,day);
  if(!manualEdits[dk]) manualEdits[dk]={M:{},T:{},N:{}};
  manualEdits[dk][shiftKey]=manualEdits[dk][shiftKey]||{};
  manualEdits[dk][shiftKey].text=text;
  saveManualEdits();
}

// Selector de color
function openColorPicker(anchorEl,onSelect,palette=colorPalette){
  const existing = document.getElementById('color-picker-popup');
  if(existing) existing.remove();

  const popup=document.createElement('div');
  popup.id='color-picker-popup';
  popup.style.position='absolute';
  popup.style.display='flex';
  popup.style.flexWrap='wrap';
  popup.style.background='#fff';
  popup.style.border='1px solid #ccc';
  popup.style.padding='6px';
  popup.style.borderRadius='6px';
  popup.style.boxShadow='0 6px 18px rgba(0,0,0,0.12)';
  popup.style.zIndex=10000;

  palette.forEach(color=>{
    const b=document.createElement('button');
    b.type='button';
    b.style.width='22px';
    b.style.height='22px';
    b.style.margin='4px';
    b.style.border='1px solid rgba(0,0,0,0.06)';
    b.style.borderRadius='4px';
    b.style.cursor='pointer';
    b.style.backgroundColor=color;
    b.addEventListener('click',(e)=>{
      e.stopPropagation();
      onSelect(color);
      popup.remove();
    });
    popup.appendChild(b);
  });

  document.body.appendChild(popup);
  const rect=anchorEl.getBoundingClientRect();
  let left=rect.left+window.scrollX;
  let top=rect.bottom+window.scrollY+6;
  const guessW=180;
  if(left+guessW>window.scrollX+window.innerWidth) left=window.scrollX+window.innerWidth-guessW-8;
  popup.style.left=`${left}px`;
  popup.style.top=`${top}px`;

  const closeFn=(ev)=>{
    if(!popup.contains(ev.target)&&ev.target!==anchorEl){
      popup.remove();
      document.removeEventListener('click',closeFn);
    }
  };
  setTimeout(()=>document.addEventListener('click',closeFn),10);
}

// =================== CADENCIAS ===================

function chooseCadence(){
  const choice = prompt("Elige cadencia:\n1: V-1\n2: V-2\n3: Personalizada");
  if(!choice) return;
  if(choice==='1') applyCadencePrompt('V-1');
  else if(choice==='2') applyCadencePrompt('V-2');
  else if(choice==='3') applyCadencePrompt('Personalizada');
  else alert('Opción inválida');
}

function applyCadencePrompt(type='V-1'){
  const startDateStr = prompt("Introduce la fecha inicial de la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;
  const parts=startDateStr.split('/');
  if(parts.length!==3) return alert("Formato incorrecto");
  const day=parseInt(parts[0],10), month=parseInt(parts[1],10)-1, year=parseInt(parts[2],10);
  const startDate=new Date(year,month,day);
  if(isNaN(startDate)) return alert("Fecha inválida");

  cadenceData=[];

  if(type==='V-1'){
    const v1options=[
      ['MT','L','MT','N','L','L','L','L'],
      ['MT','MT','N','L','L','L','L','L'],
      ['T','MT','M/N','L','L','L','L','L'],
      ['MT','N','L','L','L'],
      ['T','M/N','L','L','L']
    ];
    const optionStr="Elige opción V-1:\n1: MT,L,MT,N,L,L,L,L\n2: MT,MT,N,L,L,L,L,L\n3: T,MT,M/N,L,L,L,L,L\n4: MT,N,L,L,L\n5: T,M/N,L,L,L";
    const optChoice=prompt(optionStr);
    const optIdx=parseInt(optChoice,10)-1;
    if(optIdx<0||optIdx>=v1options.length) return alert('Opción inválida');
    const pattern=v1options[optIdx];
    for(let i=0;i<10000;i++){
      const d=new Date(startDate);
      d.setDate(startDate.getDate()+i);
      cadenceData.push({date:d, type: pattern[i%pattern.length]});
    }
  } else if(type==='V-2'){
    const pattern=['MT','MT','L','L','L','L'];
    for(let i=0;i<10000;i++){
      const d=new Date(startDate);
      d.setDate(startDate.getDate()+i);
      cadenceData.push({date:d, type: pattern[i%pattern.length]});
    }
  } else if(type==='Personalizada'){
    const userPattern=prompt('Introduce tu patrón personalizado, separando días por comas (ej: MT,L,MT,N,L,L,L,L):');
    if(!userPattern) return;
    const pattern=userPattern.split(',').map(s=>s.trim());
    for(let i=0;i<10000;i++){
      const d=new Date(startDate);
      d.setDate(startDate.getDate()+i);
      cadenceData.push({date:d, type: pattern[i%pattern.length]});
    }
  }

  renderCalendar(currentMonth, currentYear);
}

function clearCadencePrompt(){
  const startDateStr = prompt("Introduce la fecha desde la que quieres limpiar la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;
  const parts=startDateStr.split('/');
  if(parts.length!==3) return alert("Formato incorrecto");
  const day=parseInt(parts[0],10), month=parseInt(parts[1],10)-1, year=parseInt(parts[2],10);
  const startDate=new Date(year,month,day);
  if(isNaN(startDate)) return alert("Fecha inválida");

  cadenceData = cadenceData.filter(cd => cd.date < startDate);
  renderCalendar(currentMonth, currentYear);
}

function applyCadenceRender(month, year){
  const cells=document.querySelectorAll('.day-cell');
  if(!cells) return;

  const cadColorMT='#ffa94d';
  const cadColorN='#d87d00';

  cells.forEach(cell=>{
    const label=cell.querySelector('.day-label');
    if(!label) return;
    const parts=label.textContent.split(' ');
    const day=parseInt(parts[0],10);
    if(isNaN(day)) return;
    const cellDate=new Date(year, month, day);
    const cd=cadenceData.find(c=>
      c.date.getFullYear()===cellDate.getFullYear() &&
      c.date.getMonth()===cellDate.getMonth() &&
      c.date.getDate()===cellDate.getDate()
    );

    const shiftM=cell.querySelector('.shift-m');
    const shiftT=cell.querySelector('.shift-t');
    const shiftN=cell.querySelector('.shift-n');

    function getFlagsForShift(shiftEl, shiftKey){
      const dk=dateKey(year,month,day);
      const saved=(manualEdits[dk] && manualEdits[dk][shiftKey])?manualEdits[dk][shiftKey]:{};
      const userColor=!!saved.color || shiftEl.dataset.userColor==='true';
      let edited=false;
      if(saved.text!==undefined && saved.text!==null) edited=String(saved.text).trim()!==defaultTextFor(shiftKey);
      else edited=String(shiftEl.textContent||'').trim()!==defaultTextFor(shiftKey);
      if(shiftEl.dataset.edited==='true') edited=true;
      return {userColor, edited, savedText:saved.text, savedColor:saved.color};
    }

    function applyToShift(shiftEl, shiftKey, activeForCadence, cadenceColor){
      if(!shiftEl) return;
      const {userColor, edited}=getFlagsForShift(shiftEl, shiftKey);
      const allowCadence=!(userColor && edited);
      if(activeForCadence){
        if(allowCadence){
          shiftEl.style.backgroundColor=cadenceColor;
          shiftEl.style.color=(shiftKey==='N')?'#fff':'#000';
          shiftEl.dataset.cadenceApplied='true';
        } else shiftEl.dataset.cadenceApplied='false';
      } else {
        if(allowCadence && shiftEl.dataset.cadenceApplied==='true'){
          shiftEl.style.backgroundColor='';
          shiftEl.style.color='#000';
          shiftEl.dataset.cadenceApplied='false';
        }
      }
    }

    if(cd){
      // Manejo múltiple: si hay M/T/N combinados
      const types=cd.type.split('/');
      applyToShift(shiftM,'M', types.includes('M') || types.includes('MT'), cadColorMT);
      applyToShift(shiftT,'T', types.includes('T') || types.includes('MT'), cadColorMT);
      applyToShift(shiftN,'N', types.includes('N') || types.includes('M/N'), cadColorN);
    } else {
      [['M',shiftM],['T',shiftT],['N',shiftN]].forEach(([k,el])=>{
        if(!el) return;
        if(el.dataset.cadenceApplied==='true'){
          el.style.backgroundColor='';
          el.style.color='#000';
          el.dataset.cadenceApplied='false';
        }
      });
    }
  });
}
