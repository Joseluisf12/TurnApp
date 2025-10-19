// === TurnApp — Gestión Inteligente de Turnos de Trabajo ===

// Fecha actual mostrada en el calendario
let currentDate = new Date();

/**
 * Genera el calendario del mes indicado
 */
function generateCalendar(date) {
  const calendar = document.getElementById("calendar");
  const monthLabel = document.getElementById("monthLabel");
  if (!calendar || !monthLabel) return;

  const month = date.getMonth();
  const year = date.getFullYear();

  // Mostrar el mes actual en el span
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  monthLabel.textContent = `${meses[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Días de la semana (lunes a domingo)
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  let html = '<div class="calendar-grid">';
  html += '<div class="week-row">';
  weekDays.forEach(d => html += `<div class="day-name-header">${d}</div>`);
  html += '</div>';

  let dayCounter = 1;
  let firstWeekOffset = (firstDay + 6) % 7; // Ajuste: semana empieza en lunes

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
}

/**
 * Cambia al mes anterior
 */
function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  generateCalendar(currentDate);
}

/**
 * Cambia al mes siguiente
 */
function nextMonth() {
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
  // Generar calendario al cargar la app
  generateCalendar(currentDate);

  // Botones de navegación de meses
  const prevBtn = document.getElementById("prevMonth");
  const nextBtn = document.getElementById("nextMonth");
  if (prevBtn) prevBtn.addEventListener("click", prevMonth);
  if (nextBtn) nextBtn.addEventListener("click", nextMonth);

  // Botón de tema
  const themeBtn = document.getElementById("btn-toggle-theme");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
});
