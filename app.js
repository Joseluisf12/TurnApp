document.addEventListener('DOMContentLoaded', () => {
  initApp();

  // Cambiar tema claro/oscuro
  const btnToggle = document.getElementById('btn-toggle-theme');
  if (btnToggle) {
    btnToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark');
    });
  }
});

function initApp() {
  const content = document.getElementById('content');
  if (!content) return;

  // Obtener mes y año actual
  const fecha = new Date();
  const mes = fecha.getMonth();
  const año = fecha.getFullYear();

  // Nombres de meses y días
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Mostrar encabezado del mes
  let html = `<h3 style="text-align:center;margin:10px 0;">${meses[mes]} ${año}</h3>`;
  html += `<div class="calendar-grid">`;

  // Calcular días del mes
  const primerDia = new Date(año, mes, 1).getDay(); // 0=domingo
  const diasMes = new Date(año, mes + 1, 0).getDate();

  // Ajustar índice (lunes primero)
  const offset = (primerDia === 0 ? 6 : primerDia - 1);

  // Espacios vacíos antes del primer día
  for (let i = 0; i < offset; i++) {
    html += `<div class="day empty"></div>`;
  }

  // Días con turnos
  for (let dia = 1; dia <= diasMes; dia++) {
    html += `
      <div class="day">
        <div class="day-number">${dia}</div>
        <div class="shifts">
          <div class="shift">M</div>
          <div class="shift">T</div>
          <div class="shift">N</div>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  content.innerHTML = html;
}
