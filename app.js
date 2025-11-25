// =========================================================================
// TurnApp v4.0 - Versión Estable (Single-User)
// Archivo reconstruido para la integración del sistema de login.
// =========================================================================

// -------------------------------------------------------------------------
// 1. ESTADO GLOBAL DE LA APLICACIÓN
// -------------------------------------------------------------------------

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = [];
let cadenceSpec = null;
let manualEdits = {};

const spanishHolidays = [
  { day: 1, month: 0 }, { day: 6, month: 0 }, { day: 1, month: 4 },
  { day: 15, month: 7 }, { day: 12, month: 9 }, { day: 1, month: 10 },
  { day: 6, month: 11 }, { day: 8, month: 11 }, { day: 25, month: 11 }
];

const colorPalette = [
  "#d87d00", "#4d9ef7", "#f7a64d", "#6fd773", "#e65252", "#c9c9c9",
  "#ff4d4d", "#ffa64d", "#ffd24d", "#85e085", "#4dd2ff", "#4d79ff",
  "#b84dff", "#ff4da6", "#a6a6a6", "#ffffff", "rgba(232,240,255,1)",
  "rgba(163,193,255,0.65)", "rgba(255,179,179,0.45)"
];

// -------------------------------------------------------------------------
// 2. FUNCIONES DE UTILIDAD
// -------------------------------------------------------------------------

function dateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function isColorLight(hex) {
    if (!hex) return true;
    let r, g, b;
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
        [r, g, b] = hex.match(/\d+/g).map(Number);
    } else {
        const h = hex.charAt(0) === '#' ? hex.substring(1) : hex;
        r = parseInt(h.substring(0, 2), 16);
        g = parseInt(h.substring(2, 4), 16);
        b = parseInt(h.substring(4, 6), 16);
    }
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 160;
}

function defaultTextFor(shiftKey) {
  return shiftKey;
}

function getVariableHolidays(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    const easterSunday = new Date(year, month - 1, day);
    const goodFriday = new Date(easterSunday);
    goodFriday.setDate(easterSunday.getDate() - 2);
    return [{ day: goodFriday.getDate(), month: goodFriday.getMonth() }];
}

function saveManualEdits() {
  try {
    localStorage.setItem('turnapp.manualEdits', JSON.stringify(manualEdits));
  } catch (e) {
    console.error("Error guardando ediciones manuales:", e);
  }
}

function restoreManualEdits() {
  try {
    const raw = localStorage.getItem('turnapp.manualEdits');
    manualEdits = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Error restaurando ediciones manuales:", e);
    manualEdits = {};
  }
}

function saveCadenceSpec(spec) {
  try {
    localStorage.setItem('turnapp.cadenceSpec', JSON.stringify(spec));
  } catch (e) {
    console.error("Error guardando la especificación de cadencia:", e);
  }
}

function restoreCadenceSpec() {
  try {
    const raw = localStorage.getItem('turnapp.cadenceSpec');
    if (!raw) return;
    cadenceSpec = JSON.parse(raw);
    if (cadenceSpec && cadenceSpec.startISO && cadenceSpec.pattern) {
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    }
  } catch (e) {
    cadenceSpec = null;
    console.error("Error restaurando la especificación de cadencia:", e);
  }
}

function buildCadenceDataFromSpec() {
  if (!cadenceSpec || !cadenceSpec.startISO || !cadenceSpec.pattern) {
    cadenceData = [];
    return;
  }
  cadenceData = [];
  const start = new Date(cadenceSpec.startISO);
  for (let i = 0; i < 10000; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cadenceData.push({ date: d, type: cadenceSpec.pattern[i % cadenceSpec.pattern.length] });
  }
}

// -------------------------------------------------------------------------
// 3. LÓGICA DEL CALENDARIO Y PANELES
// -------------------------------------------------------------------------

function openColorPicker(anchorEl, onSelect) {
    const existing = document.getElementById('color-picker-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'color-picker-popup';
    popup.style.cssText = `
        position: absolute; display: flex; flex-wrap: wrap;
        background: var(--panel-bg); border: 1px solid var(--panel-border);
        padding: 6px; border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,0.15);
        z-index: 10000; width: 150px; gap: 8px;
    `;

    colorPalette.forEach(color => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'palette-swatch';
        b.style.backgroundColor = color;
        b.onclick = (e) => {
            e.stopPropagation();
            onSelect(color);
            popup.remove();
        };
        popup.appendChild(b);
    });

    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'palette-swatch reset-btn';
    resetButton.innerHTML = '🔄';
    resetButton.title = 'Restaurar color original';
    resetButton.onclick = (e) => {
        e.stopPropagation();
        onSelect('initial');
        popup.remove();
    };
    popup.appendChild(resetButton);

    document.body.appendChild(popup);

    const rect = anchorEl.getBoundingClientRect();
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 6;
    if (left + 150 > window.innerWidth) {
        left = window.innerWidth - 158;
    }
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    const closeFn = (ev) => {
        if (!popup.contains(ev.target) && ev.target !== anchorEl) {
            popup.remove();
            document.removeEventListener('click', closeFn, true);
        }
    };
    setTimeout(() => document.addEventListener('click', closeFn, true), 10);
}

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.panel');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const section = button.dataset.section;

            if (!section) return;

            panels.forEach(panel => {
                panel.classList.add('oculto');
            });

            const activePanel = document.getElementById(`${section}-section`) || document.getElementById('content');
            if (activePanel) {
                activePanel.classList.remove('oculto');
            }

            navButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
        });
    });
}

function initCalendarControls() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    const calendarPanel = document.getElementById('content');

    const goToNextMonth = () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentMonth, currentYear);
    };

    const goToPrevMonth = () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentMonth, currentYear);
    };

    if (prevBtn) prevBtn.addEventListener('click', goToPrevMonth);
    if (nextBtn) nextBtn.addEventListener('click', goToNextMonth);

    if (calendarPanel) {
        let touchStartX = 0;
        calendarPanel.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        calendarPanel.addEventListener('touchend', e => {
            const touchEndX = e.changedTouches[0].screenX;
            const swipeDistance = touchEndX - touchStartX;
            if (Math.abs(swipeDistance) > 50) {
                if (swipeDistance < 0) goToNextMonth();
                else goToPrevMonth();
            }
        });
    }
}

function renderCalendar(month, year) {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    calendar.innerHTML = '';
    calendar.classList.add('fade-in-up');

    const variableHolidays = getVariableHolidays(year);
    const monthLabel = document.getElementById('monthLabel');
    if (monthLabel) {
        monthLabel.textContent = `${new Date(year, month).toLocaleString('es-ES', { month: 'long' })} ${year}`.replace(/^\w/, c => c.toUpperCase());
    }

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = (firstDay === 0) ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        calendar.insertAdjacentHTML('beforeend', '<div class="day-cell empty"></div>');
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const weekday = dateObj.getDay();
        const isFixedHoliday = spanishHolidays.some(h => h.day === day && h.month === month);
        const isVariableHoliday = variableHolidays.some(h => h.day === day && h.month === month);
        const isHoliday = isFixedHoliday || isVariableHoliday;

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (weekday === 6) cell.classList.add('saturday');
        if (weekday === 0 || isHoliday) cell.classList.add('sunday', 'holiday');
        
        const label = document.createElement('div');
        label.className = 'day-label';
        label.textContent = day;
        cell.appendChild(label);

        const wrapper = document.createElement('div');
        wrapper.className = 'shifts-wrapper';
        const row = document.createElement('div');
        row.className = 'shifts-row';

        row.appendChild(createShiftElement(year, month, day, 'M', isHoliday));
        row.appendChild(createShiftElement(year, month, day, 'T', isHoliday));
        wrapper.appendChild(row);
        wrapper.appendChild(createShiftElement(year, month, day, 'N', isHoliday));
        
        cell.appendChild(wrapper);
        calendar.appendChild(cell);
    }
    
    applyCadenceRender(month, year);
    
    setTimeout(() => calendar.classList.remove('fade-in-up'), 500);
}

function createShiftElement(year, month, day, shiftKey, isHoliday) {
    const container = document.createElement('div');
    container.className = `shift-container ${shiftKey === 'N' ? 'night' : ''}`;

    const shift = document.createElement('div');
    shift.className = `shift-${shiftKey.toLowerCase()} shift-cell`;
    shift.contentEditable = true;
    shift.spellcheck = false;

    const dk = dateKey(year, month, day);
    const weekday = new Date(year, month, day).getDay();
    
    let defaultBg = '';
    if (isHoliday || weekday === 0) defaultBg = 'rgba(255,179,179,0.45)';
    else if (weekday === 6) defaultBg = 'rgba(163,193,255,0.65)';
    else defaultBg = '#e8f0ff';
    shift.style.backgroundColor = defaultBg;

    const savedShift = manualEdits[dk]?.[shiftKey];
    if (savedShift) {
        shift.textContent = savedShift.text ?? defaultTextFor(shiftKey);
        if (savedShift.color) {
            shift.style.backgroundColor = savedShift.color;
            shift.style.color = isColorLight(savedShift.color) ? '#000' : '#fff';
            shift.dataset.userColor = 'true';
        }
    } else {
        shift.textContent = defaultTextFor(shiftKey);
    }

    shift.onblur = () => saveShiftText(year, month, day, shiftKey, shift.textContent.trim());
    shift.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            shift.blur();
        }
    };
    
    container.appendChild(shift);
    
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'color-handle';
    handle.innerHTML = '●';
    handle.onclick = (ev) => {
        ev.stopPropagation();
        openColorPicker(handle, (color) => {
            if (color === 'initial') {
                shift.style.backgroundColor = defaultBg;
                shift.style.color = '#000';
                delete shift.dataset.userColor;
                if(manualEdits[dk]?.[shiftKey]) delete manualEdits[dk][shiftKey].color;
            } else {
                shift.style.backgroundColor = color;
                shift.style.color = isColorLight(color) ? '#000' : '#fff';
                shift.dataset.userColor = 'true';
                if (!manualEdits[dk]) manualEdits[dk] = {};
                if (!manualEdits[dk][shiftKey]) manualEdits[dk][shiftKey] = {};
                manualEdits[dk][shiftKey].color = color;
            }
            saveManualEdits();
        });
    };
    container.appendChild(handle);

    return container;
}

function saveShiftText(year, month, day, shiftKey, text) {
    const dk = dateKey(year, month, day);
    if (!manualEdits[dk]) manualEdits[dk] = {};
    if (!manualEdits[dk][shiftKey]) manualEdits[dk][shiftKey] = {};
    manualEdits[dk][shiftKey].text = text;
    saveManualEdits();
}

function applyCadenceRender(month, year) {
    if (cadenceData.length === 0) return;
    
    document.querySelectorAll('#calendar .day-cell:not(.empty)').forEach(cell => {
        const day = parseInt(cell.querySelector('.day-label').textContent, 10);
        if (isNaN(day)) return;

        const cellDate = new Date(year, month, day);
        const cd = cadenceData.find(c => c.date.toDateString() === cellDate.toDateString());

        const shiftM = cell.querySelector('.shift-m');
        const shiftT = cell.querySelector('.shift-t');
        const shiftN = cell.querySelector('.shift-n');

        const dk = dateKey(year, month, day);
        
        const resetShiftStyle = (el) => {
            if (!el || el.dataset.userColor) return;
            const weekday = cellDate.getDay();
            let defaultBg = '#e8f0ff';
            if (cell.classList.contains('holiday') || weekday === 0) defaultBg = 'rgba(255,179,179,0.45)';
            else if (weekday === 6) defaultBg = 'rgba(163,193,255,0.65)';
            el.style.backgroundColor = defaultBg;
            el.style.color = '#000';
        };
        
        [shiftM, shiftT, shiftN].forEach(resetShiftStyle);

        if (cd) {
            const types = String(cd.type).split('/');
            const applyStyle = (el, key, cadenceColor, textColor = '#000') => {
                if (el && !manualEdits[dk]?.[key]?.color && !manualEdits[dk]?.[key]?.text) {
                    el.style.backgroundColor = cadenceColor;
                    el.style.color = textColor;
                }
            };

            if (types.includes('M') || types.includes('MT')) applyStyle(shiftM, 'M', '#ffa94d');
            if (types.includes('T') || types.includes('MT')) applyStyle(shiftT, 'T', '#ffa94d');
            if (types.includes('N') || types.includes('M/N')) applyStyle(shiftN, 'N', '#d87d00', '#fff');
        }
    });
}

function initEditableTitle() {
    const title = document.getElementById('editable-title');
    const savedTitle = localStorage.getItem('turnapp.title') || 'Calendario de Turnos';
    title.textContent = savedTitle;
    title.addEventListener('blur', () => {
        localStorage.setItem('turnapp.title', title.textContent);
    });
    title.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            title.blur();
        }
    });
}

function initCadenceModal() {
    const form = document.getElementById('cadence-form');
    const startInput = document.getElementById('start-date');
    const patternInput = document.getElementById('cadence-pattern');

    startInput.value = new Date().toISOString().split('T')[0];

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        cadenceSpec = {
            startISO: startInput.value,
            pattern: patternInput.value.trim().split(',').map(s => s.trim())
        };
        saveCadenceSpec(cadenceSpec);
        buildCadenceDataFromSpec();
        renderCalendar(currentMonth, currentYear);
        document.getElementById('cadencias-section').classList.add('oculto');
        document.getElementById('content').classList.remove('oculto');
        document.querySelector('[data-section="calendario"]').classList.add('active');
        document.querySelector('[data-section="cadencias"]').classList.remove('active');
    });

    document.getElementById('clear-cadence').addEventListener('click', () => {
        cadenceSpec = null;
        cadenceData = [];
        localStorage.removeItem('turnapp.cadenceSpec');
        renderCalendar(currentMonth, currentYear);
    });
}

function initRequestsPanel() {
    // Lógica futura para el panel de peticiones (si es necesario)
}

function initPermissionsPanel() {
    const form = document.getElementById('permissions-form');
    const startDateInput = document.getElementById('perm-start-date');
    const endDateInput = document.getElementById('perm-end-date');
    const reasonTextarea = document.getElementById('perm-reason');
    const daysCount = document.getElementById('perm-days-count');

    function calculateDays() {
        const start = new Date(startDateInput.value);
        const end = new Date(endDateInput.value);
        if (isNaN(start) || isNaN(end) || start > end) {
            daysCount.textContent = '0 días';
            return;
        }
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
            const weekday = current.getDay();
            if (weekday !== 0 && weekday !== 6) { 
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        daysCount.textContent = `${count} ${count === 1 ? 'día' : 'días'}`;
    }

    startDateInput.addEventListener('change', calculateDays);
    endDateInput.addEventListener('change', calculateDays);
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Lógica para guardar la solicitud de permiso
        alert('Solicitud de permiso enviada (funcionalidad en desarrollo).');
    });
}

function initThemeSelector() {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('turnapp.theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    themeToggle.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'light') {
            theme = 'dark';
        } else {
            theme = 'light';
        }
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('turnapp.theme', theme);
    });
}

function initInstallButton() {
    let deferredPrompt;
    const installButton = document.getElementById('install-button');
    
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'block';
    });

    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('El usuario aceptó instalar la PWA');
            } else {
                console.log('El usuario rechazó instalar la PWA');
            }
            deferredPrompt = null;
            installButton.style.display = 'none';
        }
    });

    window.addEventListener('appinstalled', () => {
        installButton.style.display = 'none';
        console.log('PWA instalada');
    });
}


// -------------------------------------------------------------------------
// 4. INICIALIZACIÓN DE LA APLICACIÓN
// -------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    restoreManualEdits();
    restoreCadenceSpec();

    initNavigation();
    initCalendarControls();
    initEditableTitle();
    initCadenceModal();
    initRequestsPanel();
    initPermissionsPanel();
    initThemeSelector();
    initInstallButton();

    renderCalendar(currentMonth, currentYear);
    
    document.querySelector('[data-section="calendario"]').classList.add('active');
});