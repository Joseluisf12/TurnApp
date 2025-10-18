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

  const fecha = new Date();
  const mes = fecha.getMonth();
  const año = fecha.getFullYear();

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const diasSemana = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  let html = `<h3 style="text-align:center;margin:10px 0;">${meses[mes]} ${año}</h3>`;
  html += `<div class="calendar-grid">`;

  const primerDia = new Date(año, mes, 1).getDay(); // 0=domingo
  const diasMes = new Date(año, mes + 1, 0).getDate();
  const offset = (primerDia === 0 ? 6 : primerDia - 1);

  // Casillas vacías antes del primer día
  for (let i = 0; i < offset; i++) {
    html += `<div class="day empty"></div>`;
  }

  // Crear días con número, nombre y turnos
  for (let dia = 1; dia <= diasMes; dia++) {
    const diaSemanaIdx = (offset + dia - 1) % 7;
    html += `
      <div class="day">
        <div class="day-header">
          <div class="day-number">${dia}</div>
          <div class="day-name">${diasSemana[diaSemanaIdx]}</div>
        </div>
        <div class="shifts">
          <input type="text" class="shift" maxlength="10" placeholder="M" />
          <input type="text" class="shift" maxlength="10" placeholder="T" />
          <input type="text" class="shift" maxlength="10" placeholder="N" />
        </div>
      </div>
    `;
  }

  html += `</div>`;
  content.innerHTML = html;
}
