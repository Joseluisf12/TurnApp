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

  const storageKey = `turnos-${mes+1}-${año}`;
  const savedTurnos = JSON.parse(localStorage.getItem(storageKey) || '{}');

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

        // Valores guardados
        const turnosDia = savedTurnos[diaCounter] || {M:'',T:'',N:''};

        html += `
          <div class="day" data-dia="${diaCounter}">
            <div class="day-number">${diaCounter}</div>
            <div class="day-name">${diasSemana[diaSemanaIdx]}</div>
            <div class="shifts">
              <div class="shift-row">
                <input type="text" class="shift" data-turno="M" placeholder="M" value="${turnosDia.M}" />
                <input type="text" class="shift" data-turno="T" placeholder="T" value="${turnosDia.T}" />
              </div>
              <div class="shift-row">
                <input type="text" class="shift" data-turno="N" placeholder="N" value="${turnosDia.N}" />
              </div>
            </div>
          </div>
        `;
        diaCounter++;
      } else {
        html += `<div class="day empty"></div>`;
      }
    }

    html += `</div>`; // fin semana
    semana++;
  }

  html += `</div>`; // fin calendar-grid
  content.innerHTML = html;

  // Guardar cambios automáticamente
  const inputs = content.querySelectorAll('.shift');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const dayEl = input.closest('.day');
      const diaNum = dayEl.dataset.dia;
      const turno = input.dataset.turno;

      savedTurnos[diaNum] = savedTurnos[diaNum] || {};
      savedTurnos[diaNum][turno] = input.value;

      localStorage.setItem(storageKey, JSON.stringify(savedTurnos));
    });
  });
}
