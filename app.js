// === TurnApp — Gestión Inteligente de Turnos de Trabajo ===

let currentDate = new Date();

/**
 * Genera la clave de almacenamiento para el mes actual
 */
function getStorageKey(date) {
  return `turns_${date.getFullYear()}_${date.getMonth()}`;
}

/**
 * Guarda los turnos del calendario actual en localStorage
 */
function saveShifts() {
  const calendar = document.getElementById("calendar");
  if (!calendar) return;

  const shifts = [];
  calendar.querySelectorAll(".day").forEach(day => {
    if (day.classList.contains("empty")) return;
    const morning = day.querySelector(".shift.morning")?.textContent || "";
    const afternoon = day.querySelector(".shift.afternoon")?.textContent || "";
    const night = day.querySelector(".shift.night")?.textContent || "";
    shifts.push({ morning, afternoon, night });
  });

  localStorage.setItem(getStorageKey(currentDate), JSON.stringify(shifts));
}

/**
 * Carga los turnos guardados para el mes actual
 */
function loadShifts() {
  const calendar = document.getElementById("calendar");
  if (!calendar) return;

  const saved = localStorage.getItem(getStorageKey(currentDate));
  if (!saved) return;

  const shifts = JSON.parse(saved);
  let idx = 0;
  calendar.querySelectorAll(".day").forEach(day => {
    if (day.classList.contains("empty")) return;
    if (shifts[idx]) {
      day.querySelector(".shift.morning").textContent = shifts[idx].morning;
      day.querySelector(".shift.afternoon").textContent = shifts[idx].afternoon;
      day.querySelector(".shift.night").textContent = shifts[idx].night;
    }
    idx++;
  });
}

/**
 * Genera el calendario del mes indicado
 */
function generateCalendar(date) {
  const calendar = document.getElementById("calendar");
  const monthLabel = document.getElementById("monthLabel");
  if (!calendar || !monthLabel) return;

  const month = date.getMonth();
  const year = date.getFullYear();

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  monthLabel.textContent = `${meses[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  let html = '<div class="calendar-grid">';
  html += '<div class="week-row">';
  weekDays.forEach(d => html += `<div class="day-name-header">${d}</div>`);
  html += '</div>';

  let dayCounter = 1;
  let firstWeekOffset = (firstDay + 6) % 7;

  while (dayCounter <= daysInMonth) {
    html += '<div class="week-row">';
    for (let i = 0; i < 7; i++) {
      if ((dayCounter === 1 && i < firstWeekOffset) || dayCounter > daysInMonth) {
        html += `<div class="day empty"></div>`;
      } else {
        html += `
          <div class="day">
            <div class="day-number">${dayCounter}</div>
            <div class="shifts">
              <div class="shift-row">
                <div class="shift morning" contenteditable="true">M</div>
                <div class="shift afternoon" contenteditable="true">T</div>
              </div>
              <div class="shift-row">
                <div class="shift night" contenteditable="true">N</div>
              </div>
            </div>
          </div>`;
        dayCounter++;
      }
    }
    html += '</div>';
  }
  html += '</div>';
  calendar.innerHTML = html;

  // Cargar turnos guardados
  loadShifts();

  // Guardar cambios al editar cualquier turno
  calendar.querySelectorAll(".shift").forEach(shiftEl => {
    shiftEl.addEventListener("input", saveShifts);
  });
}

/**
 * Cambia al mes anterior
 */
function prevMonth() {
  saveShifts(); // guardar antes de cambiar
  currentDate.setMonth(currentDate.getMonth() - 1);
  generateCalendar(currentDate);
}

/**
 * Cambia al mes siguiente
 */
function nextMonth() {
  saveShifts(); // guardar antes de cambiar
  currentDate.setMonth(currentDate.getMonth() + 1);
  generateCalendar(currentDate);
}

/**
 * Alterna tema claro/oscuro
 */
function toggleTheme() {
  document.body.classList.toggle("dark");
}

// === Inicialización ===
document.addEventListener("DOMContentLoaded", () => {
  generateCalendar(currentDate);

  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  if (prevBtn) prevBtn.addEventListener("click", prevMonth);
  if (nextBtn) nextBtn.addEventListener("click", nextMonth);

  const themeBtn = document.getElementById("btn-toggle-theme");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
});
