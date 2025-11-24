// =========================================================================
// VARIABLES GLOBALES DE LA APLICACIÓN
// =========================================================================
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let manualEdits = {};
let cadenceData = [];
let cadenceSpec = null;

// =========================================================================
// LÓGICA DE AUTENTICACIÓN Y ARRANQUE
// =========================================================================

// Base de datos de usuarios (simplificada)
const users = {
  "coordinador@turnapp.es": { password: "1234" }
};

/**
 * Inicializa el sistema de autenticación. Es la ÚNICA función que se llama al cargar la página.
 */
function initAuth() {
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const btnLogin = document.getElementById('btn-login');
    const errorMessage = document.getElementById('login-error-message');

    // Función para intentar el login
    const attemptLogin = () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();

        if (users[email] && users[email].password === password) {
            // Éxito
            localStorage.setItem('turnapp_loggedIn', 'true');
            
            // Oculta login y muestra la app con una transición suave
            loginSection.style.opacity = '0';
            setTimeout(() => {
                loginSection.classList.add('oculto');
                appSection.classList.remove('oculto');
                appSection.style.opacity = '1';
                initializeMainApp(); // <-- ARRANCA LA APP PRINCIPAL
            }, 500);

        } else {
            // Fracaso
            errorMessage.textContent = 'Email o contraseña incorrectos.';
            errorMessage.classList.remove('oculto');
            loginPassword.value = '';
        }
    };
    
    // Listeners del formulario de login
    btnLogin.addEventListener('click', attemptLogin);
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });
    loginEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });

    // Comprobar si ya hay una sesión activa al cargar la página
    if (localStorage.getItem('turnapp_loggedIn') === 'true') {
        loginSection.classList.add('oculto');
        appSection.classList.remove('oculto');
        appSection.style.opacity = '1';
        initializeMainApp();
    } else {
        loginSection.classList.remove('oculto');
        loginSection.style.opacity = '1';
    }
}

/**
 * Contenedor que inicializa TODOS los componentes de la aplicación principal.
 * Solo se llama después de un login exitoso.
 */
function initializeMainApp() {
    initTheme();
    initEditableTitle();
    initTablaCoordinador();
    initTablonAnuncios();
    initDocumentosPanel();
    restoreManualEdits();
    initLicenciasPanel();
    initApp(); // Contiene el renderizado del calendario
    restoreCadenceSpec();
    initPeticiones();
    initLogout(); // Nueva función para el botón de logout
    console.log("Aplicación principal inicializada.");
}

// =========================================================================
// TODAS LAS FUNCIONES DE LA APLICACIÓN PRINCIPAL
// (Aquí va todo tu código original, ahora encapsulado y ordenado)
// =========================================================================

function initLogout() {
    const btnLogout = document.getElementById('btn-logout');
    if (!btnLogout) return;

    btnLogout.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres cerrar la sesión?')) {
            localStorage.removeItem('turnapp_loggedIn');
            window.location.reload(); // Recarga la página para volver al login
        }
    });
}

function initTheme() {
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    const currentTheme = localStorage.getItem('turnapp-theme') || 'light';
    document.body.className = currentTheme + '-theme';
    if(btnToggleTheme) btnToggleTheme.textContent = currentTheme === 'light' ? '🌙' : '☀️';

    btnToggleTheme.addEventListener('click', () => {
        let theme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        document.body.className = theme + '-theme';
        btnToggleTheme.textContent = theme === 'light' ? '🌙' : '☀️';
        localStorage.setItem('turnapp-theme', theme);
    });
}

function initEditableTitle() {
    const editableTitle = document.getElementById('editable-title');
    const savedTitle = localStorage.getItem('turnapp.title');
    if (savedTitle) editableTitle.textContent = savedTitle;

    editableTitle.addEventListener('blur', () => {
        localStorage.setItem('turnapp.title', editableTitle.textContent);
    });
    editableTitle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            editableTitle.blur();
        }
    });
}

function initTablaCoordinador() {
    const tabla = document.getElementById('tabla-coordinador');
    if (!tabla) return;
    const thead = tabla.querySelector('thead');
    const tbody = tabla.querySelector('tbody');
    const STORAGE_KEY = 'tablaCoordinadorState.v2';

    const defaultHeaders = ["Nombre", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom", "Observaciones"];
    const defaultData = [
        ["Coordinador", "", "", "", "", "", "", "", ""],
        ["Vigilante 1", "", "", "", "", "", "", "", ""],
        ["Vigilante 2", "", "", "", "", "", "", "", ""]
    ];

    function guardarTabla() {
        const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent);
        const data = Array.from(tbody.querySelectorAll('tr')).map(tr => 
            Array.from(tr.querySelectorAll('td')).map(td => td.textContent)
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ headers, data }));
    }

    function cargarTabla() {
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (guardado) {
            const { headers, data } = JSON.parse(guardado);
            renderizarTabla(headers, data);
        } else {
            renderizarTabla(defaultHeaders, defaultData);
        }
    }

    function renderizarTabla(headers, data) {
        thead.innerHTML = '';
        tbody.innerHTML = '';
        const headerRow = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            th.contentEditable = "true";
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        data.forEach(rowData => {
            const tr = document.createElement('tr');
            rowData.forEach(cellData => {
                const td = document.createElement('td');
                td.textContent = cellData;
                td.contentEditable = "true";
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }
    
    document.getElementById('btn-add-row').addEventListener('click', () => {
        const newRow = document.createElement('tr');
        const numCols = thead.querySelector('tr').cells.length;
        for (let i = 0; i < numCols; i++) {
            const td = document.createElement('td');
            td.contentEditable = "true";
            newRow.appendChild(td);
        }
        tbody.appendChild(newRow);
    });

    document.getElementById('btn-remove-row').addEventListener('click', () => {
        if (tbody.rows.length > 1) tbody.deleteRow(-1);
    });

    document.getElementById('btn-add-col').addEventListener('click', () => {
        const th = document.createElement('th');
        th.contentEditable = "true";
        th.textContent = "Turno";
        const obsHeader = thead.querySelector('tr').lastChild;
        thead.querySelector('tr').insertBefore(th, obsHeader);
        Array.from(tbody.rows).forEach(tr => {
            const td = document.createElement('td');
            td.contentEditable = "true";
            tr.insertBefore(td, tr.lastChild);
        });
    });

    document.getElementById('btn-remove-col').addEventListener('click', () => {
        const headerRow = thead.querySelector('tr');
        if (headerRow.cells.length > 2) {
            const lastTurnoIndex = headerRow.cells.length - 2;
            headerRow.deleteCell(lastTurnoIndex);
            Array.from(tbody.rows).forEach(tr => tr.deleteCell(lastTurnoIndex));
        }
    });

    document.getElementById('limpiar-tabla').addEventListener('click', () => {
        if (confirm("¿Limpiar todo el contenido de la tabla?")) {
            tbody.querySelectorAll('td').forEach(td => td.textContent = '');
            guardarTabla();
        }
    });

    tabla.addEventListener('input', (e) => {
        if (e.target.tagName === 'TD' || e.target.tagName === 'TH') {
            guardarTabla();
        }
    });
    
    cargarTabla();
}

function initTablonAnuncios() {
    const fileInput = document.getElementById('file-input');
    const btnUpload = document.getElementById('btn-upload-file');
    const previewContainer = document.getElementById('tablon-preview-container');
    const previewImage = document.getElementById('tablon-preview-image');
    const lista = document.getElementById('tablon-lista');
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-image-content');
    const modalClose = modal.querySelector('.image-modal-close');

    if(!fileInput || !btnUpload) return;

    const TABLON_KEY = 'turnapp.tablon.v3';

    function loadFiles() { return JSON.parse(localStorage.getItem(TABLON_KEY) || '[]'); }
    function saveFiles(files) { localStorage.setItem(TABLON_KEY, JSON.stringify(files)); }

    function renderFiles() {
        const files = loadFiles();
        lista.innerHTML = '';
        previewContainer.classList.add('oculto');

        files.forEach((file, index) => {
            if (file.type.startsWith('image/') && index === 0) {
                previewImage.src = file.data;
                previewContainer.classList.remove('oculto');
            }
            const item = document.createElement('div');
            item.className = 'tablon-item';
            const uploadDate = new Date(file.date).toLocaleString('es-ES');
            item.innerHTML = `
                <div class="tablon-item-info">
                    <strong>${file.name}</strong>
                    <small>Subido: ${uploadDate}</small>
                </div>
                <div class="tablon-item-actions">
                    <button class="view-btn modern-btn green" data-index="${index}">Ver</button>
                    <button class="delete-btn modern-btn red" data-index="${index}">Borrar</button>
                </div>`;
            lista.appendChild(item);
        });
    }

    btnUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const newFile = {
                name: file.name,
                type: file.type,
                size: file.size,
                date: new Date().toISOString(),
                data: event.target.result
            };
            const files = loadFiles();
            files.unshift(newFile);
            saveFiles(files);
            renderFiles();
        };
        reader.readAsDataURL(file);
    });

    lista.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        if (index === undefined) return;

        if (e.target.classList.contains('view-btn')) {
            const file = loadFiles()[index];
            if (file.type.startsWith('image/')) {
                modalImg.src = file.data;
                modal.classList.remove('oculto');
            } else {
                const blob = dataURLtoBlob(file.data);
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
        }
        if (e.target.classList.contains('delete-btn')) {
            if (confirm("¿Seguro que quieres borrar este archivo?")) {
                let files = loadFiles();
                files.splice(index, 1);
                saveFiles(files);
                renderFiles();
            }
        }
    });

    function dataURLtoBlob(dataurl) {
        const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--) u8arr[n] = bstr.charCodeAt(n);
        return new Blob([u8arr], {type:mime});
    }
    
    previewImage.addEventListener('click', () => {
        modalImg.src = previewImage.src;
        modal.classList.remove('oculto');
    });
    modalClose.addEventListener('click', () => modal.classList.add('oculto'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('oculto');
    });

    renderFiles();
}

function initDocumentosPanel() {
    const documentosSection = document.getElementById('documentos-section');
    if (!documentosSection) return;

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
    }

    const pdfInput = document.getElementById('pdf-input');
    const pdfModal = document.getElementById('pdf-modal');
    const modalPdfContent = document.getElementById('modal-pdf-content');
    const modalCloseBtn = pdfModal ? pdfModal.querySelector('.image-modal-close') : null;
    
    if(!pdfInput || !pdfModal || !modalPdfContent || !modalCloseBtn) return;

    const DOCS_KEY = 'turnapp.documentos.v3'; 
    const CATEGORIES = ['mes', 'ciclos', 'vacaciones', 'rotacion'];
    let currentUploadCategory = null;

    function loadDocs() {
        const data = JSON.parse(localStorage.getItem(DOCS_KEY) || '{}');
        CATEGORIES.forEach(cat => {
            if (!Array.isArray(data[cat])) data[cat] = [];
        });
        return data;
    }

    function saveDocs(docs) {
        localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
    }
    
    async function generatePdfThumbnail(pdfDataUrl) {
        try {
            const pdf = await pdfjsLib.getDocument(pdfDataUrl).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return canvas.toDataURL('image/jpeg', 0.8);
        } catch (error) {
            console.error("Error generando la miniatura del PDF:", error);
            return null;
        }
    }

    function renderDocs() {
        const docs = loadDocs();
        
        CATEGORIES.forEach(category => {
            const card = documentosSection.querySelector(`.documento-card[data-category="${category}"]`);
            if (!card) return;

            const imgPreview = card.querySelector('.documento-preview-img');
            const overlay = card.querySelector('.preview-overlay');
            const fileListContainer = card.querySelector('.documento-file-list');
            
            const files = docs[category];

            if (files && files.length > 0) {
                const lastFile = files[0];
                if (lastFile.thumbnail) {
                    imgPreview.src = lastFile.thumbnail;
                    imgPreview.style.display = 'block';
                    overlay.style.display = 'none';
                }
            } else {
                imgPreview.src = '';
                imgPreview.style.display = 'none';
                overlay.style.display = 'flex';
            }

            fileListContainer.innerHTML = '';
            const fragment = document.createDocumentFragment();

            if (files) {
                files.forEach((file, index) => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'documento-file-item';
                    const uploadDate = new Date(file.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

                    fileItem.innerHTML = `
                        <div class
                        <div class="documento-file-info">
                            <span class="file-name">${file.name}</span>
                            <small class="file-date">Subido: ${uploadDate}</small>
                        </div>
                        <div class="documento-file-actions">
                            <button class="view-pdf modern-btn" data-category="${category}" data-index="${index}">Ver</button>
                            <button class="delete-pdf modern-btn red" data-category="${category}" data-index="${index}">Borrar</button>
                        </div>`;
                    fragment.appendChild(fileItem);
                });
            }

            fileListContainer.appendChild(fragment);
        });
    }

    documentosSection.addEventListener('click', async (e) => {
        const target = e.target;
        const category = target.dataset.category;
        
        if (target.classList.contains('btn-upload-pdf')) {
            currentUploadCategory = category;
            pdfInput.click();
        } else if (target.classList.contains('view-pdf')) {
            const index = target.dataset.index;
            const docs = loadDocs();
            const file = docs[category][index];
            if (file) {
                modalPdfContent.src = file.data;
                pdfModal.classList.remove('oculto');
            }
        } else if (target.classList.contains('delete-pdf')) {
            const index = target.dataset.index;
            if (confirm(`¿Seguro que quieres borrar este documento de la categoría ${category}?`)) {
                const docs = loadDocs();
                docs[category].splice(index, 1);
                saveDocs(docs);
                renderDocs();
            }
        } else if (target.closest('.documento-preview-container')) {
             const cardCategory = target.closest('.documento-card').dataset.category;
             const docs = loadDocs();
             const lastFile = docs[cardCategory] ? docs[cardCategory][0] : null;
             if (lastFile) {
                modalPdfContent.src = lastFile.data;
                pdfModal.classList.remove('oculto');
             }
        }
    });

    pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUploadCategory) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target.result;
            const thumbnail = await generatePdfThumbnail(dataUrl);
            const newDoc = {
                name: file.name,
                date: new Date().toISOString(),
                data: dataUrl,
                thumbnail: thumbnail
            };

            const docs = loadDocs();
            docs[currentUploadCategory].unshift(newDoc);
            saveDocs(docs);
            renderDocs();
            currentUploadCategory = null; 
        };
        reader.readAsDataURL(file);
    });

    modalCloseBtn.addEventListener('click', () => pdfModal.classList.add('oculto'));
    pdfModal.addEventListener('click', (e) => {
        if (e.target === pdfModal) pdfModal.classList.add('oculto');
    });

    renderDocs();
}

function initLicenciasPanel() {
    const container = document.getElementById('licencias-container');
    if (!container) return;

    const LICENCIAS_KEY = 'turnapp.licencias.v1';

    function updateRow(rowElement) {
        // Asume que rowElement es el div con data-tipo
        const cargaInput = rowElement.nextElementSibling.querySelector('input');
        const consumidosInput = cargaInput.parentElement.nextElementSibling.querySelector('input');
        const restanInput = consumidosInput.parentElement.nextElementSibling.querySelector('input');
        
        const carga = parseInt(cargaInput.value) || 0;
        const consumidos = parseInt(consumidosInput.value) || 0;
        
        restanInput.value = carga - consumidos;
    }

    function updateTotal() {
        const allCarga = Array.from(container.querySelectorAll('.carga')).reduce((sum, el) => sum + (parseInt(el.value) || 0), 0);
        const allConsumidos = Array.from(container.querySelectorAll('.consumidos')).reduce((sum, el) => sum + (parseInt(el.value) || 0), 0);
        
        document.getElementById('total-carga').value = allCarga;
        document.getElementById('total-consumidos').value = allConsumidos;
        document.getElementById('total-restan').value = allCarga - allConsumidos;
    }

    function saveState() {
        const state = {};
        const grid = container.querySelector('.licencias-grid');
        const rows = grid.querySelectorAll('.licencia-item[data-tipo]');
        rows.forEach(row => {
            const tipo = row.dataset.tipo;
            const carga = row.nextElementSibling.querySelector('input').value;
            const consumidos = row.nextElementSibling.nextElementSibling.querySelector('input').value;
            state[tipo] = { carga, consumidos };
        });
        localStorage.setItem(LICENCIAS_KEY, JSON.stringify(state));
    }

    function loadState() {
        const state = JSON.parse(localStorage.getItem(LICENCIAS_KEY) || '{}');
        const grid = container.querySelector('.licencias-grid');
        const rows = grid.querySelectorAll('.licencia-item[data-tipo]');
        rows.forEach(row => {
            const tipo = row.dataset.tipo;
            if (state[tipo]) {
                row.nextElementSibling.querySelector('input').value = state[tipo].carga;
                row.nextElementSibling.nextElementSibling.querySelector('input').value = state[tipo].consumidos;
            }
            updateRow(row);
        });
        updateTotal();
    }
    
    container.addEventListener('input', (e) => {
        if (e.target.classList.contains('carga') || e.target.classList.contains('consumidos')) {
            const rowDiv = e.target.parentElement.previousElementSibling;
            updateRow(rowDiv);
            updateTotal();
            saveState();
        }
    });

    loadState();
}


function saveManualEdits() {
    localStorage.setItem('turnapp.manualEdits', JSON.stringify(manualEdits));
}

function restoreManualEdits() {
    manualEdits = JSON.parse(localStorage.getItem('turnapp.manualEdits') || '{}');
}

function saveCadenceSpec() {
    localStorage.setItem('turnapp.cadenceSpec', JSON.stringify(cadenceSpec));
}

function restoreCadenceSpec() {
    const saved = localStorage.getItem('turnapp.cadenceSpec');
    if (saved) {
        cadenceSpec = JSON.parse(saved);
    }
}

// =========================================================================
// LÓGICA PRINCIPAL DEL CALENDARIO Y CADENCIAS
// =========================================================================

function initApp() {
    const monthLabel = document.getElementById('monthLabel');
    const calendar = document.getElementById('calendar');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const btnApplyCadence = document.getElementById('btn-apply-cadence');
    const btnClearCadence = document.getElementById('btn-clear-cadence');
    
    // Elementos del modal de cadencia
    const cadenceModalOverlay = document.getElementById('cadence-modal-overlay');
    const cadenceStartInput = document.getElementById('cadence-start');
    const customPatternInput = document.getElementById('custom-pattern');
    const applyCadenceConfirmBtn = document.getElementById('apply-cadence-confirm');
    const closeCadenceBtn = document.getElementById('close-cadence');
    const v1Options = document.getElementById('v1-options');
    const v2Options = document.getElementById('v2-options');
    const customSection = document.getElementById('custom-section');

    const cadencePatterns = {
        "V-1": [
            ["M/T", "L", "M/T", "N", "L", "L", "L", "L"],
            ["M/T", "M/T", "N", "L", "L", "L", "L", "L"],
            ["T", "M/T", "M/N", "L", "L", "L", "L", "L"],
            ["M/T", "N", "L", "L", "L"],
            ["T", "M/N", "L", "L", "L"]
        ],
        "V-2": [
            ["M/T", "M/T", "L", "L", "L", "L"]
        ]
    };

    function renderCalendar() {
        calendar.innerHTML = '';
        monthLabel.textContent = new Date(currentYear, currentMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dayOffset = (firstDay === 0) ? 6 : firstDay - 1;

        for (let i = 0; i < dayOffset; i++) {
            calendar.innerHTML += `<div class="day empty"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            let content = '';

            if (manualEdits[dateStr]) {
                content = manualEdits[dateStr];
            } else if (cadenceData[day - 1]) {
                content = cadenceData[day - 1];
            }

            calendar.innerHTML += `
                <div class="day" data-date="${dateStr}">
                    <div class="day-number">${day}</div>
                    <div class="day-content" contenteditable="true" spellcheck="false">${content}</div>
                </div>`;
        }
        
        applyCellStyles();
    }
    
    function applyCellStyles() {
        document.querySelectorAll('.day-content').forEach(cell => {
            const text = cell.textContent.trim().toUpperCase();
            cell.className = 'day-content'; // Reset classes
            if (['AP', 'V', 'L'].includes(text)) {
                 cell.classList.add(`turno-${text}`);
            }
        });
    }

    function calculateCadence() {
        cadenceData = [];
        if (!cadenceSpec) return;

        const { pattern, startDate } = cadenceSpec;
        const [startDay, startMonth, startYear] = startDate.split('/').map(Number);
        const firstOfMonth = new Date(currentYear, currentMonth, 1);
        const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);

        if (currentYear < startYear || (currentYear === startYear && currentMonth < startMonth - 1)) {
            return;
        }

        for (let d = 1; d <= lastOfMonth.getDate(); d++) {
            const currentDate = new Date(currentYear, currentMonth, d);
            const startDateObj = new Date(startYear, startMonth - 1, startDay);
            const diffTime = currentDate - startDateObj;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0) {
                const patternIndex = diffDays % pattern.length;
                cadenceData[d - 1] = pattern[patternIndex];
            }
        }
    }
    
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        calculateCadence();
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        calculateCadence();
        renderCalendar();
    });

    calendar.addEventListener('input', (e) => {
        if (e.target.classList.contains('day-content')) {
            const dayDiv = e.target.parentElement;
            const date = dayDiv.dataset.date;
            const content = e.target.textContent.trim();
            if (content) {
                manualEdits[date] = content;
            } else {
                delete manualEdits[date];
            }
            saveManualEdits();
            applyCellStyles();
        }
    });

    btnApplyCadence.addEventListener('click', () => {
        cadenceModalOverlay.classList.remove('oculto');
    });
    
    closeCadenceBtn.addEventListener('click', () => {
        cadenceModalOverlay.classList.add('oculto');
    });

    document.querySelectorAll('.modal-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.type;
            v1Options.classList.toggle('oculto', type !== 'V-1');
            v2Options.classList.toggle('oculto', type !== 'V-2');
            customSection.classList.toggle('oculto', type !== 'Personalizada');
        });
    });

    applyCadenceConfirmBtn.addEventListener('click', () => {
        const startDate = cadenceStartInput.value;
        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(startDate)) {
            alert("Por favor, introduce una fecha de inicio válida (DD/MM/AAAA).");
            return;
        }
        
        const activeBtn = document.querySelector('.modal-type-btn.active');
        if (!activeBtn) {
            alert("Por favor, selecciona un tipo de cadencia.");
            return;
        }

        const type = activeBtn.dataset.type;
        let pattern = [];

        if (type === 'V-1') {
            const selectedRadio = document.querySelector('input[name="v1opt"]:checked');
            if (!selectedRadio) {
                alert("Por favor, selecciona una opción para V-1.");
                return;
            }
            pattern = cadencePatterns["V-1"][parseInt(selectedRadio.value)];
        } else if (type === 'V-2') {
            pattern = cadencePatterns["V-2"][0];
        } else if (type === 'Personalizada') {
            pattern = customPatternInput.value.split(',').map(s => s.trim()).filter(Boolean);
            if (pattern.length === 0) {
                alert("Por favor, introduce un patrón personalizado.");
                return;
            }
        }
        
        cadenceSpec = { startDate, pattern };
        saveCadenceSpec();
        calculateCadence();
        renderCalendar();
        cadenceModalOverlay.classList.add('oculto');
    });

    btnClearCadence.addEventListener('click', () => {
        if (confirm("¿Seguro que quieres borrar la cadencia actual y todas las ediciones manuales del calendario?")) {
            cadenceSpec = null;
            manualEdits = {};
            localStorage.removeItem('turnapp.cadenceSpec');
            localStorage.removeItem('turnapp.manualEdits');
            calculateCadence();
            renderCalendar();
        }
    });

    // Carga inicial
    calculateCadence();
    renderCalendar();
}

// =========================================================================
// SECCIÓN DE PETICIONES
// =========================================================================
function initPeticiones() {
    const btnPeticiones = document.getElementById('btn-peticiones');
    const peticionesSection = document.getElementById('peticiones-section');
    const inputPeticion = document.getElementById('peticion-texto');
    const btnEnviarPeticion = document.getElementById('enviar-peticion');
    const listaPeticiones = document.getElementById('lista-peticiones-usuario');
    const PETICIONES_KEY = 'turnapp.peticiones.v1';

    if (!btnPeticiones || !peticionesSection || !inputPeticion || !btnEnviarPeticion || !listaPeticiones) {
        console.error("Faltan elementos de la sección de peticiones en el HTML.");
        return;
    }

    function loadPeticiones() {
        return JSON.parse(localStorage.getItem(PETICIONES_KEY) || '[]');
    }

    function savePeticiones(peticiones) {
        localStorage.setItem(PETICIONES_KEY, JSON.stringify(peticiones));
    }

    function renderPeticiones() {
        const peticiones = loadPeticiones();
        listaPeticiones.innerHTML = '';
        peticiones.forEach((p, index) => {
            const li = document.createElement('li');
            li.className = 'peticion-item';
            // Adaptado para que coincida con los estilos de la tabla
            li.innerHTML = `
                <span>${p.text}</span>
                <button class="delete-peticion modern-btn red" data-index="${index}">Borrar</button>
            `;
            listaPeticiones.appendChild(li);
        });
    }

    btnPeticiones.addEventListener('click', () => {
        peticionesSection.classList.toggle('oculto');
    });

    btnEnviarPeticion.addEventListener('click', () => {
        const text = inputPeticion.value.trim();
        if (text) {
            const peticiones = loadPeticiones();
            peticiones.push({ text: text, date: new Date().toISOString() });
            savePeticiones(peticiones);
            renderPeticiones();
            inputPeticion.value = '';
        }
    });

    listaPeticiones.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-peticion')) {
            const index = parseInt(e.target.dataset.index, 10);
            if (confirm('¿Seguro que quieres borrar esta petición?')) {
                let peticiones = loadPeticiones();
                peticiones.splice(index, 1);
                savePeticiones(peticiones);
                renderPeticiones();
            }
        }
    });
    
    renderPeticiones();
}

// =========================================================================
// PUNTO DE ENTRADA PRINCIPAL DEL SCRIPT
// Se asegura que el DOM esté cargado y entonces inicia la autenticación.
// =========================================================================
document.addEventListener('DOMContentLoaded', initAuth);
