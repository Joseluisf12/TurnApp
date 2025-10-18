document.addEventListener('DOMContentLoaded', () => {
  initApp();

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
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  const diasSemana = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  let html = `<h3 style="text-align:center;margin:10px 0;">${meses[mes]} ${año}</h3>`;
  html += `<div class="calendar-grid">`;

  const primerDia = new Date(año, mes, 1).getDay(); // 0=domingo
  const diasMes = new Date(año, mes + 1, 0).getDate();
  const offset = (primerDia === 0 ? 6 : primerDia - 1);

  let diaCounter = 1;
  let semana = 0;

  while(diaCounter <= diasMes) {
    html += `<div class="week-row">`;

    for(let d=0; d<7; d++) {
      if(semana===0 && d < offset) {
        html += `<div class="day empty"></div>`;
      } else if(diaCounter <= diasMes){
        const diaSemanaIdx = (d)%7;
        html += `
          <div class="day">
            <div class="day-number">${diaCounter}</div>
            <div class="day-name">${diasSemana[diaSemanaIdx]}</div>
            <div class="shifts">
              <div class="shift-row">
                <input type="text" class="shift" placeholder="M" />
                <input type="text" class="shift" placeholder="T" />
              </div>
              <div class="shift-row">
                <input type="text" class="shift" placeholder="N" />
              </div>
            </div>
          </div>
        `;
        diaCounter++;
      } else {
        html += `<div class="day empty"></div>`;
      }
    }

    html += `</div>`; // fin de la semana
    semana++;
  }

  html += `</div>`; // fin calendar-grid
  content.innerHTML = html;
}
