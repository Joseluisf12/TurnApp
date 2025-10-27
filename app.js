// =================== app.js ===================
// Versión estable y completa (persistencia por turno + cadencia + reglas)
// ÚNICO cambio: corrección en modal para que V-2 y Personalizada funcionen correctamente

// Init
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) themeBtn.addEventListener('click', () => document.body.classList.toggle('dark'));

  const applyBtn = document.getElementById('btn-apply-cadence');
  const clearBtn = document.getElementById('btn-clear-cadence');
  if(applyBtn) applyBtn.addEventListener('click', () => openCadenceModal());
  if(clearBtn) clearBtn.addEventListener('click', () => openClearCadenceModal());

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

// =================== CADENCIAS (modal UI reemplaza prompt) ===================

function openCadenceModal(){
  if(document.getElementById('cadence-modal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'cadence-modal-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(0,0,0,0.28)';
  overlay.style.zIndex = 12000;
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 220ms ease';

  const card = document.createElement('div');
  card.id = 'cadence-modal-card';
  card.style.width = '360px';
  card.style.maxWidth = '92%';
  card.style.background = '#fff';
  card.style.borderRadius = '12px';
  card.style.padding = '16px';
  card.style.boxShadow = '0 12px 40px rgba(0,0,0,0.18)';
  card.style.transform = 'scale(.92)';
  card.style.transition = 'transform 220ms ease, opacity 220ms ease';
  card.style.opacity = '0';
  card.style.fontFamily = 'inherit';
  card.style.color = '#222';

  const h = document.createElement('h3');
  h.textContent = 'Aplicar cadencia';
  h.style.margin = '0 0 8px 0';
  h.style.fontSize = '1.05rem';
  card.appendChild(h);

  const selectWrap = document.createElement('div');
  selectWrap.style.marginBottom = '10px';
  const label = document.createElement('label');
  label.textContent = 'Tipo: ';
  label.style.fontWeight = '600';
  label.style.display = 'block';
  label.style.marginBottom = '6px';
  selectWrap.appendChild(label);

  const radios = document.createElement('div');
  radios.style.display = 'flex';
  radios.style.gap = '8px';
  radios.style.flexWrap = 'wrap';

  const types = [
    {id:'v1', label:'V-1'},
    {id:'v2', label:'V-2'},
    {id:'custom', label:'Personalizada'}
  ];
  types.forEach(t=>{
    const b = document.createElement('button');
    b.type='button';
    b.className='cad-type-btn';
    b.dataset.type = t.id;
    b.textContent = t.label;
    b.style.padding = '8px 10px';
    b.style.borderRadius = '8px';
    b.style.border = '1px solid #e6e6e6';
    b.style.background = '#fff';
    b.style.cursor = 'pointer';
    b.style.fontWeight = '600';
    b.addEventListener('click', ()=> {
      Array.from(radios.children).forEach(ch=>{
        ch.style.boxShadow = 'none';
        ch.removeAttribute('data-selected');
      });
      b.style.boxShadow = 'inset 0 -2px 0 0 var(--primary, #0b5ed7)';
      b.setAttribute('data-selected','true');
      showCadenceSubpanel(t.id);
    });
    radios.appendChild(b);
  });
  selectWrap.appendChild(radios);
  card.appendChild(selectWrap);

  const dateWrap = document.createElement('div');
  dateWrap.style.marginBottom = '10px';
  const dateLabel = document.createElement('label');
  dateLabel.textContent = 'Fecha inicio:';
  dateLabel.style.display = 'block';
  dateLabel.style.marginBottom = '6px';
  dateWrap.appendChild(dateLabel);

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.id = 'cadence-start-date';
  dateInput.style.width = '100%';
  dateInput.style.padding = '8px';
  dateInput.style.borderRadius = '8px';
  dateInput.style.border = '1px solid #ddd';
  dateWrap.appendChild(dateInput);
  card.appendChild(dateWrap);

  const panels = document.createElement('div');
  panels.id = 'cadence-subpanels';
  panels.style.marginBottom = '12px';

  const panelV1 = document.createElement('div');
  panelV1.id = 'panel-v1';
  panelV1.style.display = 'none';
  panelV1.style.marginBottom = '8px';

  const v1Options = [
    { id:0, label: '1 — MT, L, MT, N, L, L, L, L', pattern: ['MT','L','MT','N','L','L','L','L'] },
    { id:1, label: '2 — MT, MT, N, L, L, L, L, L', pattern: ['MT','MT','N','L','L','L','L','L'] },
    { id:2, label: '3 — T, MT, M/N, L, L, L, L, L', pattern: ['T','MT','M/N','L','L','L','L','L'] },
    { id:3, label: '4 — MT, N, L, L, L', pattern: ['MT','N','L','L','L'] },
    { id:4, label: '5 — T, M/N, L, L, L', pattern: ['T','M/N','L','L','L'] }
  ];
  const v1List = document.createElement('div');
  v1List.style.display = 'flex';
  v1List.style.flexDirection = 'column';
  v1List.style.gap = '6px';
  v1Options.forEach(opt=>{
    const r = document.createElement('button');
    r.type = 'button';
    r.className = 'v1-option';
    r.dataset.idx = String(opt.id);
    r.textContent = opt.label;
    r.style.textAlign = 'left';
    r.style.padding = '8px';
    r.style.borderRadius = '8px';
    r.style.border = '1px solid #eee';
    r.style.cursor = 'pointer';
    r.addEventListener('click', () => {
      Array.from(v1List.children).forEach(ch=>ch.style.boxShadow='none');
      r.style.boxShadow = 'inset 0 -2px 0 0 var(--primary,#0b5ed7)';
      r.setAttribute('data-selected','true');
    });
    v1List.appendChild(r);
  });
  panelV1.appendChild(v1List);
  panels.appendChild(panelV1);

  const panelV2 = document.createElement('div');
  panelV2.id = 'panel-v2';
  panelV2.style.display = 'none';
  panelV2.style.marginBottom = '8px';
  const pV2info = document.createElement('div');
  pV2info.textContent = 'V-2 (fija 6 días): MT, MT, L, L, L, L';
  pV2info.style.padding = '8px';
  pV2info.style.border = '1px solid #eee';
  pV2info.style.borderRadius = '8px';
  panelV2.appendChild(pV2info);
  panels.appendChild(panelV2);

  const panelCustom = document.createElement('div');
  panelCustom.id = 'panel-custom';
  panelCustom.style.display = 'none';
  panelCustom.style.marginBottom = '8px';
  const customLabel = document.createElement('label');
  customLabel.textContent = 'Patrón (ej: MT,L,MT,N,L,L,L,L)';
  customLabel.style.display = 'block';
  customLabel.style.marginBottom = '6px';
  panelCustom.appendChild(customLabel);
  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.placeholder = 'MT,L,MT,N,L,L,L,L';
  customInput.style.width = '100%';
  customInput.style.padding = '8px';
  customInput.style.border = '1px solid #ddd';
  customInput.style.borderRadius = '8px';
  panelCustom.appendChild(customInput);
  panels.appendChild(panelCustom);

  card.appendChild(panels);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '8px';

  const cancelBtn = document.createElement('button');
  cancelBtn.type='button';
  cancelBtn.textContent='Cancelar';
  cancelBtn.style.padding='8px 12px';
  cancelBtn.style.border='none';
  cancelBtn.style.background='transparent';
  cancelBtn.style.cursor='pointer';
  cancelBtn.addEventListener('click', closeCadenceModal);

  const applyBtn = document.createElement('button');
  applyBtn.type='button';
  applyBtn.textContent='Aplicar';
  applyBtn.style.padding='8px 12px';
  applyBtn.style.borderRadius='8px';
  applyBtn.style.border='none';
  applyBtn.style.background='var(--primary,#0b5ed7)';
  applyBtn.style.color='#fff';
  applyBtn.style.cursor='pointer';
  applyBtn.addEventListener('click', ()=>{
    // detección robusta de tipo seleccionado
    const selectedTypeBtn = radios.querySelector('[data-selected="true"]');
    if(!selectedTypeBtn){ alert('Selecciona un tipo de cadencia (V-1, V-2 o Personalizada)'); return; }
    const type = selectedTypeBtn.dataset.type; // 'v1' | 'v2' | 'custom'

    const startDateVal = dateInput.value;
    if(!startDateVal){ alert('Selecciona fecha de inicio'); return; }
    const sdParts = startDateVal.split('-');
    const sYear = parseInt(sdParts[0],10), sMonth = parseInt(sdParts[1],10)-1, sDay = parseInt(sdParts[2],10);
    const startDate = new Date(sYear, sMonth, sDay);

    if(type === 'v1'){
      const selectedV1 = v1List.querySelector('[data-selected="true"]');
      if(!selectedV1){ alert('Selecciona una opción V-1'); return; }
      const idx = parseInt(selectedV1.dataset.idx,10);
      const v1options = [
        ['MT','L','MT','N','L','L','L','L'],
        ['MT','MT','N','L','L','L','L','L'],
        ['T','MT','M/N','L','L','L','L','L'],
        ['MT','N','L','L','L'],
        ['T','M/N','L','L','L']
      ];
      const pattern = v1options[idx];
      applyCadenceFromPattern(startDate, pattern);
      closeCadenceModal();
      return;
    } else if(type === 'v2'){
      const pattern = ['MT','MT','L','L','L','L'];
      applyCadenceFromPattern(startDate, pattern);
      closeCadenceModal();
      return;
    } else if(type === 'custom'){
      const raw = customInput.value.trim();
      if(!raw){ alert('Introduce el patrón personalizado'); return; }
      const pattern = raw.split(',').map(s=>s.trim()).filter(Boolean);
      if(pattern.length === 0){ alert('Patrón inválido'); return; }
      applyCadenceFromPattern(startDate, pattern);
      closeCadenceModal();
      return;
    } else {
      alert('Opción inválida');
    }
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(applyBtn);
  card.appendChild(actions);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  requestAnimationFrame(()=> {
    overlay.style.opacity = '1';
    card.style.transform = 'scale(1)';
    card.style.opacity = '1';
  });

  function showCadenceSubpanel(id){
    panelV1.style.display = id==='v1' ? 'block' : 'none';
    panelV2.style.display = id==='v2' ? 'block' : 'none';
    panelCustom.style.display = id==='custom' ? 'block' : 'none';
  }

  // seleccionar por defecto V-1
  const firstBtn = radios.children[0];
  if(firstBtn) firstBtn.click();

  overlay.addEventListener('click', (ev) => {
    if(ev.target === overlay) closeCadenceModal();
  });

  function closeCadenceModal(){
    card.style.transform = 'scale(.92)';
    card.style.opacity = '0';
    overlay.style.opacity = '0';
    setTimeout(()=> {
      if(overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 240);
  }
}

function applyCadenceFromPattern(startDate, pattern){
  cadenceData = [];
  for(let i=0;i<10000;i++){
    const d=new Date(startDate);
    d.setDate(startDate.getDate()+i);
    cadenceData.push({date:d, type: pattern[i % pattern.length]});
  }
  renderCalendar(currentMonth, currentYear);
}

function openClearCadenceModal(){
  if(document.getElementById('clear-cadence-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'clear-cadence-modal';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(0,0,0,0.28)';
  overlay.style.zIndex = 12000;
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 220ms ease';

  const card = document.createElement('div');
  card.style.width = '320px';
  card.style.background = '#fff';
  card.style.borderRadius = '10px';
  card.style.padding = '14px';
  card.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
  card.style.transform = 'scale(.94)';
  card.style.transition = 'transform 180ms ease, opacity 180ms ease';
  card.style.opacity = '0';

  const h = document.createElement('h4');
  h.textContent = 'Limpiar cadencia desde fecha';
  h.style.margin = '0 0 8px 0';
  card.appendChild(h);

  const input = document.createElement('input');
  input.type = 'date';
  input.style.width = '100%';
  input.style.padding = '8px';
  input.style.border = '1px solid #ddd';
  input.style.borderRadius = '8px';
  card.appendChild(input);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.justifyContent = 'flex-end';
  actions.style.gap = '8px';
  actions.style.marginTop = '12px';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancelar';
  cancel.style.background = 'transparent';
  cancel.style.border = 'none';
  cancel.style.cursor = 'pointer';
  cancel.addEventListener('click', closeModal);

  const apply = document.createElement('button');
  apply.type = 'button';
  apply.textContent = 'Limpiar';
  apply.style.background = 'var(--danger,#dc3545)';
  apply.style.color = '#fff';
  apply.style.border = 'none';
  apply.style.borderRadius = '8px';
  apply.style.padding = '8px 10px';
  apply.style.cursor = 'pointer';
  apply.addEventListener('click', ()=>{
    const val = input.value;
    if(!val){ alert('Selecciona fecha'); return; }
    const parts = val.split('-');
    const d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
    cadenceData = cadenceData.filter(cd => cd.date < d);
    renderCalendar(currentMonth, currentYear);
    closeModal();
  });

  actions.appendChild(cancel);
  actions.appendChild(apply);
  card.appendChild(actions);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  requestAnimationFrame(()=> {
    overlay.style.opacity = '1';
    card.style.transform = 'scale(1)';
    card.style.opacity = '1';
  });

  overlay.addEventListener('click', (ev)=>{
    if(ev.target === overlay) closeModal();
  });

  function closeModal(){
    card.style.transform = 'scale(.94)';
    card.style.opacity = '0';
    overlay.style.opacity = '0';
    setTimeout(()=> { if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
  }
}

// applyCadenceRender (sin cambios funcionales)
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
