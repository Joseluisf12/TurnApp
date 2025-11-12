// =================== app.js (Versión Corregida y Completa) ===================
// Versión 1.3.2
// Restaura la lógica de la pantalla de inicio (splash screen) y la función applyCadenceRender.
// Proporciona el código completo para evitar interrupciones.

// ------------------- INICIALIZACIÓN GLOBAL -------------------
document.addEventListener('DOMContentLoaded', () => {
  // Configuración inicial de la aplicación (renderizado, etc.)
  initApp();

  // ----- Event Listeners Principales -----
  document.getElementById('btn-toggle-theme')?.addEventListener('click', () => document.body.classList.toggle('dark'));
  document.getElementById('btn-apply-cadence')?.addEventListener('click', () => openCadenceModal());
  document.getElementById('btn-clear-cadence')?.addEventListener('click', () => clearCadencePrompt());
  
  // ----- Inicializadores de Módulos -----
  initLicenciasToggle();
  initPeticionesToggle();
  initTablaCoordinador();
  initPeticiones();
  
  // ----- Carga de Datos y Estado Inicial -----
  restoreManualEdits();
  restoreCadenceSpec();
  initSplashScreen(); // <-- Controla el inicio visual de la aplicación
});


// ------------------- ESTADO DE LA APLICACIÓN -------------------
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = []; // Almacena los datos de la cadencia calculada
let cadenceSpec = null; // Especificación de la cadencia para guardarla
let manualEdits = {}; // Almacena ediciones manuales

const spanishHolidays = [
  { day: 1, month: 0 }, { day: 6, month: 0 }, { day: 1, month: 4 },
  { day: 15, month: 7 }, { day: 12, month: 9 }, { day: 1, month: 10 },
  { day: 6, month: 11 }, { day: 8, month: 11 }, { day: 25, month: 11 }
];

const colorPalette = [
  "#4d9ef7", "#f7a64d", "#6fd773", "#e65252", "#c9c9c9",
  "#ff4d4d", "#ffa64d", "#ffd24d", "#85e085", "#4dd2ff",
  "#4d79ff", "#b84dff", "#ff4da6", "#a6a6a6", "#ffffff",
  "rgba(232,240,255,1)", "rgba(163,193,255,0.65)", "rgba(255,179,179,0.45)"
];


// ------------------- UTILIDADES -------------------
const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const defaultTextFor = (shiftKey) => shiftKey;

function isColorLight(hex) {
  if (!hex) return true;
  let r, g, b;
  if (hex.startsWith('rgb')) {
    [r, g, b] = hex.replace(/[^\d,]/g, '').split(',').map(Number);
  } else if (hex.startsWith('#')) {
    if (hex.length === 4) hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    const bigint = parseInt(hex.slice(1), 16);
    r = (bigint >> 16) & 255;
    g = (bigint >> 8) & 255;
    b = bigint & 255;
  } else {
    return true;
  }
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 160;
}


// ------------------- PERSISTENCIA (LocalStorage) -------------------
function restoreManualEdits() {
  try {
    const rawEdits = localStorage.getItem('turnapp.manualEdits');
    if (rawEdits) manualEdits = JSON.parse(rawEdits);
  } catch (e) { console.error("Error al restaurar ediciones manuales:", e); manualEdits = {}; }

  document.querySelectorAll('.licencia-item').forEach(item => {
    const tipo = item.dataset.tipo;
    if (!tipo) return;
    try {
      const saved = JSON.parse(localStorage.getItem('turnapp.licencia.' + tipo));
      if (saved) {
        const input = item.querySelector('.cantidad-input');
        const colorBtn = item.querySelector('.licencia-color');
        if (input) input.value = saved.value || 0;
        if (colorBtn) colorBtn.style.backgroundColor = saved.color || '';
      }
    } catch (e) { console.error(`Error al restaurar licencia ${tipo}:`, e); }
  });
  recalcLicenciasTotal();
}

function saveManualEdits() {
  try {
    localStorage.setItem('turnapp.manualEdits', JSON.stringify(manualEdits));
  } catch (e) { console.error("Error al guardar ediciones manuales:", e); }
}

function saveLicenciaValue(tipo, value, color) {
  try {
    localStorage.setItem(`turnapp.licencia.${tipo}`, JSON.stringify({ value, color }));
  } catch (e) { console.error(`Error al guardar licencia ${tipo}:`, e); }
}

function saveCadenceSpec(spec) {
  try {
    localStorage.setItem('turnapp.cadenceSpec', JSON.stringify(spec));
  } catch (e) { console.error("Error al guardar la cadencia:", e); }
}

function restoreCadenceSpec() {
  try {
    const raw = localStorage.getItem('turnapp.cadenceSpec');
    if (raw) {
      cadenceSpec = JSON.parse(raw);
      if (cadenceSpec && cadenceSpec.startISO && cadenceSpec.pattern) {
        buildCadenceDataFromSpec();
      }
    }
  } catch (e) { console.error("Error al restaurar la cadencia:", e); cadenceSpec = null; }
}


// ------------------- LÓGICA DEL CALENDARIO -------------------
function initApp() {
  renderCalendar(currentMonth, currentYear);

  document.getElementById('prevMonth')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  });

  document.getElementById('nextMonth')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
  });

  document.querySelectorAll('.cantidad-input').forEach(input => {
    input.addEventListener('input', () => {
      const item = input.closest('.licencia-item');
      const tipo = item?.dataset.tipo;
      if (!tipo) return;
      const color = item.querySelector('.licencia-color')?.style.backgroundColor || '';
      saveLicenciaValue(tipo, input.value, color);
      recalcLicenciasTotal();
    });
  });

  bindLicenciaColorHandles();
  recalcLicenciasTotal();
}

function renderCalendar(month, year) {
  const calendar = document.getElementById('calendar');
  if (!calendar) return;
  calendar.innerHTML = '';

  const monthLabel = document.getElementById('monthLabel');
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  if (monthLabel) monthLabel.textContent = `${meses[month]} ${year}`;

  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0) ? 6 : firstDay - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement('div')).className = 'day-cell empty';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    const dateObj = new Date(year, month, day);
    const weekday = dateObj.getDay();

    if (weekday === 6) cell.classList.add('saturday');
    if (weekday === 0) cell.classList.add('sunday');
    if (spanishHolidays.some(h => h.day === day && h.month === month)) {
      cell.classList.add('holiday');
    }

    const label = document.createElement('div');
    label.className = 'day-label';
    label.textContent = day;
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

  applyCadenceRender(month, year);
}

function createShiftElement(year, month, day, shiftKey) {
    const container = document.createElement('div');
    container.className = `shift-container ${shiftKey === 'N' ? 'night' : ''}`;

    const shift = document.createElement('div');
    shift.className = `shift-${shiftKey.toLowerCase()} shift-cell`;
    shift.contentEditable = false; // El texto no es editable por defecto
    shift.spellcheck = false;

    const dk = dateKey(year, month, day);
    const savedShift = manualEdits[dk]?.[shiftKey] || {};

    shift.textContent = savedShift.text ?? defaultTextFor(shiftKey);

    if (savedShift.color) {
        shift.style.backgroundColor = savedShift.color;
        shift.style.color = isColorLight(savedShift.color) ? '#000' : '#fff';
        shift.dataset.userColor = 'true';
    }

    // --- LÓGICA DE PULSACIÓN (VERSIÓN ROBUSTA PARA MÓVIL Y ESCRITORIO) ---

    let pressTimer = null;
    let isLongPress = false;

    const startPress = (e) => {
        // Previene comportamientos por defecto en móvil (selección de texto, etc.)
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
        isLongPress = false;
        pressTimer = window.setTimeout(() => {
            isLongPress = true;
            // PULSACIÓN LARGA: Activar edición de texto
            shift.contentEditable = true;
            shift.focus();
            try {
                const range = document.createRange();
                range.selectNodeContents(shift);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (err) { /* Ignorar error en navegadores antiguos */ }
        }, 500); // 500ms de espera
    };

    const endPress = (e) => {
        clearTimeout(pressTimer);
        
        // Si el temporizador no se completó, fue una pulsación corta
        if (!isLongPress) {
            e.stopPropagation();
            // PULSACIÓN CORTA: Abrir paleta de colores
            openColorPicker(shift, (color) => {
                shift.style.backgroundColor = color;
                shift.style.color = isColorLight(color) ? '#000' : '#fff';
                shift.dataset.userColor = 'true';
                
                if (!manualEdits[dk]) manualEdits[dk] = {};
                if (!manualEdits[dk][shiftKey]) manualEdits[dk][shiftKey] = {};
                manualEdits[dk][shiftKey].color = color;
                saveManualEdits();
            }, colorPalette);
        }
    };
    
    // --- Asignación de Eventos ---
    // Eventos de inicio de pulsación
    shift.addEventListener('mousedown', startPress);
    shift.addEventListener('touchstart', startPress);
    
    // Eventos de fin de pulsación
    shift.addEventListener('mouseup', endPress);
    shift.addEventListener('touchend', endPress);

    // Cancelar si el dedo o ratón se mueve fuera del elemento
    shift.addEventListener('mouseleave', () => clearTimeout(pressTimer));
    shift.addEventListener('touchcancel', () => clearTimeout(pressTimer));

    // Evento para guardar texto tras la edición
    shift.addEventListener('blur', () => {
        shift.contentEditable = false; // Siempre desactivar edición al perder el foco
        const newText = shift.textContent.trim();
        if (!manualEdits[dk]) manualEdits[dk] = {};
        if (!manualEdits[dk][shiftKey]) manualEdits[dk][shiftKey] = {};
        manualEdits[dk][shiftKey].text = newText;
        saveManualEdits();
        shift.dataset.edited = (newText !== defaultTextFor(shiftKey)).toString();
    });

    // Evento para que 'Enter' finalice la edición
    shift.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            shift.blur();
        }
    });

    container.appendChild(shift);
    return container;
}

// ------------------- PALETA DE COLORES -------------------
function openColorPicker(anchorEl, onSelect, palette) {
  document.getElementById('color-picker-popup')?.remove();

  const popup = document.createElement('div');
  popup.id = 'color-picker-popup';
  popup.className = 'color-picker-popup';

  palette.forEach(color => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-picker-btn';
    btn.style.backgroundColor = color;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(color);
      popup.remove();
    });
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);

  const rect = anchorEl.getBoundingClientRect();
  popup.style.left = `${Math.min(rect.left, window.innerWidth - 180)}px`;
  popup.style.top = `${rect.bottom + window.scrollY + 5}px`;

  const closeFn = (ev) => {
    if (!popup.contains(ev.target) && ev.target !== anchorEl) {
      popup.remove();
      document.removeEventListener('click', closeFn, { capture: true });
    }
  };
  setTimeout(() => document.addEventListener('click', closeFn, { capture: true }), 10);
}


// ------------------- GESTIÓN DE LICENCIAS -------------------
function initLicenciasToggle() {
  const btn = document.getElementById('btn-carga-dias');
  const licencias = document.getElementById('licencias-container');
  const calendar = document.getElementById('calendar-panel');

  if (!btn || !licencias || !calendar) return;

  btn.addEventListener('click', () => {
    const isHidden = licencias.classList.contains('oculto');
    licencias.classList.toggle('oculto');
    licencias.setAttribute('aria-hidden', String(!isHidden));

    const target = isHidden ? licencias : calendar;
    setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  });
}

function bindLicenciaColorHandles() {
  document.querySelectorAll('.licencia-color-handle').forEach(handle => {
    handle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const item = handle.closest('.licencia-item');
      if (!item) return;
      openColorPicker(handle, (color) => {
        handle.style.backgroundColor = color;
        const tipo = item.dataset.tipo;
        const value = item.querySelector('.cantidad-input')?.value || 0;
        saveLicenciaValue(tipo, value, color);
      }, colorPalette);
    });
  });
}

function recalcLicenciasTotal() {
  const totalField = document.getElementById('total-licencias');
  if (!totalField) return;
  let total = 0;
  document.querySelectorAll('.licencia-item .cantidad-input').forEach(input => {
    total += Number(input.value) || 0;
  });
  totalField.value = total;
}

// ------------------- LÓGICA DE CADENCIAS -------------------

function openCadenceModal() {
  const overlay = document.getElementById('cadence-modal-overlay');
  if (!overlay) return;

  // Resetear estado visual del modal
  document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
  ['v1-options', 'v2-options', 'custom-section'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
  });
  const customPatternInput = document.getElementById('custom-pattern');
  const startDateInput = document.getElementById('cadence-start');
  if(customPatternInput) customPatternInput.value = '';
  
  // Rellenar con datos existentes si hay una cadencia guardada
  if (cadenceSpec) {
    if(startDateInput) startDateInput.value = new Date(cadenceSpec.startISO).toLocaleDateString('es-ES');
    
    const btn = document.querySelector(`.modal-type-btn[data-type="${cadenceSpec.type}"]`);
    if(btn) btn.click(); // Simula click para mostrar la sección correcta

    if (cadenceSpec.type === 'V-1' && typeof cadenceSpec.v1Index !== 'undefined') {
      const radio = document.querySelector(`input[name="v1opt"][value="${cadenceSpec.v1Index}"]`);
      if (radio) radio.checked = true;
    } else if (cadenceSpec.type === 'Personalizada' && customPatternInput) {
      customPatternInput.value = cadenceSpec.pattern.join(', ');
    }
  } else {
    if(startDateInput) startDateInput.value = '';
  }

  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');

  // Asignar listeners solo una vez para evitar duplicados
  if (!overlay.dataset.listenersAttached) {
    document.querySelectorAll('.modal-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.type;
        document.getElementById('v1-options').style.display = type === 'V-1' ? 'block' : 'none';
        document.getElementById('v2-options').style.display = type === 'V-2' ? 'block' : 'none';
        document.getElementById('custom-section').style.display = type === 'Personalizada' ? 'block' : 'none';
      });
    });

    document.getElementById('close-cadence')?.addEventListener('click', () => {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    });

    document.getElementById('apply-cadence-confirm')?.addEventListener('click', applyCadenceConfirm);
    
    overlay.dataset.listenersAttached = 'true';
  }
}

function applyCadenceConfirm() {
    const activeBtn = document.querySelector('.modal-type-btn.active');
    const startStr = document.getElementById('cadence-start')?.value;

    if (!activeBtn) return alert('Seleccione un tipo de cadencia.');
    if (!startStr) return alert('Introduce la fecha de inicio (DD/MM/AAAA).');
    
    const parts = startStr.split('/');
    if (parts.length !== 3) return alert('Formato de fecha incorrecto.');
    const [d, m, y] = parts.map(Number);
    const start = new Date(y, m - 1, d);
    if (isNaN(start.getTime())) return alert('Fecha inválida.');

    const type = activeBtn.dataset.type;
    let pattern = [];
    let v1Index;

    if (type === 'V-1') {
        const radio = document.querySelector('input[name="v1opt"]:checked');
        if (!radio) return alert('Selecciona una opción de V-1.');
        v1Index = parseInt(radio.value, 10);
        const v1options = [
            ['M/T', 'L', 'M/T', 'N', 'L', 'L', 'L', 'L'], ['M/T', 'M/T', 'N', 'L', 'L', 'L', 'L', 'L'],
            ['T', 'M/T', 'M/N', 'L', 'L', 'L', 'L', 'L'], ['M/T', 'N', 'L', 'L', 'L'], ['T', 'M/N', 'L', 'L', 'L']
        ];
        pattern = v1options[v1Index];
    } else if (type === 'V-2') {
        pattern = ['M/T', 'M/T', 'L', 'L', 'L', 'L'];
    } else if (type === 'Personalizada') {
        const raw = document.getElementById('custom-pattern')?.value;
        if (!raw) return alert('Introduce un patrón personalizado.');
        pattern = raw.split(',').map(s => s.trim()).filter(Boolean);
        if (pattern.length === 0) return alert('Patrón inválido.');
    }

    cadenceSpec = { type, startISO: start.toISOString(), pattern, ...(v1Index !== undefined && { v1Index }) };
    saveCadenceSpec(cadenceSpec);
    buildCadenceDataFromSpec();
    renderCalendar(currentMonth, currentYear);

    const overlay = document.getElementById('cadence-modal-overlay');
    if(overlay) {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }
}

function buildCadenceDataFromSpec() {
  if (!cadenceSpec) {
    cadenceData = [];
    return;
  }
  cadenceData = [];
  const start = new Date(cadenceSpec.startISO);
  const pattern = cadenceSpec.pattern;
  // Generar para un rango amplio (ej. 10 años) para no tener que recalcular
  for (let i = 0; i < 365 * 10; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cadenceData.push({ date: d, type: pattern[i % pattern.length] });
  }
}

function applyCadenceRender(month, year) {
    if (cadenceData.length === 0) return;

    document.querySelectorAll('.day-cell:not(.empty)').forEach(cell => {
        const day = parseInt(cell.querySelector('.day-label').textContent, 10);
        if (isNaN(day)) return;

        const cellDate = new Date(year, month, day);
        const cd = cadenceData.find(c => c.date.getTime() === cellDate.getTime());

        const shifts = {
            M: cell.querySelector('.shift-m'),
            T: cell.querySelector('.shift-t'),
            N: cell.querySelector('.shift-n')
        };
        
        const resetShift = (shiftEl) => {
            if (shiftEl && shiftEl.dataset.cadenceApplied === 'true' && shiftEl.dataset.userColor !== 'true') {
                shiftEl.style.backgroundColor = '';
                shiftEl.style.color = '';
                delete shiftEl.dataset.cadenceApplied;
            }
        };

        if (cd) {
            const types = cd.type.split('/').map(t => t.trim());
            
            const cadColorMT = '#ffa94d';
            const cadColorN = '#d87d00';

            const applyStyle = (shiftEl, shiftKey, color, condition) => {
                if (shiftEl && condition && shiftEl.dataset.userColor !== 'true') {
                    shiftEl.style.backgroundColor = color;
                    shiftEl.style.color = isColorLight(color) ? '#000' : '#fff';
                    shiftEl.dataset.cadenceApplied = 'true';
                }
            };
            
            // Primero reseteamos por si la cadencia ha cambiado
            Object.values(shifts).forEach(resetShift);

            // Aplicamos nuevos estilos
            applyStyle(shifts.M, 'M', cadColorMT, types.includes('M') || types.includes('MT'));
            applyStyle(shifts.T, 'T', cadColorMT, types.includes('T') || types.includes('MT'));
            applyStyle(shifts.N, 'N', cadColorN, types.includes('N') || types.includes('M/N'));

        } else {
            // Si no hay cadencia para este día, reseteamos todos los turnos
            Object.values(shifts).forEach(resetShift);
        }
    });
}


function clearCadencePrompt() {
  const dateStr = prompt("Introduce la fecha DESDE la que quieres limpiar la cadencia (DD/MM/AAAA). La cadencia anterior a esa fecha se mantendrá.");
  if (!dateStr) return;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return alert('Formato de fecha incorrecto.');
  
  const [d, m, y] = parts.map(Number);
  const startDate = new Date(y, m - 1, d);
  if (isNaN(startDate.getTime())) return alert('Fecha inválida.');

  cadenceData = cadenceData.filter(cd => cd.date < startDate);

  if (cadenceSpec && new Date(cadenceSpec.startISO) >= startDate) {
    cadenceSpec = null;
    localStorage.removeItem('turnapp.cadenceSpec');
  }
  
  renderCalendar(currentMonth, currentYear);
}


// ------------------- GESTIÓN DE PETICIONES -------------------

function initPeticionesToggle() {
    const btn = document.getElementById('btn-peticiones');
    const peticionesSection = document.getElementById('peticiones-section');
    
    if (!btn || !peticionesSection) return;

    btn.addEventListener('click', () => {
        const isHidden = peticionesSection.classList.contains('oculto');
        peticionesSection.classList.toggle('oculto');
        
        if (isHidden) { // Si estaba oculto y lo vamos a mostrar
            peticionesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

function initPeticiones() {
  const listaPeticiones = document.getElementById('lista-peticiones-usuario');
  const textoPeticion = document.getElementById('peticion-texto');
  const enviarBtn = document.getElementById('enviar-peticion');
  const borrarTodoBtn = document.getElementById('btn-borrar-peticiones');

  if (!listaPeticiones || !textoPeticion || !enviarBtn) return;

  const PETICIONES_KEY = 'turnapp.peticiones';
  let peticiones = JSON.parse(localStorage.getItem(PETICIONES_KEY) || '[]');

  const guardar = () => localStorage.setItem(PETICIONES_KEY, JSON.stringify(peticiones));

  const render = () => {
    listaPeticiones.innerHTML = '';
    peticiones.forEach((p, index) => {
      const li = document.createElement('li');
      li.className = `peticion-item ${p.revisada ? 'revisada' : ''}`;
      
      const fecha = new Date(p.fechaHora).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      li.innerHTML = `
        <div class="peticion-contenido">
          <span>${p.texto}</span>
          <span class="fecha-hora">${fecha}</span>
        </div>
        <div class="peticion-acciones">
          <input type="checkbox" title="Marcar como revisada" ${p.revisada ? 'checked' : ''}>
          <button title="Eliminar petición" class="btn-eliminar">❌</button>
        </div>
      `;

      li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        peticiones[index].revisada = e.target.checked;
        guardar();
        li.classList.toggle('revisada', e.target.checked);
      });

      li.querySelector('.btn-eliminar').addEventListener('click', () => {
        peticiones.splice(index, 1);
        guardar();
        render(); // Re-renderizar la lista
      });

      listaPeticiones.appendChild(li);
    });
  };

  enviarBtn.addEventListener('click', () => {
    const texto = textoPeticion.value.trim();
    if (!texto) {
      alert('Por favor, escribe una petición.');
      return;
    }
    peticiones.unshift({ texto, revisada: false, fechaHora: new Date().toISOString() });
    guardar();
    render();
    textoPeticion.value = '';
  });

  borrarTodoBtn?.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que quieres borrar TODAS las peticiones? Esta acción no se puede deshacer.')) {
          peticiones = [];
          guardar();
          render();
      }
  });

  render();
}


// ------------------- TABLA DEL COORDINADOR -------------------

function initTablaCoordinador() {
  const tabla = document.getElementById("tabla-coordinador");
  const tbody = tabla?.querySelector("tbody");
  const limpiarBtn = document.getElementById("limpiar-tabla");
  
  if (!tabla || !tbody) return;

  // --- Generación dinámica de filas (NUEVO) ---
  const NUM_FILAS = 18;
  const filaHTML = `
    <tr>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
    </tr>`;
  tbody.innerHTML = filaHTML.repeat(NUM_FILAS);
  // --- Fin de la generación de filas ---

  const TABLA_KEY = "tablaCoordinador";
  const celdas = tabla.querySelectorAll("td[contenteditable='true'], th[contenteditable='true']");

  // Cargar datos guardados
  try {
      const data = JSON.parse(localStorage.getItem(TABLA_KEY) || "[]");
      celdas.forEach((celda, i) => {
          if (data[i] !== undefined) celda.innerText = data[i];
      });
  } catch(e) { console.error("Error al cargar datos de la tabla:", e); }

  // Guardar datos en cada cambio
  tabla.addEventListener("input", (e) => {
      if (e.target.isContentEditable) {
          const data = Array.from(celdas).map(c => c.innerText);
          localStorage.setItem(TABLA_KEY, JSON.stringify(data));
      }
  });

  // Funcionalidad del botón de limpiar
  limpiarBtn?.addEventListener("click", () => {
    if (confirm("¿Seguro que quieres limpiar toda la tabla?")) {
      celdas.forEach(celda => {
        // No limpiar cabeceras fijas como Nº y NOMBRE
        if (celda.tagName === 'TD' || celda.classList.contains('titulo-ciclo') || celda.innerText === 'COCINA') {
            celda.innerText = "";
        }
      });
      localStorage.removeItem(TABLA_KEY);
    }
  });

  // Resaltar fila seleccionada al hacer clic
  tabla.addEventListener("click", (e) => {
    const fila = e.target.closest("tr");
    if (fila && fila.parentElement.tagName === "TBODY") {
      tabla.querySelectorAll("tbody tr.seleccionada").forEach(tr => tr.classList.remove("seleccionada"));
      fila.classList.add("seleccionada");
    }
  });
}

// ------------------- SPLASH SCREEN Y NAVEGACIÓN INICIAL -------------------

function initSplashScreen() {
    const splash = document.getElementById("splash");
    const app = document.getElementById("app");
    const logo = document.getElementById("splash-logo");
    const cadenceModal = document.getElementById('cadence-modal-overlay');

    if (!splash || !app || !logo) {
        console.error("Faltan elementos esenciales para el inicio (splash, app, o logo).");
        return;
    }

    // 1. Forzar el estado visual del Splash y la App
    splash.classList.remove("oculto");
    app.classList.add("oculto");
    splash.style.opacity = '1';
    splash.style.pointerEvents = 'auto';

    // 2. Forzar al modal de cadencias a estar OCULTO (Esta es la corrección clave)
    if (cadenceModal) {
        cadenceModal.classList.add('oculto');
        cadenceModal.style.display = 'none'; // <-- Forza el display a 'none' para máxima seguridad
    }
    
    // Función para entrar a la app
    const enterApp = () => {
        // Ocultar splash
        splash.style.opacity = '0';
        // Mostrar app principal
        app.classList.remove("oculto");

        // Cuando la transición del splash termine, lo ocultamos completamente del DOM
        const handleTransitionEnd = () => {
            splash.classList.add("oculto");
            splash.style.pointerEvents = 'none';
            splash.removeEventListener('transitionend', handleTransitionEnd);
        };
        splash.addEventListener('transitionend', handleTransitionEnd);
        
        // Quitar el listener del logo para que no se ejecute de nuevo
        logo.removeEventListener("click", enterApp);
    };

    // Asignar el evento de clic al logo
    logo.addEventListener("click", enterApp);
}
