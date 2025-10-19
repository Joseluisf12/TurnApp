const calendarEl = document.getElementById("calendar");
const monthLabel = document.getElementById("monthLabel");
const btnPrev = document.getElementById("prevMonth");
const btnNext = document.getElementById("nextMonth");
const btnApplyCadence = document.getElementById("applyCadence");
const btnClearCadence = document.getElementById("clearCadence");

const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

let currentDate = new Date();

// Estructura para almacenar los turnos y la cadencia
let shiftsData = JSON.parse(localStorage.getItem("turnapp_shifts")) || {};
let cadenceData = JSON.parse(localStorage.getItem("turnapp_cadence")) || null;

function saveShifts() {
  localStorage.setItem("turnapp_shifts", JSON.stringify(shiftsData));
}

function saveCadence() {
  localStorage.setItem("turnapp_cadence", JSON.stringify(cadenceData));
}

function getKey(year, month) {
  return `${year}-${month}`;
}

function parseDate(input){
  const parts = input.split("/");
  if(parts.length!==3) return null;
  const d=parseInt(parts[0],10), m=parseInt(parts[1],10)-1, y=parseInt(parts[2],10);
  return new Date(y,m,d);
}

function createDayCell(date) {
  const dayCell = document.createElement("div");
  dayCell.classList.add("day-cell");

  let dayOfWeek = date.getDay();
  dayOfWeek = (dayOfWeek === 0) ? 6 : dayOfWeek-1;

  if(dayOfWeek === 5) dayCell.classList.add("saturday");
  if(dayOfWeek === 6) dayCell.classList.add("sunday");

  const dateLabel = document.createElement("div");
  dateLabel.classList.add("day-label");
  dateLabel.textContent = `${date.getDate()} ${["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][dayOfWeek]}`;

  const shiftsWrapper = document.createElement("div");
  shiftsWrapper.classList.add("shifts-wrapper");

  const rowMT = document.createElement("div");
  rowMT.classList.add("shifts-row");

  const shiftM = document.createElement("div");
  shiftM.classList.add("shift", "shift-m");
  shiftM.textContent = "M";

  const shiftT = document.createElement("div");
  shiftT.classList.add("shift", "shift-t");
  shiftT.textContent = "T";

  rowMT.appendChild(shiftM);
  rowMT.appendChild(shiftT);
  shiftsWrapper.appendChild(rowMT);

  const shiftN = document.createElement("div");
  shiftN.classList.add("shift", "shift-n");
  shiftN.textContent = "N";

  shiftsWrapper.appendChild(shiftN);
  dayCell.appendChild(dateLabel);
  dayCell.appendChild(shiftsWrapper);

  const key = getKey(date.getFullYear(), date.getMonth());
  const storedDay = shiftsData[key]?.[date.getDate()];
  if(storedDay){
    [shiftM,shiftT,shiftN].forEach((el,i)=>{
      if(storedDay[i]){
        el.style.backgroundColor = storedDay[i];
        el.classList.add("colored");
      }
    });
  }

  // Aplicar cadencia sin tocar turnos no afectados
  if(cadenceData){
    const startDate = new Date(cadenceData.start);
    const pattern = cadenceData.pattern;
    const dayDiff = Math.floor((date-startDate)/(1000*60*60*24));
    if(dayDiff>=0){
      const idx = dayDiff % pattern.length;
      const dayPattern = pattern[idx];

      // Solo colorear los turnos de la cadencia, no modificar texto ni eventos
      if(dayPattern.includes("M")){
        shiftM.style.backgroundColor="#ffa94d";
        shiftM.classList.add("colored");
      }
      if(dayPattern.includes("T")){
        shiftT.style.backgroundColor="#ffa94d";
        shiftT.classList.add("colored");
      }
      if(dayPattern.includes("N")){
        shiftN.style.backgroundColor="#d87d00";
        shiftN.classList.add("colored");
      }
    }
  }

  // Hacer los turnos editables siempre
  [shiftM,shiftT,shiftN].forEach((el,i)=>{
    el.addEventListener("click", ()=>{
      const nuevo = prompt("Editar turno:", el.textContent);
      if(nuevo!==null){
        el.textContent=nuevo;
        saveCurrentDay(date,[shiftM,shiftT,shiftN]);
      }
    });
  });

  return dayCell;
}

function saveCurrentDay(date, shifts){
  const key = getKey(date.getFullYear(),date.getMonth());
  if(!shiftsData[key]) shiftsData[key]={};
  shiftsData[key][date.getDate()] = shifts.map(el=>el.style.backgroundColor||"");
  saveShifts();
}

function renderCalendar(date){
  calendarEl.innerHTML="";
  const year = date.getFullYear();
  const month = date.getMonth();
  monthLabel.textContent = `${meses[month]} ${year}`;

  const firstDay = new Date(year,month,1);
  const lastDay = new Date(year,month+1,0);
  let startDay = firstDay.getDay();
  startDay = (startDay === 0) ? 6 : startDay-1;

  for(let i=0;i<startDay;i++){
    const emptyCell = document.createElement("div");
    calendarEl.appendChild(emptyCell);
  }

  for(let d=1;d<=lastDay.getDate();d++){
    const currentDay = new Date(year,month,d);
    const cell = createDayCell(currentDay);
    calendarEl.appendChild(cell);
  }
}

function applyCadence(){
  let input = prompt("Introduce fecha de inicio de cadencia (DD/MM/AAAA):");
  if(!input) return;
  const startDate = parseDate(input);
  if(!startDate) return alert("Fecha no válida");

  // Cadencia indefinida 8 días
  const basePattern = [["M","T"],[],["M","T"],["N"],[],[],[],[]];

  cadenceData = {start:startDate.toISOString(), pattern: basePattern};
  saveCadence();
  renderCalendar(currentDate);
}

function clearCadence(){
  let input = prompt("Introduce fecha desde la que limpiar cadencia (DD/MM/AAAA):");
  if(!input) return;
  const startDate = parseDate(input);
  if(!startDate) return alert("Fecha no válida");

  // Se elimina cadencia solo si empieza desde o después de la fecha indicada
  if(cadenceData){
    const cadenceStart = new Date(cadenceData.start);
    if(startDate <= cadenceStart){
      cadenceData = null;
      saveCadence();
      renderCalendar(currentDate);
    }
  }
}

btnPrev.addEventListener("click",()=>{currentDate.setMonth(currentDate.getMonth()-1); renderCalendar(currentDate);});
btnNext.addEventListener("click",()=>{currentDate.setMonth(currentDate.getMonth()+1); renderCalendar(currentDate);});
btnApplyCadence.addEventListener("click", applyCadence);
btnClearCadence.addEventListener("click", clearCadence);

document.addEventListener("DOMContentLoaded",()=>{
  renderCalendar(currentDate);
  document.getElementById('btn-toggle-theme').addEventListener('click',()=>{document.body.classList.toggle('dark');});
});
