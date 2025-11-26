// =========================================================================
// TurnApp v4.0 - Versión Estable (Single-User)
// =========================================================================
// Esta versión incluye todas las funcionalidades para un solo usuario,
// cálculo de festivos variables y correcciones de UI.
// Sirve como base para el futuro desarrollo multi-usuario.

/**
 * Gestiona el cambio de tema (claro/oscuro) y su persistencia en localStorage.
 */
function initThemeSwitcher() {
    const themeToggleButton = document.getElementById("btn-toggle-theme");
    const body = document.body;

    // Función que aplica el tema y actualiza el botón y localStorage
    const applyTheme = (theme) => {
        // Usamos un atributo 'data-theme' para poder usarlo en CSS
        body.dataset.theme = theme; 
        
        // Guardamos la preferencia para que no se pierda al recargar
        localStorage.setItem('turnapp_theme', theme);
        
        // Cambiamos el icono del botón para que refleje el estado actual
        if (themeToggleButton) {
            themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    };
    
    // Función que se ejecuta al hacer clic en el botón
    const toggleTheme = () => {
        // Comprobamos cuál es el tema actual y lo cambiamos
        const newTheme = body.dataset.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    };

    // Añadimos el "escuchador" de clics al botón
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }
    
    // Al cargar la app, aplicamos el tema guardado o el claro por defecto
    const savedTheme = localStorage.getItem('turnapp_theme') || 'light';
    applyTheme(savedTheme);
}

// =================================================================
// INICIO DEL NUEVO initCoordinatorTable v3.5 (INSERCIÓN SELECTIVA)
// =================================================================
function initCoordinatorTable() {
    const tabla = document.getElementById("tabla-coordinador");
    if (!tabla) return;
    const thead = tabla.querySelector("thead");
    const tbody = tabla.querySelector("tbody");

    // 1. ESTADO Y CLAVES
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
    let selectedRowIndex = -1; // ¡NUEVO! Para guardar la fila seleccionada

    function syncStateFromStorage() {
        let turnColumns;
        try {
            turnColumns = JSON.parse(localStorage.getItem(KEYS.COLS) || JSON.stringify(DEFAULT_TURN_COLUMNS));
            if (!Array.isArray(turnColumns)) throw new Error("Estructura de columnas corrupta.");
        } catch (e) {
            console.error("Error al leer columnas, reseteando a valores por defecto.", e);
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

    // 2. FUNCIONES DE RENDERIZADO (sin cambios significativos)
    function renderColgroup() {
        let colgroup = tabla.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            tabla.insertBefore(colgroup, thead);
        }
        colgroup.innerHTML = `<col style="width: 9%;"><col style="width: 18%;">`;
        const numTurnCols = tableState.turnColumns.length;
        const turnColWidth = numTurnCols > 0 ? (100 - 9 - 18 - 35) / numTurnCols : 0;
        for (let i = 0; i < numTurnCols; i++) {
            colgroup.innerHTML += `<col style="width: ${turnColWidth}%;">`;
        }
        colgroup.innerHTML += `<col style="width: 35%;">`;
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
        row1.innerHTML += '<th colspan="1">OBSERVACIONES</th>';

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
        row.dataset.rowIndex = rowIndex; // ¡NUEVO! Guardamos el índice en la fila
        for (let cellIndex = 0; cellIndex < tableState.columnCount; cellIndex++) {
            const cell = document.createElement('td');
            const cellId = `r${rowIndex}-c${cellIndex}`;
            const textEditor = document.createElement('div');
            textEditor.className = 'text-editor';
            textEditor.contentEditable = true;
            textEditor.innerText = tableState.texts[cellId] || '';
            cell.appendChild(textEditor);

            if (tableState.turnColumnIndices.includes(cellIndex)) {
                cell.style.position = 'relative';
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
                        cell.style.backgroundColor = (color === 'initial') ? '' : color;
                        tableState.colors[cellId] = (color === 'initial') ? undefined : color;
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
        selectedRowIndex = -1; // Reseteamos selección
    }

    function fullTableRedraw() {
        syncStateFromStorage();
        renderColgroup();
        renderHeaders();
        renderBody();
    }

    // 3. ¡NUEVAS FUNCIONES PARA MANIPULAR DATOS!
    function shiftData(fromIndex, direction) {
        const newTexts = {};
        const newColors = {};
        const numRows = tableState.rowCount;

        for (let r = 0; r < numRows; r++) {
            for (let c = 0; c < tableState.columnCount; c++) {
                const oldKey = `r${r}-c${c}`;
                let newRowIndex = r;

                if (direction === 'down' && r >= fromIndex) {
                    newRowIndex = r + 1;
                } else if (direction === 'up' && r > fromIndex) {
                    newRowIndex = r - 1;
                }

                if (r === fromIndex && direction === 'up') continue; // Saltamos la fila eliminada

                const newKey = `r${newRowIndex}-c${c}`;
                if (tableState.texts[oldKey] !== undefined) newTexts[newKey] = tableState.texts[oldKey];
                if (tableState.colors[oldKey] !== undefined) newColors[newKey] = tableState.colors[oldKey];
            }
        }
        tableState.texts = newTexts;
        tableState.colors = newColors;
        localStorage.setItem(KEYS.TEXT, JSON.stringify(tableState.texts));
        localStorage.setItem(KEYS.COLORS, JSON.stringify(tableState.colors));
    }

    // 4. VINCULACIÓN DE EVENTOS (MODIFICADA)
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
            const row = textEditor.closest('tr');
            const cell = textEditor.closest('td');
            if (!textEditor.classList.contains('text-editor') || !row || !cell) return;
            
            const rowIndex = row.dataset.rowIndex;
            const cellIndex = cell.cellIndex;
            const cellId = `r${rowIndex}-c${cellIndex}`;

            tableState.texts[cellId] = textEditor.innerText;
            localStorage.setItem(KEYS.TEXT, JSON.stringify(tableState.texts));
        });
        
        // ¡NUEVA LÓGICA DE SELECCIÓN!
        tbody.addEventListener("click", (e) => {
            if (e.target.closest('.color-handle')) return;
            const fila = e.target.closest("tr");
            if (fila && fila.parentElement === tbody) {
                Array.from(tbody.children).forEach(tr => tr.classList.remove("seleccionada"));
                fila.classList.add("seleccionada");
                selectedRowIndex = parseInt(fila.dataset.rowIndex, 10);
            }
        });

        const btnAddRow = document.getElementById('btn-add-row');
        const btnRemoveRow = document.getElementById('btn-remove-row');
        const btnAddCol = document.getElementById('btn-add-col');
        const btnRemoveCol = document.getElementById('btn-remove-col');
        const btnLimpiar = document.getElementById("limpiar-tabla");

        // ¡NUEVA LÓGICA PARA AÑADIR FILA!
        if (btnAddRow) btnAddRow.onclick = () => {
            const insertIndex = (selectedRowIndex !== -1) ? selectedRowIndex + 1 : tableState.rowCount;
            
            shiftData(insertIndex, 'down');
            tableState.rowCount++;
            localStorage.setItem(KEYS.ROWS, tableState.rowCount);
            
            // Redibujamos para mantener la consistencia de los datos
            renderBody();
        };

        // ¡NUEVA LÓGICA PARA QUITAR FILA!
        if (btnRemoveRow) btnRemoveRow.onclick = () => {
            if (selectedRowIndex === -1) {
                return alert("Por favor, selecciona una fila para eliminar.");
            }
            if (!confirm(`¿Seguro que quieres eliminar la fila ${selectedRowIndex + 1}?`)) {
                return;
            }

            shiftData(selectedRowIndex, 'up');
            tableState.rowCount--;
            localStorage.setItem(KEYS.ROWS, tableState.rowCount);

            // Redibujamos para mantener la consistencia
            renderBody();
        };

        if (btnAddCol) btnAddCol.onclick = () => {
            const newTurnName = prompt("Introduce el nombre para la nueva columna:", `T${tableState.turnColumns.length + 1}`);
            if (!newTurnName || newTurnName.trim() === '') return;
            tableState.turnColumns.push({ id: `th-custom-${Date.now()}`, header: newTurnName.trim() });
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
    
        // 5. INICIALIZACIÓN
        fullTableRedraw();
        bindEvents();      
    }
    

// =================================================================
//    VERSIÓN MEJORADA de initTablon (CON NOMBRE EDITABLE)
// =================================================================
function initTablon() {
    const btnUpload = document.getElementById('btn-upload-file');
    const fileListContainer = document.getElementById('tablon-lista');
    const tablonPreviewContainer = document.getElementById('tablon-preview-container');
    const tablonPreviewImage = document.getElementById('tablon-preview-image');
    const fileInput = document.getElementById('file-input');
    const imageModal = document.getElementById('image-modal');
    const modalImageContent = document.getElementById('modal-image-content');
    const modalCloseBtn = imageModal.querySelector('.image-modal-close');

    if (!btnUpload || !fileListContainer || !tablonPreviewContainer || !tablonPreviewImage || !fileInput || !imageModal || !modalImageContent || !modalCloseBtn) {
        console.error("TurnApp Error: Faltan elementos del DOM para la funcionalidad del Tablón.");
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
            // --- ¡CAMBIO 1! Hacemos el nombre editable ---
            nameStrong.contentEditable = true; 
            nameStrong.spellcheck = false;
            // Guardamos el índice en el propio elemento para encontrarlo al editar
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
    
    // --- ¡CAMBIO 2! Lógica para guardar el nombre editado ---
    fileListContainer.addEventListener('blur', (event) => {
        // Se activa cuando se deja de editar un nombre
        if (event.target && event.target.classList.contains('tablon-item-name')) {
            const index = parseInt(event.target.dataset.index, 10);
            const newName = event.target.textContent.trim();
            
            const files = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
            if (files[index] && newName) {
                files[index].name = newName;
                localStorage.setItem(TABLON_KEY, JSON.stringify(files));
                // Opcional: podrías volver a renderizar, pero no es estrictamente necesario
                // renderFiles(); 
            } else {
                // Si el nombre se deja en blanco, se restaura el original
                renderFiles();
            }
        }
    }, true); // Usamos 'true' (captura) para asegurar que el evento se gestione bien

    // --- ¡CAMBIO 3! Mejorar la experiencia de usuario con la tecla "Enter" ---
    fileListContainer.addEventListener('keydown', (event) => {
        if (event.target && event.target.classList.contains('tablon-item-name') && event.key === 'Enter') {
            event.preventDefault(); // Evita que se cree un salto de línea
            event.target.blur(); // Dispara el evento 'blur' para guardar
        }
    });

    // El resto de la función permanece igual...
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

// =================================================================
//    VERSIÓN MEJORADA de initDocumentosPanel (con ICONOS en botones)
// =================================================================
function initDocumentosPanel() {
    const documentosSection = document.getElementById('documentos-section');
    if (!documentosSection) return;

    // Configuración de PDF.js
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
    }

    const pdfInput = document.getElementById('pdf-input');
    const pdfModal = document.getElementById('pdf-modal');
    const modalPdfContent = document.getElementById('modal-pdf-content');
    const modalCloseBtn = pdfModal.querySelector('.image-modal-close');

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

                    // --- ¡CAMBIO AQUÍ! Usamos iconos en lugar de texto y añadimos un 'title' para accesibilidad ---
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

// Init
document.addEventListener('DOMContentLoaded', () => {
initApp();

  initThemeSwitcher();
  initEditableTitle();

  const applyBtn = document.getElementById('btn-apply-cadence');
  const clearBtn = document.getElementById('btn-clear-cadence');
  if (applyBtn) applyBtn.addEventListener('click', () => openCadenceModal());
  if (clearBtn) clearBtn.addEventListener('click', () => clearCadencePrompt());

   initLicenciasPanel();

  // restaurar persistencia de manualEdits y cadenceSpec
  restoreManualEdits();
  restoreCadenceSpec();

    initPeticiones();
    initCoordinatorTable();
    initTablon();
    initDocumentosPanel();
  });

// ---------------- estado ----------------
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = []; // array con {date: Date, type: string}
let cadenceSpec = null; // { type: 'V-1'|'V-2'|'Personalizada', startISO: '', pattern: [...], v1Index:0 }
let manualEdits = {}; // mapa "YYYY-MM-DD" -> { M: { text?, color?, userColor? }, T:..., N:... }

// ---------------- utilidades ----------------
function dateKey(year, month, day){
  const mm = String(month+1).padStart(2,'0');
  const dd = String(day).padStart(2,'0');
  return `${year}-${mm}-${dd}`;
}
function isColorLight(hex){
  if(!hex) return true;
  if(hex.indexOf('rgba')===0 || hex.indexOf('rgb')===0){
    const nums = hex.replace(/[^\d,]/g,'').split(',').map(n=>parseInt(n,10)||0);
    const [r,g,b] = nums;
    const lum = 0.2126*r + 0.7152*g + 0.0722*b;
    return lum > 200;
  }
  if(hex[0] !== '#') return true;
  const r = parseInt(hex.substr(1,2),16);
  const g = parseInt(hex.substr(3,2),16);
  const b = parseInt(hex.substr(5,2),16);
  const lum = 0.2126*r + 0.7152*g + 0.0722*b;
  return lum > 200;
}
function defaultTextFor(shiftKey){ return shiftKey; }

// =========================================================================
// INICIO DEL NUEVO BLOQUE DE LÓGICA
// =========================================================================

// 1. VERSIÓN LIMPIA DE restoreManualEdits (SOLO PARA CALENDARIO)
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

// 2. NUEVA FUNCIÓN CENTRALIZADA PARA EL PANEL DE LICENCIAS
function initLicenciasPanel() {
    const licenciasContainer = document.getElementById('licencias-container');
    if (!licenciasContainer) {
        console.error("Error: Contenedor de licencias no encontrado.");
        return;
    }

    const items = licenciasContainer.querySelectorAll('.licencia-item');
    const totalCargaEl = document.getElementById('total-carga');
    const totalConsumidosEl = document.getElementById('total-consumidos');
    const totalRestanEl = document.getElementById('total-restan');
    const LICENCIAS_KEY = 'turnapp.licenciasData.v3'; // Clave actualizada

    // Calcula y actualiza todos los valores derivados (restan, totales)
    function updateCalculations() {
        let totalCarga = 0;
        let totalConsumidos = 0;

        items.forEach(item => {
            const cargaInput = item.querySelector('.carga');
            const consumidosInput = item.querySelector('.consumidos');
            const restanInput = item.querySelector('.restan');

            const carga = parseInt(cargaInput.value, 10) || 0;
            const consumidos = parseInt(consumidosInput.value, 10) || 0;
            
            if (restanInput) restanInput.value = carga - consumidos;
            totalCarga += carga;
            totalConsumidos += consumidos;
        });

        if (totalCargaEl) totalCargaEl.value = totalCarga;
        if (totalConsumidosEl) totalConsumidosEl.value = totalConsumidos;
        if (totalRestanEl) totalRestanEl.value = totalCarga - totalConsumidos;
    }

    // Guarda el estado actual en localStorage
    function saveState() {
        const state = {};
        items.forEach(item => {
            const tipo = item.dataset.tipo;
            if (tipo) {
                const carga = item.querySelector('.carga').value;
                const consumidos = item.querySelector('.consumidos').value;
                const color = item.querySelector('.licencia-color-handle').style.backgroundColor;
                state[tipo] = { carga, consumidos, color };
            }
        });
        localStorage.setItem(LICENCIAS_KEY, JSON.stringify(state));
    }

    // Carga el estado desde localStorage
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

    // Vincula los eventos a los inputs y botones
    items.forEach(item => {
        const inputs = item.querySelectorAll('.carga, .consumidos');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                updateCalculations();
                saveState();
            });
        });
const colorCell = item.querySelector('.licencia-color-handle'); // Esta es la casilla de color
if (colorCell) {
    // Hacemos que la casilla sea un contenedor para nuestro "punto"
    colorCell.style.position = 'relative'; 
    colorCell.innerHTML = ''; // Limpiamos la casilla por si acaso

    // Creamos el "punto" (handle) que irá dentro
    const innerHandle = document.createElement('button');
    innerHandle.type = 'button';
    innerHandle.title = 'Elegir color';
    innerHandle.innerHTML = '●'; // El carácter del punto
    innerHandle.className = 'licencia-inner-handle'; // Le damos una clase para los estilos

    // Le asignamos el evento de clic al "punto"
    innerHandle.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // La paleta se abre anclada al "punto", pero cambia el color de la casilla contenedora
        openColorPicker(innerHandle, (color) => {
            const newColor = (color === 'initial') ? '' : color;
            colorCell.style.backgroundColor = newColor; // Aplicamos el color a la casilla
            saveState(); // Guardamos el estado (la función saveState() ya sabe leer este valor)
        }, colorPalette);
    });
    
    // Añadimos el "punto" dentro de la casilla de color
    colorCell.appendChild(innerHandle);
}

            });

    // Carga inicial
    loadState();
    updateCalculations();
}
// =========================================================================
// FIN DEL NUEVO BLOQUE DE LÓGICA
// =========================================================================

// =========================================================================
// LÓGICA PARA EL TÍTULO EDITABLE
// =========================================================================
function initEditableTitle() {
    const titleElement = document.getElementById('editable-title');
    if (!titleElement) return;

    const EDITABLE_TITLE_KEY = 'turnapp.editableTitle';

    // 1. Cargar el texto guardado al iniciar
    const savedTitle = localStorage.getItem(EDITABLE_TITLE_KEY);
    if (savedTitle) {
        titleElement.textContent = savedTitle;
    }

    // 2. Guardar el texto cuando el usuario deja de editar
    titleElement.addEventListener('blur', () => {
        const newTitle = titleElement.textContent.trim();
        localStorage.setItem(EDITABLE_TITLE_KEY, newTitle);
    });

    // 3. Evitar que 'Enter' cree un salto de línea y forzar guardado
    titleElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titleElement.blur();
        }
    });
}

// festivos nacionales (mes 0-11)
const spanishHolidays = [
  { day:1, month:0 }, { day:6, month:0 }, { day:1, month:4 },
  { day:15, month:7 }, { day:12, month:9 }, { day:2, month:10 },
  { day:6, month:11 }, { day:8, month:11 }, { day:25, month:11 }
];

// =========================================================================
// CÁLCULO DE FESTIVOS VARIABLES (SEMANA SANTA)
// =========================================================================

/**
 * Calcula los festivos que no tienen una fecha fija, como la Semana Santa.
 * Utiliza el algoritmo de Meeus/Jones/Butcher para encontrar el Domingo de Pascua.
 * @param {number} year - El año para el que se calcularán los festivos.
 * @returns {Array<{day: number, month: number}>} Un array de objetos con los festivos variables.
 */
function getVariableHolidays(year) {
    // Cálculo del Domingo de Pascua
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
    const month = Math.floor((h + l - 7 * m + 114) / 31); // Mes (3 = Marzo, 4 = Abril)
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    const easterSunday = new Date(year, month - 1, day);

    // El Viernes Santo es siempre 2 días antes del Domingo de Pascua.
    const goodFriday = new Date(easterSunday);
    goodFriday.setDate(easterSunday.getDate() - 2);
    
    // (Opcional) Jueves Santo es 3 días antes. Puedes añadirlo si lo necesitas.
    // const maundyThursday = new Date(easterSunday);
    // maundyThursday.setDate(easterSunday.getDate() - 3);

    const variableHolidays = [
        { day: goodFriday.getDate(), month: goodFriday.getMonth() }
        // { day: maundyThursday.getDate(), month: maundyThursday.getMonth() }
    ];
    
    return variableHolidays;
}

// paleta color
const colorPalette = [
  "#d87d00", // naranja oscuro noche
  "#4d9ef7", // azul garantizado
  "#f7a64d", // naranja probable
  "#6fd773", // verde descanso
  "#e65252", // rojo baja
  "#c9c9c9", // gris otros
  "#ff4d4d","#ffa64d","#ffd24d","#85e085","#4dd2ff",
  "#4d79ff","#b84dff","#ff4da6","#a6a6a6","#ffffff",
  "rgba(232,240,255,1)","rgba(163,193,255,0.65)","rgba(255,179,179,0.45)"
];

// ---------------- init / navegación (con swipe) ----------------
function initApp(){
  renderCalendar(currentMonth, currentYear);

  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');
  // Usamos el panel principal como área de detección para el swipe
  const calendarPanel = document.getElementById('content'); 

  // --- Lógica de navegación encapsulada ---
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

  // 1. Asignamos la lógica a los botones existentes
  if(prevBtn) prevBtn.addEventListener('click', goToPrevMonth);
  if(nextBtn) nextBtn.addEventListener('click', goToNextMonth);

  // 2. Añadimos la nueva lógica para el swipe
  if (calendarPanel) {
    let touchStartX = 0;
    let touchEndX = 0;

    calendarPanel.addEventListener('touchstart', e => {
        // Guardamos la coordenada X inicial del toque
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true }); // {passive: true} mejora el rendimiento del scroll

    calendarPanel.addEventListener('touchend', e => {
        // Guardamos la coordenada X final
        touchEndX = e.changedTouches[0].screenX;
        
        const swipeDistance = touchEndX - touchStartX;
        const swipeThreshold = 50; // Distancia mínima en píxeles para considerarlo un swipe

        // Comprobamos si el deslizamiento fue lo suficientemente largo
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance < 0) {
                // Si la distancia es negativa, el swipe fue hacia la izquierda (mes siguiente)
                goToNextMonth();
            } else {
                // Si la distancia es positiva, el swipe fue hacia la derecha (mes anterior)
                goToPrevMonth();
            }
        }
    });
  }
}

// =================================================================
//    renderCalendar (VERSIÓN CORREGIDA QUE PASA EL ESTADO FESTIVO)
// =================================================================
function renderCalendar(month, year){
  const calendar = document.getElementById('calendar');
  if(!calendar) return;
  calendar.innerHTML = '';

  const variableHolidays = getVariableHolidays(year);

  const monthLabel = document.getElementById('monthLabel');
  const meses = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];
  if(monthLabel) monthLabel.textContent = `${meses[month]} ${year}`;

  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0)? 6 : firstDay-1;

  const daysInMonth = new Date(year, month+1, 0).getDate();

  for(let i=0;i<firstDay;i++){
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell empty';
    calendar.appendChild(emptyCell);
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
    
    // --- ¡AJUSTE CLAVE AQUÍ! ---
    // Guardamos el resultado en una variable para usarlo en varios sitios.
    const isTodayHoliday = isFixedHoliday || isVariableHoliday;

    if (isTodayHoliday) {
      cell.classList.add('holiday');
    }

    const label = document.createElement('div');
    label.className = 'day-label';
    label.textContent = `${day}`;
    cell.appendChild(label);

    const wrapper = document.createElement('div');
    wrapper.className = 'shifts-wrapper';

    const row = document.createElement('div');
    row.className = 'shifts-row';

    // --- ¡Y PASAMOS EL RESULTADO A LA FUNCIÓN QUE CREA LOS TURNOS! ---
    row.appendChild(createShiftElement(year, month, day, 'M', isTodayHoliday));
    row.appendChild(createShiftElement(year, month, day, 'T', isTodayHoliday));
    wrapper.appendChild(row);

    wrapper.appendChild(createShiftElement(year, month, day, 'N', isTodayHoliday));
    // --- Fin de los cambios ---

    cell.appendChild(wrapper);
    calendar.appendChild(cell);
  }

  if(cadenceData.length>0){
    applyCadenceRender(month, year);
  }
}

// =================================================================
//    createShiftElement (VERSIÓN CORREGIDA CON LÓGICA DE FESTIVOS)
// =================================================================
function createShiftElement(year, month, day, shiftKey, isHoliday){
  const container = document.createElement('div');
  container.className = (shiftKey === 'N') ? 'shift-container night' : 'shift-container';

  const shift = document.createElement('div');
  shift.className = `shift-${shiftKey.toLowerCase()} shift-cell`;
  shift.contentEditable = true;
  shift.spellcheck = false;
  shift.dataset.shift = shiftKey;

  const dk = dateKey(year, month, day);
  let defaultBg = ''; // Lo inicializamos vacío
  const weekday = new Date(year, month, day).getDay();

  // --- ¡AJUSTE CLAVE AQUÍ! ---
  // Ahora usamos el parámetro 'isHoliday' para decidir el color de fondo.
  if (isHoliday || weekday === 0) { // Si es festivo (fijo o variable) O domingo
      defaultBg = 'rgba(255,179,179,0.45)'; // Color rosa festivo
  } else if (weekday === 6) { // Si es sábado
      defaultBg = 'rgba(163,193,255,0.65)'; // Color azul sábado
  } else { // Si es un día laboral normal
      defaultBg = '#e8f0ff'; // Color azul laboral
  }
  shift.style.backgroundColor = defaultBg;
  shift.style.color = '#000';

  // El resto de la lógica de la función para restaurar ediciones manuales no cambia...
  if(manualEdits[dk] && manualEdits[dk][shiftKey]){
    const obj = manualEdits[dk][shiftKey];
    if(obj.text !== undefined && obj.text !== null) shift.textContent = obj.text;
    else shift.textContent = defaultTextFor(shiftKey);
    if(obj.color){
      shift.style.backgroundColor = obj.color;
      shift.dataset.userColor = 'true';
    }
    if(obj.text !== undefined && obj.text !== null){
      shift.dataset.edited = (String(obj.text).trim() !== defaultTextFor(shiftKey)) ? 'true' : 'false';
    } else {
      shift.dataset.edited = 'false';
    }
  } else {
    shift.textContent = defaultTextFor(shiftKey);
    shift.dataset.edited = 'false';
  }

  shift.addEventListener('blur', ()=> {
    const text = shift.textContent.trim();
    saveShiftText(year, month, day, shiftKey, text);
    shift.dataset.edited = (text !== defaultTextFor(shiftKey)) ? 'true' : 'false';
  });
  shift.addEventListener('keypress', (e)=> {
    if(e.key === 'Enter'){ e.preventDefault(); shift.blur(); }
  });

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'color-handle';
  handle.title = 'Elegir color';
  handle.innerText = '●';
  handle.style.height = '12px';
  handle.style.width = '24px';
  handle.style.fontSize = '10px';
  handle.style.opacity = '0.28';
  handle.style.background = 'transparent';
  handle.style.border = 'none';
  handle.style.cursor = 'pointer';
  handle.addEventListener('mouseenter', ()=> handle.style.opacity = '0.6');
  handle.addEventListener('mouseleave', ()=> handle.style.opacity = '0.28');

  handle.addEventListener('click', (ev)=> {
    ev.stopPropagation();
    openColorPicker(handle, (color)=>{
      shift.style.backgroundColor = color;
      shift.style.color = isColorLight(color) ? '#000' : '#fff';
      shift.dataset.userColor = 'true';
      if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
      manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
      manualEdits[dk][shiftKey].color = color;
      manualEdits[dk][shiftKey].userColor = true;
      saveManualEdits();
    }, colorPalette);
  });

  container.appendChild(shift);
  container.appendChild(handle);
  return container;
}

// ---------------- guardar texto/color específicos ----------------
function saveShiftText(year, month, day, shiftKey, text){
  const dk = dateKey(year, month, day);
  if(!manualEdits[dk]) manualEdits[dk] = { M:{}, T:{}, N:{} };
  manualEdits[dk][shiftKey] = manualEdits[dk][shiftKey] || {};
  manualEdits[dk][shiftKey].text = text;
  saveManualEdits();
}


// =========================================================================
// PEGADO COMPLETO PARA REEMPLAZAR openColorPicker (LÍNEAS 683-725)
// =========================================================================
function openColorPicker(anchorEl, onSelect, palette = colorPalette){
  const existing = document.getElementById('color-picker-popup');
  if(existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'color-picker-popup';
  popup.style.position = 'absolute';
  popup.style.display = 'flex';
  popup.style.flexWrap = 'wrap';
  popup.style.background = 'var(--panel-bg)'; // Adaptado a tema
  popup.style.border = '1px solid var(--border-color)'; // Adaptado a tema
  popup.style.padding = '6px';
  popup.style.borderRadius = '6px';
  popup.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
  popup.style.zIndex = 10000;
  popup.style.width = '150px'; // Ancho fijo para que quepan bien

  // Añade las muestras de color
  palette.forEach(color => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'palette-swatch'; // Clase creada en CSS
    b.style.backgroundColor = color;
    b.addEventListener('click', (e)=> {
      e.stopPropagation();
      onSelect(color);
      popup.remove();
    });
    popup.appendChild(b);
  });
  
  // Añade el botón de restaurar
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'palette-swatch reset-btn'; // Clase creada en CSS
  resetButton.innerHTML = '🔄';
  resetButton.title = 'Restaurar color original';
  resetButton.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect('initial'); // Envía la señal 'initial'
      popup.remove();
  });
  popup.appendChild(resetButton);

  document.body.appendChild(popup);

  const rect = anchorEl.getBoundingClientRect();
  let left = rect.left + window.scrollX;
  let top = rect.bottom + window.scrollY + 6;
  const guessW = 180;
  if(left + guessW > window.scrollX + window.innerWidth) left = window.scrollX + window.innerWidth - guessW - 8;
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  const closeFn = (ev) => {
    if(!popup.contains(ev.target) && ev.target !== anchorEl) {
      popup.remove();
      document.removeEventListener('click', closeFn);
    }
  };
  setTimeout(()=> document.addEventListener('click', closeFn), 10);
}

// ---------------- persistencia/CADENCIA spec ----------------
function saveCadenceSpec(spec){
  try { localStorage.setItem('turnapp.cadenceSpec', JSON.stringify(spec)); } catch(e){}
}
function restoreCadenceSpec(){
  try {
    const raw = localStorage.getItem('turnapp.cadenceSpec');
    if(!raw) return;
    cadenceSpec = JSON.parse(raw);
    if(cadenceSpec && cadenceSpec.startISO && cadenceSpec.pattern){
      cadenceData = [];
      const start = new Date(cadenceSpec.startISO);
      for(let i=0;i<10000;i++){
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const type = cadenceSpec.pattern[i % cadenceSpec.pattern.length];
        cadenceData.push({ date: d, type: type });
      }
      renderCalendar(currentMonth, currentYear);
    }
  } catch(e){ cadenceSpec = null; }
}

// ------------------ CADENCIAS (modal) ------------------
function openCadenceModal(){
  const overlay = document.getElementById('cadence-modal-overlay');
  const modal = document.getElementById('cadence-modal');
  if(!overlay || !modal) return;

  document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
  const v1 = document.getElementById('v1-options');
  const v2 = document.getElementById('v2-options');
  const custom = document.getElementById('custom-section');
  if(v1) v1.style.display = 'none';
  if(v2) v2.style.display = 'none';
  if(custom) custom.style.display = 'none';
  const cp = document.getElementById('custom-pattern');
  if(cp) cp.value = '';
  const cs = document.getElementById('cadence-start');
  if(cs) cs.value = '';

  if(cadenceSpec){
    if(cs) cs.value = (new Date(cadenceSpec.startISO)).toLocaleDateString('es-ES');
    if(cadenceSpec.type === 'V-1'){
      const btn = document.querySelector('.modal-type-btn[data-type="V-1"]');
      if(btn) btn.classList.add('active');
      if(v1) v1.style.display = 'block';
      if(typeof cadenceSpec.v1Index !== 'undefined'){
        const r = document.querySelector(`input[name="v1opt"][value="${cadenceSpec.v1Index}"]`);
        if(r) r.checked = true;
      }
    } else if(cadenceSpec.type === 'V-2'){
      const btn = document.querySelector('.modal-type-btn[data-type="V-2"]');
      if(btn) btn.classList.add('active');
      if(v2) v2.style.display = 'block';
    } else if(cadenceSpec.type === 'Personalizada'){
      const btn = document.querySelector('.modal-type-btn[data-type="Personalizada"]');
      if(btn) btn.classList.add('active');
      if(custom) custom.style.display = 'block';
      if(cadenceSpec.pattern && cp) cp.value = cadenceSpec.pattern.join(',');
    }
  }

  document.querySelectorAll('.modal-type-btn').forEach(btn=>{
    btn.onclick = () => {
      document.querySelectorAll('.modal-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.dataset.type;
      if(v1) v1.style.display = (t==='V-1') ? 'block' : 'none';
      if(v2) v2.style.display = (t==='V-2') ? 'block' : 'none';
      if(custom) custom.style.display = (t==='Personalizada') ? 'block' : 'none';
    };
  });

  const closeBtn = document.getElementById('close-cadence');
  if(closeBtn) closeBtn.onclick = () => {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden','true');
  };

  const applyBtn = document.getElementById('apply-cadence-confirm');
  if(applyBtn) applyBtn.onclick = () => {
    const activeBtn = document.querySelector('.modal-type-btn.active');
    if(!activeBtn) return alert('Seleccione un tipo de cadencia.');
    const typ = activeBtn.dataset.type;
    const startStr = (document.getElementById('cadence-start')||{}).value;
    if(!startStr) return alert('Introduce la fecha de inicio (DD/MM/AAAA).');
    const parts = startStr.split('/');
    if(parts.length !== 3) return alert('Formato de fecha incorrecto.');
    const d = parseInt(parts[0],10), m = parseInt(parts[1],10)-1, y = parseInt(parts[2],10);
    const start = new Date(y,m,d);
    if(isNaN(start)) return alert('Fecha inválida.');

    if(typ === 'V-1'){
      const r = document.querySelector('input[name="v1opt"]:checked');
      if(!r) return alert('Selecciona una opción de V-1.');
      const idx = parseInt(r.value,10);
      const v1options = [
        ['M/T', 'L', 'M/T', 'N', 'L', 'L', 'L', 'L'],
        ['M/T', 'M/T', 'N', 'L', 'L', 'L', 'L', 'L'],
        ['T', 'M/T', 'M/N', 'L', 'L', 'L', 'L', 'L'],
        ['M/T', 'N', 'L', 'L', 'L'],
        ['T', 'M/N', 'L', 'L', 'L']
      ];
      const pattern = v1options[idx];
      cadenceSpec = { type: 'V-1', startISO: start.toISOString(), pattern: pattern, v1Index: idx };
      saveCadenceSpec(cadenceSpec);
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    } else if(typ === 'V-2'){
      const pattern = ['M/T', 'M/T', 'L', 'L', 'L', 'L'];
      cadenceSpec = { type: 'V-2', startISO: start.toISOString(), pattern: pattern };
      saveCadenceSpec(cadenceSpec);
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    } else if(typ === 'Personalizada'){
      const raw = (document.getElementById('custom-pattern')||{}).value;
      if(!raw) return alert('Introduce un patrón personalizado.');
      const pattern = raw.split(',').map(s=>s.trim()).filter(Boolean);
      if(pattern.length === 0) return alert('Patrón inválido.');
      cadenceSpec = { type: 'Personalizada', startISO: start.toISOString(), pattern: pattern };
      saveCadenceSpec(cadenceSpec);
      buildCadenceDataFromSpec();
      renderCalendar(currentMonth, currentYear);
    }
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden','true');
  };

  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden','false');
}

// construir cadenceData a partir de cadenceSpec
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

// Limpieza de cadencia desde fecha
function clearCadencePrompt(){
  const startDateStr = prompt("Introduce la fecha desde la que quieres limpiar la cadencia (DD/MM/AAAA):");
  if(!startDateStr) return;
  const parts = startDateStr.split('/');
  if(parts.length!==3) return alert("Formato incorrecto");
  const day = parseInt(parts[0],10), month = parseInt(parts[1],10)-1, year = parseInt(parts[2],10);
  const startDate = new Date(year, month, day);
  if(isNaN(startDate)) return alert("Fecha inválida");

  cadenceData = cadenceData.filter(cd => cd.date < startDate);

  if(cadenceSpec && new Date(cadenceSpec.startISO) >= startDate){
    cadenceSpec = null;
    try { localStorage.removeItem('turnapp.cadenceSpec'); } catch(e){}
  }
  renderCalendar(currentMonth, currentYear);
}

// ---------------- aplicar cadencia sobre DOM ----------------
function applyCadenceRender(month, year){
  const cells = document.querySelectorAll('.day-cell');
  if(!cells) return;

  const cadColorMT = '#ffa94d';
  const cadColorN = '#d87d00';

  cells.forEach(cell=>{
    const label = cell.querySelector('.day-label');
    if(!label) return;
    const parts = label.textContent.split(' ');
    const day = parseInt(parts[0],10);
    if(isNaN(day)) return;

    const cellDate = new Date(year, month, day);
    const cd = cadenceData.find(c=> c.date.getFullYear()===cellDate.getFullYear() &&
                                     c.date.getMonth()===cellDate.getMonth() &&
                                     c.date.getDate()===cellDate.getDate());

    const shiftM = cell.querySelector('.shift-m');
    const shiftT = cell.querySelector('.shift-t');
    const shiftN = cell.querySelector('.shift-n');

    function getFlagsForShift(shiftEl, shiftKey){
      const dk = dateKey(year, month, day);
      const saved = (manualEdits[dk] && manualEdits[dk][shiftKey]) ? manualEdits[dk][shiftKey] : {};
      const userColor = !!saved.color || shiftEl.dataset.userColor === 'true';
      let edited = false;
      if(saved.text !== undefined && saved.text !== null){
        edited = String(saved.text).trim() !== defaultTextFor(shiftKey);
      } else {
        edited = String(shiftEl.textContent || '').trim() !== defaultTextFor(shiftKey);
      }
      if(shiftEl.dataset.edited === 'true') edited = true;
      return { userColor, edited, savedText: saved.text, savedColor: saved.color };
    }

    function applyToShift(shiftEl, shiftKey, activeForCadence, cadenceColor){
      if(!shiftEl) return;
      const { userColor, edited } = getFlagsForShift(shiftEl, shiftKey);
      const allowCadence = !(userColor && edited);
      if(activeForCadence){
        if(allowCadence){
          shiftEl.style.backgroundColor = cadenceColor;
          shiftEl.style.color = (shiftKey === 'N') ? '#fff' : '#000';
          shiftEl.dataset.cadenceApplied = 'true';
        } else {
          shiftEl.dataset.cadenceApplied = 'false';
        }
      } else {
        if(allowCadence){
          if(shiftEl.dataset.cadenceApplied === 'true'){
            shiftEl.style.backgroundColor = '';
            shiftEl.style.color = '#000';
            shiftEl.dataset.cadenceApplied = 'false';
          }
        }
      }
    }

    if(cd){
      const types = String(cd.type).split('/');
      applyToShift(shiftM,'M', types.includes('M') || types.includes('MT'), cadColorMT);
      applyToShift(shiftT,'T', types.includes('T') || types.includes('MT'), cadColorMT);
      applyToShift(shiftN,'N', types.includes('N') || types.includes('M/N'), cadColorN);
    } else {
      [['M',shiftM],['T',shiftT],['N',shiftN]].forEach(([k,el])=>{
        if(!el) return;
        if(el.dataset.cadenceApplied === 'true'){
          el.style.backgroundColor = '';
          el.style.color = '#000';
          el.dataset.cadenceApplied = 'false';
        }
      });
    }
  });
}

// ------------------ MÓDULO PETICIONES (solo usuario, sin duplicar) ------------------
function initPeticiones(){
  const listaUsuario = document.getElementById('lista-peticiones-usuario');
  const peticionTexto = document.getElementById('peticion-texto');
  const enviarPeticionBtn = document.getElementById('enviar-peticion');
  // Ajustamos el tamaño de la fuente para mejorar la legibilidad al escribir
  peticionTexto.style.fontSize = '1.3em';
  peticionTexto.style.lineHeight = '1.5';
  const listaAdmin = null; // ya no existe visualmente, pero mantenemos datos


  if (!listaUsuario || !peticionTexto || !enviarPeticionBtn){
    console.warn("initPeticiones: faltan elementos del DOM.");
    return;
  }

  const KEY_USER = 'turnapp.peticiones.usuario';

  function load(){
  return JSON.parse(localStorage.getItem(KEY_USER) || '[]');
}

  function save(arr){
    localStorage.setItem(KEY_USER, JSON.stringify(arr));
  }

  function render(){
    const user = load();
    listaUsuario.innerHTML = '';
    user.forEach((p, idx) => {
      const li = document.createElement('li');
      li.className = 'peticion-item';

      const left = document.createElement('div');
      left.className = 'peticion-left';

      const textoDiv = document.createElement('div');
      textoDiv.textContent = p.texto;
      // Aumentamos el tamaño de la fuente para las peticiones en la lista
      textoDiv.style.fontSize = '1.1em';
      textoDiv.style.lineHeight = '1.4';
      left.appendChild(textoDiv);

      if(p.fechaHora){
        const fechaDiv = document.createElement('div');
        fechaDiv.className = 'fecha-hora';
        fechaDiv.textContent = new Date(p.fechaHora).toLocaleString('es-ES');
        fechaDiv.style.fontSize = '0.85em';
        fechaDiv.style.opacity = '0.85';
        left.appendChild(fechaDiv);
      }

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '8px';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!p.revisada;
      chk.addEventListener('change', () => {
        const u = load();
        u[idx].revisada = chk.checked;
        save(u);
        render();

    // ¡Llamamos al sistema de notificaciones para que se actualice!
    if (window.TurnApp && window.TurnApp.checkAndDisplayNotifications) {
    window.TurnApp.checkAndDisplayNotifications();
}
   });

      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', ()=> {
        const u = load();
        u.splice(idx,1);
        save(u);
        render();
      });

      right.appendChild(chk);
      right.appendChild(delBtn);

      li.appendChild(left);
      li.appendChild(right);
      listaUsuario.appendChild(li);
    });
  }

  function agregarPeticion(textoRaw){
    const texto = String(textoRaw || '').trim();
    if(!texto) return;
    const nueva = { texto, fechaHora: new Date().toISOString(), revisada: false };
    const u = load();
    u.unshift(nueva);
    save(u);
    render();
   // ¡Llamamos al sistema de notificaciones!
             if (window.TurnApp && window.TurnApp.checkAndDisplayNotifications) { // <-- AÑADIR ESTE BLOQUE
                 window.TurnApp.checkAndDisplayNotifications();
             }
  }

  enviarPeticionBtn.addEventListener('click', ()=> {
    agregarPeticion(peticionTexto.value);
    peticionTexto.value = '';
  });

  render();
}

// === CONTROL FINAL DE BOTÓN DE PETICIONES (versión calendario siempre visible) ===
document.addEventListener("DOMContentLoaded", () => {
  const btnPeticiones = document.getElementById("btn-peticiones");
  const peticionesSection = document.getElementById("peticiones-section");

  if (!btnPeticiones || !peticionesSection) {
    console.warn("No se encuentran los elementos necesarios para el control de Peticiones.");
    return;
  }

  // Estado inicial: el cajón de peticiones oculto
  peticionesSection.classList.add("oculto");
  peticionesSection.style.display = "none";

  // Función central: alternar sólo el cajón de peticiones
  const togglePeticiones = () => {
    const visible = !peticionesSection.classList.contains("oculto") && 
                    peticionesSection.style.display !== "none";

    if (visible) {
      // 🔹 Oculta el cajón de peticiones
      peticionesSection.classList.add("oculto");
      peticionesSection.style.display = "none";
    } else {
      // 🔹 Muestra el cajón de peticiones
      peticionesSection.classList.remove("oculto");
      peticionesSection.style.display = "block";
      peticionesSection.removeAttribute("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  btnPeticiones.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePeticiones();
  });
});
// === CONTROL FINAL Y DEFINITIVO DE BOTÓN "PETICIONES" ===
document.addEventListener("DOMContentLoaded", () => {
  const btnPeticiones = document.getElementById("btn-peticiones");
  const peticionesSection = document.getElementById("peticiones-section");

  if (!btnPeticiones || !peticionesSection) {
    console.warn("No se encuentran los elementos necesarios para el control de Peticiones.");
    return;
  }

  // Estado inicial: peticiones ocultas
  peticionesSection.classList.add("oculto");
  peticionesSection.style.display = "none";

  btnPeticiones.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const visible = peticionesSection.style.display !== "none" && !peticionesSection.classList.contains("oculto");

    if (visible) {
      // 🔹 Oculta el cajón de peticiones
      peticionesSection.classList.add("oculto");
      peticionesSection.style.display = "none";
    } else {
      // 🔹 Muestra el cajón de peticiones
      peticionesSection.classList.remove("oculto");
      peticionesSection.style.display = "block";
    }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  const splash = document.getElementById("splash");
  const app = document.getElementById("app");
  const logo = document.getElementById("splash-logo");

  const calendarioSection = document.getElementById("calendar-panel");
  const licenciasSection = document.getElementById("licencias-container");

  // Estado inicial: solo splash visible
  app.classList.add("oculto");
  calendarioSection.classList.add("oculto");
  licenciasSection.classList.add("oculto");

logo.addEventListener("click", () => {
    // Oculta splash y muestra app
    splash.remove();
    app.classList.remove("oculto");

    // Mostrar solo el calendario
    calendarioSection.classList.remove("oculto");
    licenciasSection.classList.add("oculto");

    // Animación
    calendarioSection.classList.add("fade-in-up");

    // ¡LA SOLUCIÓN! Desplazar suave al inicio de TODA LA APP
    setTimeout(() => {
      app.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50); // Un timeout más corto para que se sienta más instantáneo
   });
  });

/* ================================================================= */
/*           MÓDULO DE NOTIFICACIONES VISUALES (PUNTO ROJO)          */
/* ================================================================= */

function initNotificationManager() {
    // 1. --- CLAVES y SELECTORES (AÑADIMOS PETICIONES) ---
    const SEEN_FILES_KEY = 'turnapp.seenFiles.v1';
    const TABLON_KEY = 'turnapp.tablon.files';
    const DOCS_KEY = 'turnapp.documentos.v3';
    const PETICIONES_KEY = 'turnapp.peticiones.usuario'; // Clave existente de peticiones

    const navTablon = document.querySelector('.nav-btn[data-section="tablon"]');
    const navDocs = document.querySelector('.nav-btn[data-section="documentos"]');
    const navPeticiones = document.querySelector('.nav-btn[data-section="peticiones"]'); // <-- NUEVO

    if (!navTablon || !navDocs || !navPeticiones) {
        console.error("NotificationManager: No se encontraron los botones de navegación.");
        return;
    }

    // 2. --- FUNCIONES DE ESTADO (MÁS SEGURAS) ---
    function getSeenFiles() {
        try {
            const data = JSON.parse(localStorage.getItem(SEEN_FILES_KEY) || '[]');
            return Array.isArray(data) ? data : [];
        } catch (e) { return []; }
    }

    function saveSeenFiles(seenFiles) {
        try {
            localStorage.setItem(SEEN_FILES_KEY, JSON.stringify(seenFiles));
        } catch (e) { console.error("Error al guardar 'seenFiles'", e); }
    }
    
    function getFileId(file) {
        return (file && file.name && file.date) ? `${file.name}|${file.date}` : null;
    }

    // 3. --- LÓGICA DE COMPROBACIÓN (CON PETICIONES) ---
    function hasUnseenTablonFiles() {
        try {
            const files = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
            if (!Array.isArray(files) || files.length === 0) return false;
            const seen = getSeenFiles();
            return files.some(f => { const id = getFileId(f); return id && !seen.includes(id); });
        } catch (e) { return false; }
    }

    function hasUnseenDocsFiles() {
        try {
            const data = JSON.parse(localStorage.getItem(DOCS_KEY) || '{}');
            if (typeof data !== 'object' || data === null) return false;
            const seen = getSeenFiles();
            for (const category in data) {
                const files = data[category];
                if (Array.isArray(files) && files.some(f => { const id = getFileId(f); return id && !seen.includes(id); })) {
                    return true;
                }
            }
        } catch (e) { return false; }
        return false;
    }

    // ¡NUEVA FUNCIÓN PARA PETICIONES!
    function hasUnseenPeticiones() {
        try {
            const peticiones = JSON.parse(localStorage.getItem(PETICIONES_KEY) || '[]');
            if (!Array.isArray(peticiones)) return false;
            // Comprueba si alguna petición tiene el flag 'visto' en false.
            return peticiones.some(p => p.visto === false);
        } catch (e) {
            return false;
        }
    }

    // 4. --- ACTUALIZACIÓN DE LA INTERFAZ (CON PETICIONES) ---
    function checkAndDisplayNotifications() {
        navTablon.classList.toggle('has-notification', hasUnseenTablonFiles());
        navDocs.classList.toggle('has-notification', hasUnseenDocsFiles());
        navPeticiones.classList.toggle('has-notification', hasUnseenPeticiones()); // <-- NUEVO
    }

    // 5. --- EVENTOS Y EJECUCIÓN (CON PETICIONES) ---
    function markSectionAsSeen(section) {
        if (section === 'tablon' || section === 'documentos') {
            let filesToMark = [];
            try {
                if (section === 'tablon') {
                    const data = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
                    if(Array.isArray(data)) filesToMark = data;
                } else {
                    const data = JSON.parse(localStorage.getItem(DOCS_KEY) || '{}');
                    if (typeof data === 'object' && data !== null) filesToMark = Object.values(data).flat();
                }
            } catch(e) { return; }
            
            if (filesToMark.length > 0) {
                const seen = getSeenFiles();
                const newSeen = new Set(seen);
                filesToMark.forEach(f => { const id = getFileId(f); if (id) newSeen.add(id); });
                saveSeenFiles(Array.from(newSeen));
            }
        } else if (section === 'peticiones') {
    // --- ANULADO ---
    // Ya no marcamos todas las peticiones como vistas al entrar.
    // El estado 'visto' ahora solo se controla manualmente con el checkbox.
}
        checkAndDisplayNotifications();
    }

    navTablon.addEventListener('click', () => markSectionAsSeen('tablon'));
    navDocs.addEventListener('click', () => markSectionAsSeen('documentos'));
    navPeticiones.addEventListener('click', () => markSectionAsSeen('peticiones')); // <-- NUEVO
    
    checkAndDisplayNotifications();

    // Hacemos la función de chequeo global para poder llamarla desde otros módulos
    window.TurnApp = window.TurnApp || {};
    window.TurnApp.checkAndDisplayNotifications = checkAndDisplayNotifications;

    // Escucha global para cambios en otras pestañas (útil si la app crece)
    window.addEventListener('storage', checkAndDisplayNotifications);
}

document.addEventListener('DOMContentLoaded', initNotificationManager);

  // ------------------ FIN app.js ------------------