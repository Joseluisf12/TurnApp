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
  let savedTurnos = JSON.parse(localStorage.getItem(storageKey) || '{}');

  // --- Botones de control ---
  let html = `
    <h3 style="text-align:center;margin:10px 0;">${meses[mes]} ${año}</h3>
    <div style="text-align:center;margin-bottom:10px;">
      <button id="btn-reset" style="margin:5px;padding:8px 14px;border:none;background:#e74c3c;color:#fff;border-radius:8px;">🔄 Resetear mes</button>
      <button id="btn-export" style="margin:5px;padding:8px 14px;border:none;background:#3498db;color:#fff;border-radius:8px;">📤 Exportar</button>
      <button id="btn-import" style="margin:5px;padding:8px 14px;border:none;background:#2ecc71;color:#fff;border-radius:8px;">📥 Importar</button>
      <input type="file" id="file-input" accept="application/json" style="display:none;">
    </div>
  `;

  html += `<div class="calendar-grid">`;

  const primerDia = new Date(año, mes, 1).getDay();
  const diasMes = new Date(año, mes + 1, 0).getDate();
  const offset = (primerDia === 0 ? 6 : primerDia - 1);

  let diaCounter = 1;
  let semana = 0;

  while (diaCounter <= diasMes) {
    html += `<div class="week-row">`;

    for (let d = 0; d < 7; d++) {
      if (semana === 0 && d < offset) {
        html += `<div class="day empty"></div>`;
      } else if (diaCounter <= diasMes) {
        const diaSemanaIdx = d % 7;
        const turnosDia = savedTurnos[diaCounter] || { M: '', T: '', N: '' };

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
                <input type="text" class="shift night" data-turno="N" placeholder="N" value="${turnosDia.N}" />
              </div>
            </div>
          </div>
        `;
        diaCounter++;
      } else {
        html += `<div class="day empty"></div>`;
      }
    }

    html += `</div>`;
    semana++;
  }

  html += `</div>`;
  content.innerHTML = html;

  // --- Guardar automáticamente ---
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

  // --- Resetear mes ---
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('¿Seguro que quieres borrar todos los turnos del mes actual?')) {
      localStorage.removeItem(storageKey);
      initApp(); // recargar calendario limpio
    }
  });

  // --- Exportar turnos ---
  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(savedTurnos, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `turnos-${mes+1}-${año}.json`;
    link.click();
  });

  // --- Importar turnos ---
  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-import').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data === 'object') {
          localStorage.setItem(storageKey, JSON.stringify(data));
          alert('Turnos importados correctamente.');
          initApp();
        } else {
          alert('Archivo no válido.');
        }
      } catch {
        alert('Error al leer el archivo.');
      }
    };
    reader.readAsText(file);
  });
}
