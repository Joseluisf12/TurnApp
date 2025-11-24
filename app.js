// =========================================================================
// TurnApp v4.1.0 - Base de Autenticación Estable
// =========================================================================
// Esta versión introduce la pantalla de login y la estructura para
// el futuro desarrollo multi-usuario. Todo el código ha sido revisado
// y unificado para asegurar su correcto funcionamiento.

// =========================================================================
// GESTIÓN DE ESTADO GLOBAL
// =========================================================================
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = [];
let cadenceSpec = null;
let manualEdits = {};
let currentUser = null; // Guardará el usuario logueado

// =========================================================================
// BLOQUE DE AUTENTICACIÓN
// =========================================================================
function handleLogin() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorMessage = document.getElementById('login-error-message');

    const email = emailInput.value;
    const password = passwordInput.value;

    // Lógica de Autenticación (Temporal)
    if (email === "coordinador@turnapp.es" && password === "1234") {
        currentUser = { email: email, role: 'coordinador' };
    } else if (email === "usuario@turnapp.es" && password === "1234") {
        currentUser = { email: email, role: 'usuario' };
    } else {
        errorMessage.textContent = "Credenciales incorrectas.";
        errorMessage.classList.remove('oculto');
        return;
    }
    
    // Si el login es exitoso:
    errorMessage.classList.add('oculto');
    document.getElementById('login-section').classList.add('oculto');
    document.getElementById('app').classList.remove('oculto');
    document.getElementById('btn-logout').classList.remove('oculto');

    // Llamamos a la inicialización de toda la lógica de la app
    initializeMainApp(); 
}

function handleLogout() {
    currentUser = null;
    document.getElementById('app').classList.add('oculto');
    document.getElementById('btn-logout').classList.add('oculto');
    document.getElementById('login-section').classList.remove('oculto');
    
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error-message').classList.add('oculto');
}

function initAuth() {
    const loginButton = document.getElementById('btn-login');
    const logoutButton = document.getElementById('btn-logout');
    const passwordInput = document.getElementById('login-password');

    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    
    if(passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
}

// =========================================================================
// INICIALIZADOR PRINCIPAL DE LA APP (POST-LOGIN)
// =========================================================================
function initializeMainApp() {
    // Restauramos datos de sesión ANTES de renderizar
    restoreManualEdits();
    restoreCadenceSpec();
    
    // Inicializamos todos los módulos
    initThemeSwitcher();
    initEditableTitle();
    initApp(); // Calendario y navegación (incluye swipe)
    initLicenciasPanel();
    initCoordinatorTable();
    initTablon();
    initDocumentosPanel();
    initPeticiones();
    
    // Vinculamos botones de modales y otros controles
    const applyBtn = document.getElementById('btn-apply-cadence');
    const clearBtn = document.getElementById('btn-clear-cadence');
    if (applyBtn) applyBtn.addEventListener('click', () => openCadenceModal());
    if (clearBtn) clearBtn.addEventListener('click', () => clearCadencePrompt());
}


// =========================================================================
// MÓDULOS DE LA APP
// =========================================================================

function initThemeSwitcher() {
    const themeToggleButton = document.getElementById("btn-toggle-theme");
    const body = document.body;

    const applyTheme = (theme) => {
        body.dataset.theme = theme; 
        localStorage.setItem('turnapp_theme', theme);
        if (themeToggleButton) {
            themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    };
    
    const toggleTheme = () => {
        const newTheme = body.dataset.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    };

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
    
    const savedTheme = localStorage.getItem('turnapp_theme') || 'light';
    applyTheme(savedTheme);
}

function initEditableTitle() {
    const titleElement = document.getElementById('editable-title');
    if (!titleElement) return;

    const EDITABLE_TITLE_KEY = 'turnapp.editableTitle';
    const savedTitle = localStorage.getItem(EDITABLE_TITLE_KEY);
    if (savedTitle) {
        titleElement.textContent = savedTitle;
    }

    titleElement.addEventListener('blur', () => {
        const newTitle = titleElement.textContent.trim();
        localStorage.setItem(EDITABLE_TITLE_KEY, newTitle);
    });

    titleElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleElement.blur();
        }
    });
}

function initCoordinatorTable() {
    const tabla = document.getElementById("tabla-coordinador");
    if (!tabla) return;
    const thead = tabla.querySelector("thead");
    const tbody = tabla.querySelector("tbody");

    const KEYS = {
        TEXT: "tablaCoordinadorTextos",
        COLORS: "tablaCoordinadorColores",
        ROWS: "tablaCoordinadorFilas",
        COLS: "tablaCoordinadorColumnas",
        HEADERS: "tablaCoordinadorHeaders"
    };
    const DEFAULT_TURN_COLUMNS = [
        { id: 'th-m1', header: 'M¹' }, { id: 'th-t1', header: 'T¹' },
        { id: 'th-m2', header: 'M²' }, { id: 'th-t2', header: 'T²' },
        { id: 'th-n', header: 'N' }
    ];
    let tableState = {};

    function syncStateFromStorage() {
        let turnColumns;
        try {
            turnColumns = JSON.parse(localStorage.getItem(KEYS.COLS) || JSON.stringify(DEFAULT_TURN_COLUMNS));
            if (!Array.isArray(turnColumns)) throw new Error("La estructura de columnas está corrupta.");
        } catch (e) {
            console.error("Error al leer las columnas desde localStorage, se resetea a valores por defecto.", e);
            turnColumns = [...DEFAULT_TURN_COLUMNS];
            localStorage.setItem(KEYS.COLS, JSON.stringify(turnColumns));
        }

        tableState = {
            rowCount: parseInt(localStorage.getItem(KEYS.ROWS) || '18', 10),
            turnColumns: turnColumns,
            columnCount: 2 + turnColumns.length + 1,
            turnColumnIndices: Array.from({ length: turnColumns.length }, (_, i) => i + 2),
            texts: JSON.parse(localStorage.getItem(KEYS.TEXT) || '{}'),
            colors: JSON.parse(localStorage.getItem(KEYS.COLORS) || '{}'),
            headers: JSON.parse(localStorage.getItem(KEYS.HEADERS) || '{}')
        };
    }

    function renderColgroup() {
        let colgroup = tabla.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            tabla.insertBefore(colgroup, thead);
        }
        colgroup.innerHTML = '';

        const firstColWidth = 9;
        const secondColWidth = 18;
        const lastColWidth = 35;
        const totalTurnWidth = 100 - firstColWidth - secondColWidth - lastColWidth;
        const numTurnCols = tableState.turnColumns.length;
        const individualTurnWidth = numTurnCols > 0 ? totalTurnWidth / numTurnCols : 0;

        let colgroupHTML = `<col style="width: ${firstColWidth}%;"><col style="width: ${secondColWidth}%;">`;
        for (let i = 0; i < numTurnCols; i++) {
            colgroupHTML += `<col style="width: ${individualTurnWidth}%;">`;
        }
        colgroupHTML += `<col style="width: ${lastColWidth}%;">`;
        colgroup.innerHTML = colgroupHTML;
    }

    function renderHeaders() {
        if (!thead) return;
        thead.innerHTML = '';
        const row1 = thead.insertRow();
        const row2 = thead.insertRow();

        row1.innerHTML = '<th colspan="2">FUNCIONARIO/A</th>';
        const thCiclo = document.createElement('th');
        thCiclo.id = "th-ciclo";
        thCiclo.colSpan = tableState.turnColumns.length > 0 ? tableState.turnColumns.length : 1;
        thCiclo.contentEditable = true;
        thCiclo.className = "titulo-ciclo";
        thCiclo.innerText = tableState.headers['th-ciclo'] || 'CICLO';
        row1.appendChild(thCiclo);
        const thObservaciones = document.createElement('th');
        thObservaciones.colSpan = 1;
        thObservaciones.innerText = 'OBSERVACIONES';
        row1.appendChild(thObservaciones);

        row2.innerHTML = '<th>Nº</th><th>NOMBRE</th>';
        tableState.turnColumns.forEach(col => {
            const th = document.createElement('th');
            th.id = col.id;
            th.contentEditable = true;
            th.innerText = tableState.headers[col.id] || col.header;
            row2.appendChild(th);
        });
        const thCocina = document.createElement('th');
        thCocina.id = 'th-cocina';
        thCocina.contentEditable = true;
        thCocina.innerText = tableState.headers['th-cocina'] || 'COCINA';
        row2.appendChild(thCocina);
    }
    
    function initializeRow(row, rowIndex) {
        row.innerHTML = '';
        for (let cellIndex = 0; cellIndex < tableState.columnCount; cellIndex++) {
            const cell = document.createElement('td');
            const cellId = `r${rowIndex}-c${cellIndex}`;
            const isTurnoCell = tableState.turnColumnIndices.includes(cellIndex);
            
            cell.style.position = 'relative';
            const textEditor = document.createElement('div');
            textEditor.className = 'text-editor';
            textEditor.contentEditable = true;
            textEditor.innerText = tableState.texts[cellId] || '';
            cell.appendChild(textEditor);

            if (isTurnoCell) {
                textEditor.style.paddingBottom = '16px';
                if (tableState.colors[cellId]) {
                    cell.style.backgroundColor = tableState.colors[cellId];
                }
                const handle = document.createElement('button');
                handle.type = 'button';
                handle.title = 'Elegir color';
                handle.innerHTML = '&#9679;';
                
                handle.style.cssText = 'position:absolute; bottom:0; left:0; width:100%; height:14px; background:transparent; border:none; cursor:pointer; color:rgba(0,0,0,0.2); font-size:10px; line-height:14px; opacity:0.1; z-index:10;';
                handle.onmouseenter = () => handle.style.opacity = '0.6';
                handle.onmouseleave = () => handle.style.opacity = '0.1';

                handle.onclick = (ev) => {
                    ev.stopPropagation();
                    openColorPicker(handle, (color) => {
                        if (color === 'initial') {
                            cell.style.backgroundColor = '';
                            delete tableState.colors[cellId];
                        } else {
                            cell.style.backgroundColor = color;
                            tableState.colors[cellId] = color;
                        }
                        localStorage.setItem(KEYS.COLORS, JSON.stringify(tableState.colors));
                    });
                };
                cell.appendChild(handle);
            }
            row.appendChild(cell);
        }
    }

    function renderBody() {
        if (!tbody) return;
        tbody.innerHTML = '';
        for (let i = 0; i < tableState.rowCount; i++) {
            const row = tbody.insertRow();
            initializeRow(row, i);
        }
    }
    
    function fullTableRedraw() {
        syncStateFromStorage();
        renderColgroup();
        renderHeaders();
        renderBody();
    }

    function bindEvents() {
        thead.addEventListener('blur', (e) => {
            const target = e.target;
            if (target.tagName === 'TH' && target.isContentEditable && target.id) {
                tableState.headers[target.id] = target.innerText.trim();
                localStorage.setItem(KEYS.HEADERS, JSON.stringify(tableState.headers));
            }
        }, true);

        tbody.addEventListener("input", (e) => {
            const textEditor = e.target;
            if (!textEditor.classList.contains('text-editor')) return;
            const cell = textEditor.closest('td');
            const row = cell.closest('tr');
            if (!row || !cell) return;
            
            const rowIndex = row.rowIndex - thead.rows.length;
            const cellIndex = cell.cellIndex;
            const cellId = `r${rowIndex}-c${cellIndex}`;

            tableState.texts[cellId] = textEditor.innerText;
            localStorage.setItem(KEYS.TEXT, JSON.stringify(tableState.texts));
        });
        
        tbody.addEventListener("click", (e) => {
            if (e.target.closest('.color-handle')) return;
            const fila = e.target.closest("tr");
            if (fila && fila.parentElement === tbody) {
                Array.from(tbody.children).forEach(tr => tr.classList.remove("seleccionada"));
                fila.classList.add("seleccionada");
            }
        });

        const btnAddRow = document.getElementById('btn-add-row');
        const btnRemoveRow = document.getElementById('btn-remove-row');
        const btnAddCol = document.getElementById('btn-add-col');
        const btnRemoveCol = document.getElementById('btn-remove-col');
        const btnLimpiar = document.getElementById("limpiar-tabla");
        
        if (btnAddRow) btnAddRow.onclick = () => {
            tableState.rowCount++;
            localStorage.setItem(KEYS.ROWS, tableState.rowCount);
            const newRow = tbody.insertRow();
            initializeRow(newRow, tableState.rowCount - 1);
        };

        if (btnRemoveRow) btnRemoveRow.onclick = () => {
            if (tableState.rowCount > 0 && tbody.rows.length > 0) {
                const lastRowIndex = tableState.rowCount - 1;
                for (let i = 0; i < tableState.columnCount; i++) {
                    delete tableState.texts[`r${lastRowIndex}-c${i}`];
                    delete tableState.colors[`r${lastRowIndex}-c${i}`];
                }
                localStorage.setItem(KEYS.TEXT, JSON.stringify(tableState.texts));
                localStorage.setItem(KEYS.COLORS, JSON.stringify(tableState.colors));
                
                tbody.deleteRow(-1);
                tableState.rowCount--;
                localStorage.setItem(KEYS.ROWS, tableState.rowCount);
            }
        };

        if (btnAddCol) btnAddCol.onclick = () => {
            const newTurnName = prompt(`Introduce el nombre para la nueva columna:`, `T${tableState.turnColumns.length + 1}`);
            if (!newTurnName || newTurnName.trim() === '') return;
            
            const newColId = `th-custom-${Date.now()}`;
            tableState.turnColumns.push({ id: newColId, header: newTurnName.trim() });
            localStorage.setItem(KEYS.COLS, JSON.stringify(tableState.turnColumns));
            fullTableRedraw();
        };

        if (btnRemoveCol) btnRemoveCol.onclick = () => {
            if (tableState.turnColumns.length > 0) {
                if (!confirm("¿Seguro que quieres eliminar la última columna de turno?")) return;
                
                tableState.turnColumns.pop();
                localStorage.setItem(KEYS.COLS, JSON.stringify(tableState.turnColumns));
                fullTableRedraw();
            } else {
                alert("No hay columnas de turno que eliminar.");
            }
        };
        
        if (btnLimpiar) {
            const newBtn = btnLimpiar.cloneNode(true);
            btnLimpiar.parentNode.replaceChild(newBtn, btnLimpiar);
            newBtn.addEventListener("click", () => {
                if (confirm("¿Seguro que quieres borrar todos los textos y colores de la tabla?")) {
                    tableState.texts = {};
                    tableState.colors = {};
                    localStorage.removeItem(KEYS.TEXT);
                    localStorage.removeItem(KEYS.COLORS);
                    renderBody();
                }
            });
        }
    }

    fullTableRedraw();
    bindEvents();      
}

function initTablon() {
    const btnUpload = document.getElementById('btn-upload-file');
    const fileListContainer = document.getElementById('tablon-lista');
    const tablonPreviewContainer = document.getElementById('tablon-preview-container');
    const tablonPreviewImage = document.getElementById('tablon-preview-image');
    const fileInput = document.getElementById('file-input');
    const imageModal = document.getElementById('image-modal');
    const modalImageContent = document.getElementById('modal-image-content');
    const modalCloseBtn = imageModal ? imageModal.querySelector('.image-modal-close') : null;

    if (!btnUpload || !fileListContainer || !tablonPreviewContainer || !tablonPreviewImage || !fileInput || !imageModal || !modalImageContent || !modalCloseBtn) {
        return;
    }

    const TABLON_KEY = 'turnapp.tablon.files';

    function renderFiles() {
        const files = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
        fileListContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        if (files.length > 0 && files[0].type.startsWith('image/')) {
            tablonPreviewImage.src = files[0].data;
            tablonPreviewContainer.classList.remove('oculto');
        } else {
            tablonPreviewContainer.classList.add('oculto');
        }

        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'tablon-item';
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'tablon-item-info';

            const nameStrong = document.createElement('strong');
            nameStrong.className = 'tablon-item-name';
            nameStrong.textContent = file.name;
            nameStrong.contentEditable = true; 
            nameStrong.spellcheck = false;
            nameStrong.dataset.index = index;

            const metaSmall = document.createElement('small');
            metaSmall.className = 'tablon-item-meta';
            const uploadDate = new Date(file.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            metaSmall.textContent = `Subido: ${uploadDate} | ${(file.size / 1024).toFixed(1)} KB`;

            infoDiv.appendChild(nameStrong);
            infoDiv.appendChild(metaSmall);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'tablon-item-actions';
            actionsDiv.innerHTML = `
                <button class="view-btn modern-btn green" data-index="${index}" title="Ver">👁️</button>
                <button class="download-btn modern-btn" data-index="${index}" title="Descargar">📥</button>
                <button class="delete-btn modern-btn red" data-index="${index}" title="Eliminar">🗑️</button>
            `;

            fileItem.appendChild(infoDiv);
            fileItem.appendChild(actionsDiv);
            fragment.appendChild(fileItem);
        });
        fileListContainer.appendChild(fragment);
    }
    
    fileListContainer.addEventListener('blur', (event) => {
        if (event.target && event.target.classList.contains('tablon-item-name')) {
            const index = parseInt(event.target.dataset.index, 10);
            const newName = event.target.textContent.trim();
            
            const files = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
            if (files[index] && newName) {
                files[index].name = newName;
                localStorage.setItem(TABLON_KEY, JSON.stringify(files));
            } else {
                renderFiles();
            }
        }
    }, true);

    fileListContainer.addEventListener('keydown', (event) => {
        if (event.target && event.target.classList.contains('tablon-item-name') && event.key === 'Enter') {
            event.preventDefault();
            event.target.blur();
        }
    });

    btnUpload.addEventListener('click', () => {
        fileInput.value = null;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const fileData = { name: file.name, type: file.type, size: file.size, date: new Date().toISOString(), data: event.target.result };
            const files = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
            files.unshift(fileData);
            localStorage.setItem(TABLON_KEY, JSON.stringify(files));
            renderFiles();
        };
        reader.readAsDataURL(file);
    });

    fileListContainer.addEventListener('click', (event) => {
        const target = event.target;
        const index = target.closest('[data-index]')?.dataset.index;
        if (index === undefined) return;

        const files = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
        const file = files[index];

        if (target.classList.contains('view-btn')) {
            if (file.type.startsWith('image/')) {
                modalImageContent.src = file.data;
                imageModal.classList.remove('oculto');
            } else {
                fetch(file.data).then(res => res.blob()).then(blob => { window.open(URL.createObjectURL(blob), '_blank'); });
            }
        } else if (target.classList.contains('download-btn')) {
            const a = document.createElement('a');
            a.href = file.data;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres eliminar "${file.name}"?`)) {
                files.splice(index, 1);
                localStorage.setItem(TABLON_KEY, JSON.stringify(files));
                renderFiles();
            }
        }
    });

    tablonPreviewImage.addEventListener('click', () => {
        if (tablonPreviewImage.src && !tablonPreviewImage.src.endsWith('#')) {
            modalImageContent.src = tablonPreviewImage.src;
            imageModal.classList.remove('oculto');
        }
    });
    modalCloseBtn.addEventListener('click', () => { imageModal.classList.add('oculto'); });
    imageModal.addEventListener('click', (e) => { if (e.target === imageModal) { imageModal.classList.add('oculto'); } });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !imageModal.classList.contains('oculto')) { imageModal.classList.add('oculto'); } });

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
                        <div class="documento-file-info">
                            <strong class="documento-file-name">${file.name}</strong>
                            <small class="documento-file-meta">Subido: ${uploadDate}</small>
                        </div>
                        <div class="documento-file-actions">
                            <button class="doc-view-btn modern-btn green" data-category="${category}" data-index="${index}" title="Ver">👁️</button>
                            <button class="doc-download-btn modern-btn" data-category="${category}" data-index="${index}" title="Descargar">📥</button>
                            <button class="doc-delete-btn modern-btn red" data-category="${category}" data-index="${index}" title="Eliminar">🗑️</button>
                        </div>
                    `;
                    fragment.appendChild(fileItem);
                });
            }
            fileListContainer.appendChild(fragment);
        });
    }

    documentosSection.addEventListener('click', (event) => {
        const target = event.target;

        if (target.matches('.btn-upload-pdf')) {
            currentUploadCategory = target.dataset.category;
            pdfInput.value = null;
            pdfInput.click();
            return;
        }

        if (target.matches('.doc-view-btn')) {
            const category = target.dataset.category;
            const index = parseInt(target.dataset.index, 10);
            const file = loadDocs()[category][index];
            
            if (file && file.data) {
                if (window.innerWidth < 768) {
                    fetch(file.data).then(res => res.blob()).then(blob => { window.open(URL.createObjectURL(blob), '_blank'); });
                } else {
                    modalPdfContent.src = file.data;
                    pdfModal.classList.remove('oculto');
                }
            }
            return;
        }

        if (target.matches('.doc-download-btn')) {
            const category = target.dataset.category;
            const index = parseInt(target.dataset.index, 10);
            const file = loadDocs()[category][index];

            if (file && file.data) {
                const a = document.createElement('a');
                a.href = file.data;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            return;
        }

        if (target.matches('.doc-delete-btn')) {
            const category = target.dataset.category;
            const index = parseInt(target.dataset.index, 10);
            const docs = loadDocs();
            const file = docs[category][index];

            if (confirm(`¿Seguro que quieres eliminar "${file.name}"?`)) {
                docs[category].splice(index, 1);
                saveDocs(docs);
                renderDocs();
            }
            return;
        }
        
        const previewContainer = target.closest('.documento-preview-container');
        if (previewContainer) {
            const category = previewContainer.closest('.documento-card').dataset.category;
            const docs = loadDocs();
            if (docs[category] && docs[category].length > 0) {
                const lastFile = docs[category][0];
                if (window.innerWidth < 768) {
                    fetch(lastFile.data).then(res => res.blob()).then(blob => { window.open(URL.createObjectURL(blob), '_blank'); });
                } else {
                    modalPdfContent.src = lastFile.data;
                    pdfModal.classList.remove('oculto');
                }
            }
        }
    });

    pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUploadCategory) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const pdfData = event.target.result;
            
            const card = documentosSection.querySelector(`.documento-card[data-category="${currentUploadCategory}"]`);
            const overlayText = card.querySelector('.preview-text');
            if (overlayText) overlayText.textContent = 'Procesando...';

            const thumbnailData = await generatePdfThumbnail(pdfData);
            const docs = loadDocs();
            const newFileData = { name: file.name, size: file.size, date: new Date().toISOString(), data: pdfData, thumbnail: thumbnailData };

            docs[currentUploadCategory].unshift(newFileData);
            saveDocs(docs);
            renderDocs();
        };
        reader.readAsDataURL(file);
    });

    modalCloseBtn.addEventListener('click', () => pdfModal.classList.add('oculto'));
    pdfModal.addEventListener('click', (e) => {
        if (e.target === pdfModal) pdfModal.classList.add('oculto');
    });
    
    renderDocs();
}

function restoreManualEdits(){
  try {
    const raw = localStorage.getItem('turnapp.manualEdits');
    if (raw) manualEdits = JSON.parse(raw);
  } catch(e){
    manualEdits = {};
  }
}

function saveManualEdits(){
  try { localStorage.setItem('turnapp.manualEdits', JSON.stringify(manualEdits)); } catch(e){}
}

function initLicenciasPanel() {
    const licenciasContainer = document.getElementById('licencias-container');
    if (!licenciasContainer) return;

    const items = licenciasContainer.querySelectorAll('.licencia-item');
    const totalCargaEl = document.getElementById('total-carga');
    const totalConsumidosEl = document.getElementById('total-consumidos');
    const totalRestanEl = document.getElementById('total-restan');
    const LICENCIAS_KEY = 'turnapp.licenciasData.v3';

    function updateCalculations() {
        let totalCarga = 0;
        let totalConsumidos = 0;
        items.forEach(item => {
            const carga = parseInt(item.querySelector('.carga').value, 10) || 0;
            const consumidos = parseInt(item.querySelector('.consumidos').value, 10) || 0;
            const restanInput = item.querySelector('.restan');
            if (restanInput) restanInput.value = carga - consumidos;
            totalCarga += carga;
            totalConsumidos += consumidos;
        });
        if (totalCargaEl) totalCargaEl.value = totalCarga;
        if (totalConsumidosEl) totalConsumidosEl.value = totalConsumidos;
        if (totalRestanEl) totalRestanEl.value = totalCarga - totalConsumidos;
    }

    function saveState() {
        const state = {};
        items.forEach(item => {
            const tipo = item.dataset.tipo;
            if (tipo) {
                state[tipo] = {
                    carga: item.querySelector('.carga').value,
                    consumidos: item.querySelector('.consumidos').value,
                    color: item.querySelector('.licencia-color-handle').style.backgroundColor
                };
            }
        });
        localStorage.setItem(LICENCIAS_KEY, JSON.stringify(state));
    }

    function loadState() {
        const savedState = JSON.parse(localStorage.getItem(LICENCIAS_KEY) || '{}');
        items.forEach(item => {
            const tipo = item.dataset.tipo;
            if (tipo && savedState[tipo]) {
                item.querySelector('.carga').value = savedState[tipo].carga || 0;
                item.querySelector('.consumidos').value = savedState[tipo].consumidos || 0;
                const colorBtn = item.querySelector('.licencia-color-handle');
                if (colorBtn && savedState[tipo].color) {
                   colorBtn.style.backgroundColor = savedState[tipo].color;
                }
            }
        });
    }

    items.forEach(item => {
        const inputs = item.querySelectorAll('.carga, .consumidos');
        inputs.forEach(input => input.addEventListener('input', () => { updateCalculations(); saveState(); }));

        const colorHandle = item.querySelector('.licencia-color-handle');
        if (colorHandle) {
            const newHandle = colorHandle.cloneNode(true);
            colorHandle.parentNode.replaceChild(newHandle, colorHandle);
            newHandle.addEventListener('click', (ev) => {
                ev.stopPropagation();
                openColorPicker(newHandle, (color) => {
                    newHandle.style.backgroundColor = (color === 'initial') ? '' : color;
                    saveState();
                }, colorPalette);
            });
        }
    });

    loadState();
    updateCalculations();
}

const spanishHolidays = [
  { day:1, month:0 }, { day:6, month:0 }, { day:1, month:4 },
  { day:15, month:7 }, { day:12, month:9 }, { day:2, month:10 },
  { day:6, month:11 }, { day:8, month:11 }, { day:25, month:11 }
];

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

const colorPalette = [
  "#d87d00", "#4d9ef7", "#f7a64d", "#6fd773", "#e65252", "#c9c9c9", "#ff4d4d",
  "#ffa64d", "#ffd24d", "#85e085", "#4dd2ff", "#4d79ff", "#b84dff", "#ff4da6",
  "#a6a6a6", "#ffffff", "rgba(232,240,255,1)", "rgba(163,193,255,0.65)", "rgba(255,179,179,0.45)"
];

function initApp(){
  renderCalendar(currentMonth, currentYear);

  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  const calendarPanel = document.getElementById('calendar-panel');

  const goToNextMonth = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
  };

  const goToPrevMonth = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  };

  if(prevBtn) prevBtn.addEventListener('click', goToPrevMonth);
  if(nextBtn) nextBtn.addEventListener('click', goToNextMonth);

  if (calendarPanel) {
    let touchStartX = 0;
    calendarPanel.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    calendarPanel.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const swipeDistance = touchEndX - touchStartX;
        const swipeThreshold = 50; // Min pixels for swipe
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance < 0) { goToNextMonth(); } else { goToPrevMonth(); }
        }
    });
  }
}

function renderCalendar(month, year){
  const calendar = document.getElementById('calendar');
  if(!calendar) return;
  calendar.innerHTML = '';

  const variableHolidays = getVariableHolidays(year);
  const monthLabel = document.getElementById('monthLabel');
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio", "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  if(monthLabel) monthLabel.textContent = `${meses[month]} ${year}`;

  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0)? 6 : firstDay-1;

  const daysInMonth = new Date(year, month+1, 0).getDate();

  for(let i=0;i<firstDay;i++){
    calendar.appendChild(document.createElement('div')).className = 'day-cell empty';
  }

  for(let day=1; day<=daysInMonth; day++){
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const dateObj = new Date(year, month, day);
    const weekday = dateObj.getDay();
    if(weekday===6) cell.classList.add('saturday');
    if(weekday===0) cell.classList.add('sunday');

    const isFixedHoliday = spanishHolidays.some(h => h.day === day && h.month === month);
    const isVariableHoliday = variableHolidays.some(h => h.day === day && h.month === month);
    const isTodayHoliday = isFixedHoliday || isVariableHoliday;

    if (isTodayHoliday) cell.classList.add('holiday');

    const label = document.createElement('div');
    label.className = 'day-label';
    label.textContent = `${day}`;
    cell.appendChild(label);

    const wrapper = document.createElement('div');
    wrapper.className = 'shifts-wrapper';
    const row = document.createElement('div');
    row.className = 'shifts-row';

    row.appendChild(createShiftElement(year, month, day, 'M', isTodayHoliday));
    row.appendChild(createShiftElement(year, month, day, 'T', isTodayHoliday));
    wrapper.appendChild(row);
    wrapper.appendChild(createShiftElement(year, month, day, 'N', isTodayHoliday));
    
    cell.appendChild(wrapper);
    calendar.appendChild(cell);
  }

  if(cadenceData.length>0) applyCadenceRender(month, year);
}

function createShiftElement(year, month, day, shiftKey, isHoliday){
  const container = document.createElement('div');
  container.className = (shiftKey === 'N') ? 'shift-container night' : 'shift-container';

  const shift = document.createElement('div');
  shift.className = `shift-${shiftKey.toLowerCase()} shift-cell`;
  shift.contentEditable = true;
  shift.spellcheck = false;
  shift.dataset.shift = shiftKey;

  const dk = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  let defaultBg = '';
  const weekday = new Date(year, month, day).getDay();

  if (isHoliday || weekday === 0) {
      defaultBg = 'rgba(255,179,179,0.45)';
  } else if (weekday === 6) {
      defaultBg = 'rgba(163,193,255,0.65)';
  } else {
      defaultBg = '#e8f0ff';
  }
  shift.style.backgroundColor = defaultBg;
  shift.style.color = '#000';
  
  const defaultTextForShift = (sk) => sk;

  if(manualEdits[dk] && manualEdits[dk][shiftKey]){
    const obj = manualEdits[dk][shiftKey];
    shift.textContent = obj.text ?? defaultTextForShift(shiftKey);
    if(obj.color){
      shift.style.backgroundColor = obj.color;
      shift.dataset.userColor = 'true';
    }
    shift.dataset.edited = (String(obj.text ?? '').trim() !== defaultTextForShift(shiftKey)) ? 'true' : 'false';
  } else {
    shift.textContent = defaultTextForShift(shiftKey);
    shift.dataset.edited = 'false';
  }

  shift.addEventListener('blur', ()=> {
    const text = shift.textContent.trim();
    if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
    manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
    manualEdits[dk][shiftKey].text = text;
    saveManualEdits();
    shift.dataset.edited = (text !== defaultTextForShift(shiftKey)) ? 'true' : 'false';
  });

  shift.addEventListener('keypress', (e)=> { if(e.key === 'Enter'){ e.preventDefault(); shift.blur(); } });

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'color-handle';
  handle.title = 'Elegir color';
  handle.innerHTML = '●';
  handle.style.cssText = 'height:12px; width:24px; font-size:10px; opacity:0.28; background:transparent; border:none; cursor:pointer;';
  handle.addEventListener('mouseenter', ()=> handle.style.opacity = '0.6');
  handle.addEventListener('mouseleave', ()=> handle.style.opacity = '0.28');

  handle.addEventListener('click', (ev)=> {
    ev.stopPropagation();
    openColorPicker(handle, (color)=>{
      const isLight = ((c) => {
          if(!c || c === 'initial') return true;
          if(c.indexOf('rgb')===0){ const n = c.replace(/[^\\d,]/g,'').split(',').map(Number); return (0.2126*n[0] + 0.7152*n[1] + 0.0722*n[2]) > 200; }
          if(c[0]==='#'){ const [r,g,b] = [parseInt(c.substr(1,2),16), parseInt(c.substr(3,2),16), parseInt(c.substr(5,2),16)]; return (0.2126*r + 0.7152*g + 0.0722*b) > 200; }
          return true;
      })(color);
      shift.style.backgroundColor = color === 'initial' ? defaultBg : color;
      shift.style.color = isLight ? '#000' : '#fff';
      shift.dataset.userColor = color !== 'initial';
      if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
      manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
      manualEdits[dk][shiftKey].color = color === 'initial' ? undefined : color;
      saveManualEdits();
    }, colorPalette);
  });

  container.appendChild(shift);
  container.appendChild(handle);
  return container;
}

function openColorPicker(anchorEl, onSelect, palette = colorPalette){
  document.getElementById('color-picker-popup')?.remove();

  const popup = document.createElement('div');
  popup.id = 'color-picker-popup';
  popup.style.cssText = 'position:absolute; display:flex; flex-wrap:wrap; background:var(--panel-bg); border:1px solid var(--border-color); padding:6px; border-radius:6px; box-shadow:0 6px 18px rgba(0,0,0,0.12); z-index:10000; width:150px;';

  palette.forEach(color => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'palette-swatch';
    b.style.backgroundColor = color;
    b.onclick = (e)=> { e.stopPropagation(); onSelect(color); popup.remove(); };
    popup.appendChild(b);
  });
  
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'palette-swatch reset-btn';
  resetButton.innerHTML = '🔄';
  resetButton.title = 'Restaurar color original';
  resetButton.onclick = (e) => { e.stopPropagation(); onSelect('initial'); popup.remove(); };
  popup.appendChild(resetButton);

  document.body.appendChild(popup);

  const rect = anchorEl.getBoundingClientRect();
  popup.style.left = `${Math.min(rect.left + window.scrollX, window.innerWidth - 158)}px`;
  popup.style.top = `${rect.bottom + window.scrollY + 6}px`;

  const closeFn = (ev) => {
    if(!popup.contains(ev.target)) {
      popup.remove();
      document.removeEventListener('click', closeFn, true);
    }
  };
  setTimeout(()=> document.addEventListener('click', closeFn, true), 10);
}

function saveCadenceSpec(spec){
  try { localStorage.setItem('turnapp.cadenceSpec', JSON.stringify(spec)); } catch(e){}
}

function restoreCadenceSpec(){
  try {
    const raw = localStorage.getItem('turnapp.cadenceSpec');
    if(!raw) return;
    cadenceSpec = JSON.parse(raw);
    if(cadenceSpec && cadenceSpec.startISO && cadenceSpec.pattern) buildCadenceDataFromSpec();
  } catch(e){ cadenceSpec = null; }
}

function buildCadenceDataFromSpec(){
  if(!cadenceSpec || !cadenceSpec.startISO || !cadenceSpec.pattern) { cadenceData = []; return; }
  cadenceData = [];
  const start = new Date(cadenceSpec.startISO);
  for(let i=0;i<10000;i++){
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cadenceData.push({ date: d, type: cadenceSpec.pattern[i % cadenceSpec.pattern.length] });
  }
}

function applyCadenceRender(month, year) {
    document.querySelectorAll('.day-cell').forEach(cell => {
        const day = parseInt(cell.querySelector('.day-label')?.textContent, 10);
        if (isNaN(day)) return;

        const cellDate = new Date(year, month, day);
        const cd = cadenceData.find(c => c.date.toDateString() === cellDate.toDateString());

        ['M', 'T', 'N'].forEach(shiftKey => {
            const shiftEl = cell.querySelector(`.shift-${shiftKey.toLowerCase()}`);
            if (!shiftEl) return;

            const dk = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const edited = manualEdits[dk]?.[shiftKey]?.text !== undefined;
            const userColor = manualEdits[dk]?.[shiftKey]?.color !== undefined;

            if (cd) {
                const types = String(cd.type).split('/');
                const isCadenceShift = types.includes(shiftKey) || (types.includes('MT') && (shiftKey==='M'||shiftKey==='T')) || (types.includes('M/N') && (shiftKey==='M'||shiftKey==='N'));
                
                if (isCadenceShift && !edited && !userColor) {
                    shiftEl.style.backgroundColor = shiftKey === 'N' ? '#d87d00' : '#ffa94d';
                    shiftEl.style.color = shiftKey === 'N' ? '#fff' : '#000';
                    shiftEl.dataset.cadenceApplied = 'true';
                }
            } else if (shiftEl.dataset.cadenceApplied === 'true' && !edited && !userColor) {
                // This logic is now handled inside createShiftElement by default
                const isHoliday = cell.classList.contains('holiday') || cell.classList.contains('sunday');
                const isSaturday = cell.classList.contains('saturday');
                shiftEl.style.backgroundColor = isHoliday ? 'rgba(255,179,179,0.45)' : isSaturday ? 'rgba(163,193,255,0.65)' : '#e8f0ff';
                shiftEl.style.color = '#000';
                delete shiftEl.dataset.cadenceApplied;
            }
        });
    });
}

function openCadenceModal(){
  const overlay = document.getElementById('cadence-modal-overlay');
  const modal = document.getElementById('cadence-modal');
  if(!overlay || !modal) return;
  
  // Reset UI
  document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
  ['v1-options', 'v2-options', 'custom-section'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.style.display = 'none';
  });
  const cp = document.getElementById('custom-pattern'); if(cp) cp.value = '';
  const cs = document.getElementById('cadence-start'); if(cs) cs.value = '';

  // Populate from spec
  if(cadenceSpec){
    if(cs) cs.value = new Date(cadenceSpec.startISO).toLocaleDateString('es-ES', {year: 'numeric', month: '2-digit', day: '2-digit'});
    const btn = document.querySelector(`.modal-type-btn[data-type="${cadenceSpec.type}"]`);
    if(btn) {
        btn.classList.add('active');
        const sectionId = { 'V-1': 'v1-options', 'V-2': 'v2-options', 'Personalizada': 'custom-section' }[cadenceSpec.type];
        const section = document.getElementById(sectionId);
        if(section) section.style.display = 'block';

        if(cadenceSpec.type === 'V-1' && typeof cadenceSpec.v1Index !== 'undefined'){
            const r = document.querySelector(`input[name="v1opt"][value="${cadenceSpec.v1Index}"]`);
            if(r) r.checked = true;
        } else if (cadenceSpec.type === 'Personalizada' && cadenceSpec.pattern && cp){
            cp.value = cadenceSpec.pattern.join(',');
        }
    }
  }

  // Bind buttons
  document.querySelectorAll('.modal-type-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.dataset.type;
      document.getElementById('v1-options').style.display = (t==='V-1') ? 'block' : 'none';
      document.getElementById('v2-options').style.display = (t==='V-2') ? 'block' : 'none';
      document.getElementById('custom-section').style.display = (t==='Personalizada') ? 'block' : 'none';
    };
  });
  
  document.getElementById('close-cadence').onclick = () => { overlay.style.display = 'none'; };
  
  document.getElementById('apply-cadence-confirm').onclick = () => {
    const activeBtn = document.querySelector('.modal-type-btn.active');
    if(!activeBtn) return alert('Seleccione un tipo de cadencia.');
    const typ = activeBtn.dataset.type;
    const startStr = document.getElementById('cadence-start').value;
    if(!startStr) return alert('Introduce la fecha de inicio (DD/MM/AAAA).');
    const parts = startStr.split('/');
    if(parts.length !== 3) return alert('Formato de fecha incorrecto.');
    const start = new Date(parts[2], parts[1]-1, parts[0]);
    if(isNaN(start)) return alert('Fecha inválida.');

    let pattern;
    let spec = { type: typ, startISO: start.toISOString() };

    if(typ === 'V-1'){
      const r = document.querySelector('input[name="v1opt"]:checked');
      if(!r) return alert('Selecciona una opción de V-1.');
      const idx = parseInt(r.value,10);
      const v1options = [['M/T', 'L', 'M/T', 'N', 'L', 'L', 'L', 'L'], ['M/T', 'M/T', 'N', 'L', 'L', 'L', 'L', 'L'], ['T', 'M/T', 'M/N', 'L', 'L', 'L', 'L', 'L'], ['M/T', 'N', 'L', 'L', 'L'], ['T', 'M/N', 'L', 'L', 'L']];
      pattern = v1options[idx];
      spec.v1Index = idx;
    } else if(typ === 'V-2'){
      pattern = ['M/T', 'M/T', 'L', 'L', 'L', 'L'];
    } else if(typ === 'Personalizada'){
      pattern = document.getElementById('custom-pattern').value.split(',').map(s=>s.trim()).filter(Boolean);
      if(pattern.length === 0) return alert('Patrón inválido.');
    }
    
    spec.pattern = pattern;
    cadenceSpec = spec;
    saveCadenceSpec(cadenceSpec);
    buildCadenceDataFromSpec();
    renderCalendar(currentMonth, currentYear);
    overlay.style.display = 'none';
  };

  overlay.style.display = 'flex';
}

function clearCadencePrompt(){
  const startDateStr = prompt("Introduce la fecha desde la que quieres limpiar la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;
  const parts = startDateStr.split('/');
  if(parts.length!==3) return alert("Formato incorrecto");
  const startDate = new Date(parts[2], parts[1]-1, parts[0]);
  if(isNaN(startDate)) return alert("Fecha inválida");

  cadenceData = cadenceData.filter(cd => cd.date < startDate);
  if(cadenceSpec && new Date(cadenceSpec.startISO) >= startDate){
    cadenceSpec = null;
    localStorage.removeItem('turnapp.cadenceSpec');
  }
  renderCalendar(currentMonth, currentYear);
}

function initPeticiones() {
    const listaUsuario = document.getElementById('lista-peticiones-usuario');
    const peticionTexto = document.getElementById('peticion-texto');
    const enviarPeticionBtn = document.getElementById('enviar-peticion');
    const btnPeticiones = document.getElementById("btn-peticiones");
    const peticionesSection = document.getElementById("peticiones-section");

    if (!listaUsuario || !peticionTexto || !enviarPeticionBtn || !btnPeticiones || !peticionesSection) return;

    const KEY_USER = 'peticionesUsuario';
    const load = () => JSON.parse(localStorage.getItem(KEY_USER) || '[]');
    const save = (arr) => localStorage.setItem(KEY_USER, JSON.stringify(arr));

    function render() {
        const user = load();
        listaUsuario.innerHTML = '';
        user.forEach((p, idx) => {
            const li = document.createElement('li');
            li.className = 'peticion-item';
            const fechaHora = p.fecha ? `<div class="fecha-hora" style="font-size: 0.85em; opacity: 0.85;">${p.fecha}</div>` : '';
            li.innerHTML = `
                <div class="peticion-left"><div>${p.texto}</div>${fechaHora}</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="checkbox" class="peticion-visto" data-index="${idx}" ${p.visto ? 'checked' : ''} style="transform: scale(1.2);">
                    <button class="peticion-delete modern-btn red" title="Eliminar" data-index="${idx}">🗑️</button>
                </div>
            `;
            listaUsuario.appendChild(li);
        });
    }

    btnPeticiones.addEventListener("click", (e) => {
        e.preventDefault();
        const esVisible = peticionesSection.style.display === "block";
        peticionesSection.style.display = esVisible ? "none" : "block";
    });

    enviarPeticionBtn.addEventListener('click', () => {
        agregarPeticion(peticionTexto.value);
        peticionTexto.value = '';
    });

    listaUsuario.addEventListener('click', (e) => {
        const target = e.target;
        const index = target.closest('[data-index]')?.dataset.index;
        if (index === undefined) return;

        const u = load();
        if (target.matches('input.peticion-visto')) {
            u[index].visto = target.checked;
        } else if (target.matches('.peticion-delete')) {
            if (confirm(`¿Seguro que quieres eliminar esta petición?`)) {
                u.splice(index, 1);
            }
        } else {
            return; // No-op
        }
        save(u);
        render();
    });
    
    function agregarPeticion(textoRaw) {
        const texto = String(textoRaw || '').trim();
        if (!texto) return;
        const nueva = { texto, fecha: new Date().toLocaleString('es-ES'), visto: false };
        const u = load();
        u.unshift(nueva);
        save(u);
        render();
    }
    
    render();
}

// =========================================================================
// ARRANQUE PRINCIPAL DE LA APLICACIÓN
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Al cargar la página, solo se inicializa el sistema de autenticación.
  // El resto de la app (initializeMainApp) se llamará después de un login exitoso.
  initAuth();
});
// ------------------ FIN app.js ------------------
