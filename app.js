// =================== app.js ===================

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  document.getElementById('btn-toggle-theme').addEventListener('click', ()=>{
    document.body.classList.toggle('dark');
  });

  // Botones cadencia
  const btnApplyCadence = document.getElementById('btn-apply-cadence');
  const btnClearCadence = document.getElementById('btn-clear-cadence');

  if(btnApplyCadence){
    btnApplyCadence.addEventListener('click', ()=>{ applyCadencePrompt(); });
  }
  if(btnClearCadence){
    btnClearCadence.addEventListener('click', ()=>{ clearCadencePrompt(); });
  }
});

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = []; // guarda los días a colorear por cadencia

// Festivos nacionales España (mes 0-11)
const spanishHolidays = [
  { day:1, month:0 },   // 01/01
  { day:6, month:0 },   // 06/01
  { day:1, month:4 },   // 01/05
  { day:15, month:7 },  // 15/08
  { day:12, month:9 },  // 12/10
  { day:1, month:10 },  // 01/11
  { day:6, month:11 },  // 06/12
  { day:8, month:11 },  // 08/12
  { day:25, month:11 }  // 25/12
];

function initApp() {
  renderCalendar(currentMonth, currentYear);
  document.getElementById('prevMonth').addEventListener('click', ()=>{
    currentMonth--;
    if(currentMonth < 0){ currentMonth=11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  });
  document.getElementById('nextMonth').addEventListener('click', ()=>{
    currentMonth++;
    if(currentMonth > 11){ currentMonth=0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
  });
}

// =================== CALENDARIO ===================
function renderCalendar(month, year){
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const monthLabel = document.getElementById("monthLabel");
  const meses = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];
  monthLabel.textContent = `${meses[month]} ${year}`;

  // Primer día del mes
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0)? 6 : firstDay-1; // lunes = 0

  const daysInMonth = new Date(year, month+1, 0).getDate();

  // Añadir días vacíos previos
  for(let i=0;i<firstDay;i++){
    const emptyCell = document.createElement('div');
    calendar.appendChild(emptyCell);
  }

  // Añadir días
  for(let day=1; day<=daysInMonth; day++){
    const cell = document.createElement('div');
    cell.classList.add('day-cell');

    const dateObj = new Date(year, month, day);
    const weekday = dateObj.getDay();
    if(weekday===6) cell.classList.add('saturday'); // sábado
    if(weekday===0) cell.classList.add('sunday');   // domingo

    // Festivos nacionales España: comparar día y mes directamente
    if(spanishHolidays.some(h => h.day===day && h.month===month)){
      cell.classList.add('holiday'); // mismo color que domingo
    }

    const label = document.createElement('div');
    label.classList.add('day-label');
    const weekdayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    label.textContent = `${day} ${weekdayNames[weekday===0?6:weekday-1]}`;
    cell.appendChild(label);

    // Shifts
    const wrapper = document.createElement('div');
    wrapper.classList.add('shifts-wrapper');

    const row = document.createElement('div');
    row.classList.add('shifts-row');

    const shiftM = document.createElement('div');
    shiftM.classList.add('shift-m');
    shiftM.textContent = 'M';
    shiftM.addEventListener('click', ()=>{ editShiftColor(shiftM); });

    const shiftT = document.createElement('div');
    shiftT.classList.add('shift-t');
    shiftT.textContent = 'T';
    shiftT.addEventListener('click', ()=>{ editShiftColor(shiftT); });

    row.appendChild(shiftM);
    row.appendChild(shiftT);
    wrapper.appendChild(row);

    const shiftN = document.createElement('div');
    shiftN.classList.add('shift-n');
    shiftN.textContent = 'N';
    shiftN.addEventListener('click', ()=>{ editShiftColor(shiftN); });

    wrapper.appendChild(shiftN);

    cell.appendChild(wrapper);
    calendar.appendChild(cell);
  }

  // Aplicar cadencia si existe
  if(cadenceData.length>0){
    applyCadenceRender(month, year);
  }
}

// =================== EDIT SHIFT COLOR ===================
function editShiftColor(shift){
  shift.classList.toggle('colored');
}

// =================== FUNCIONES CADENCIA ===================
function applyCadencePrompt(){
  const startDateStr = prompt("Introduce la fecha inicial de la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;

  const parts = startDateStr.split('/');
  if(parts.length!==3) return alert("Formato incorrecto");
  const day=parseInt(parts[0]), month=parseInt(parts[1])-1, year=parseInt(parts[2]);
  const startDate = new Date(year, month, day);

  // Cadencia ejemplo: 8 días
  cadenceData = [];
  for(let i=0;i<1000;i++){ // aplica hasta infinito
    const d = new Date(startDate);
    d.setDate(startDate.getDate()+i);
    const type = [ 'MT','libre','MT','N','libre','libre','libre','libre'][i%8];
    cadenceData.push({date:d, type:type});
  }
  renderCalendar(currentMonth, currentYear);
}

function clearCadencePrompt(){
  const startDateStr = prompt("Introduce la fecha desde la que quieres limpiar la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;

  const parts = startDateStr.split('/');
  if(parts.length!==3) return alert("Formato incorrecto");
  const day=parseInt(parts[0]), month=parseInt(parts[1])-1, year=parseInt(parts[2]);
  const startDate = new Date(year, month, day);

  // Limpiar desde esa fecha en adelante
  cadenceData = cadenceData.filter(cd=>cd.date<startDate);
  renderCalendar(currentMonth, currentYear);
}

function applyCadenceRender(month, year){
  const calendar = document.getElementById('calendar');
  const cells = calendar.getElementsByClassName('day-cell');

  Array.from(cells).forEach(cell=>{
    const label = cell.querySelector('.day-label');
    if(!label) return;
    const parts = label.textContent.split(' ');
    const day = parseInt(parts[0]);
    const weekdayName = parts[1];

    const cellDate = new Date(year, month, day);
    const cd = cadenceData.find(c=> c.date.getFullYear()===cellDate.getFullYear() &&
                                     c.date.getMonth()===cellDate.getMonth() &&
                                     c.date.getDate()===cellDate.getDate());
    if(cd){
      const shiftM = cell.querySelector('.shift-m');
      const shiftT = cell.querySelector('.shift-t');
      const shiftN = cell.querySelector('.shift-n');

      if(cd.type==='MT'){ shiftM.classList.add('colored'); shiftT.classList.add('colored'); shiftN.classList.remove('colored'); }
      if(cd.type==='N'){ shiftN.classList.add('colored'); shiftM.classList.remove('colored'); shiftT.classList.remove('colored'); }
      if(cd.type==='libre'){ shiftM.classList.remove('colored'); shiftT.classList.remove('colored'); shiftN.classList.remove('colored'); }
    }
  });
}
