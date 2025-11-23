// =================== app.js (Versión corregida y unificada) ===================
// Versión 1.2.1 - Unificado, corregido (sin duplicados), mantiene la misma lógica
// Mantén exactamente este archivo como reemplazo único para solucionar el error de sintaxis.

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

// ====================================================
// PEGADO COMPLETO PARA REEMPLAZAR initCoordinatorTable
// ====================================================
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

    // 2. FUNCIONES DE RENDERIZADO DEL DOM
    function renderColgroup() {
        let colgroup = tabla.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            tabla.insertBefore(colgroup, thead);
        }
        colgroup.innerHTML = '';

        // Definimos los anchos fijos para las columnas externas
        const firstColWidth = 9;  // Ancho para la columna "Nº"
        const secondColWidth = 18; // Ancho para la columna "NOMBRE"
        const lastColWidth = 35;   // Ancho para la columna "OBSERVACIONES"

        // Calculamos el espacio restante para las columnas de turno
        const totalTurnWidth = 100 - firstColWidth - secondColWidth - lastColWidth; // (50% en este caso)
        const numTurnCols = tableState.turnColumns.length;
        const individualTurnWidth = numTurnCols > 0 ? totalTurnWidth / numTurnCols : 0;

        // Generamos las etiquetas <col> con los anchos calculados
        let colgroupHTML = `<col style="width: ${firstColWidth}%;">`;
        colgroupHTML += `<col style="width: ${secondColWidth}%;">`;

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
            
            // --- CAMBIOS CLAVE AQUÍ ---
            // Opacidad base reducida de 0.5 a 0.1 para que sea casi imperceptible.
            handle.style.cssText = 'position:absolute; bottom:0; left:0; width:100%; height:14px; background:transparent; border:none; cursor:pointer; color:rgba(0,0,0,0.2); font-size:10px; line-height:14px; opacity:0.1; z-index:10;';
            // Al pasar el ratón, se hace más visible (pero no tanto como antes).
            handle.onmouseenter = () => handle.style.opacity = '0.6';
            // Al quitar el ratón, vuelve a ser casi imperceptible.
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
        renderColgroup(); // ¡NUEVA LLAMADA!
        renderHeaders();
        renderBody();
    }

    // 3. VINCULACIÓN DE EVENTOS (Se llama una sola vez)
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
            const newTurnName = prompt("Introduce el nombre para la nueva columna:", `T${tableState.turnColumns.length + 1}`);
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

    // 4. INICIALIZACIÓN
    fullTableRedraw();
    bindEvents();      
}

// ============================================================
// BLOQUE COMPLETO REEMPLAZANDO LA FUNCIÓN initTablon EXISTENTE
// ============================================================
function initTablon() {
    // --- 1. CAPTURA DE ELEMENTOS ---
    const btnUpload = document.getElementById('btn-upload-file');
    const fileListContainer = document.getElementById('tablon-lista');
    const tablonPreviewContainer = document.getElementById('tablon-preview-container');
    const tablonPreviewImage = document.getElementById('tablon-preview-image');
    const fileInput = document.getElementById('file-input');
    const imageModal = document.getElementById('image-modal');
    const modalImageContent = document.getElementById('modal-image-content');
    const modalCloseBtn = document.querySelector('.image-modal-close');

    // Validación de que todos los elementos necesarios existen
    if (!btnUpload || !fileListContainer || !tablonPreviewContainer || !tablonPreviewImage || !fileInput || !imageModal || !modalImageContent || !modalCloseBtn) {
        console.error("TurnApp Error: Faltan elementos del DOM para la funcionalidad del Tablón.");
        return;
    }

    const TABLON_KEY = 'turnapp.tablon.files';

    // --- 2. FUNCIÓN PARA PINTAR LA LISTA DE ARCHIVOS ---
    function renderFiles() {
        const files = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
        fileListContainer.innerHTML = ''; // Limpiar la lista actual
        const fragment = document.createDocumentFragment();

        // Lógica para mostrar la última imagen en la previsualización al cargar
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            tablonPreviewImage.src = files[0].data;
            tablonPreviewContainer.classList.remove('oculto');
        } else {
            tablonPreviewContainer.classList.add('oculto');
        }

        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'tablon-item';
            const uploadDate = new Date(file.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            // Se crean los botones con el atributo 'data-index' que tu código ya utiliza
            fileItem.innerHTML = `
                <div class="tablon-item-info">
                    <strong class="tablon-item-name">${file.name}</strong>
                    <small class="tablon-item-meta">Subido: ${uploadDate} | ${(file.size / 1024).toFixed(1)} KB</small>
                </div>
                <div class="tablon-item-actions">
                    <button class="view-btn modern-btn" data-index="${index}">Ver</button>
                    <button class="download-btn modern-btn" data-index="${index}">Descargar</button>
                    <button class="delete-btn modern-btn red" data-index="${index}">Eliminar</button>
                </div>
            `;
            fragment.appendChild(fileItem);
        });
        fileListContainer.appendChild(fragment);
    }

    // --- 3. LÓGICA DE SUBIDA DE ARCHIVOS ---
    btnUpload.addEventListener('click', () => {
        fileInput.value = null; // Permite subir el mismo archivo otra vez
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            // Usamos 'data' como clave para ser consistentes con tu código
            const fileData = { name: file.name, type: file.type, size: file.size, date: new Date().toISOString(), data: event.target.result };
            const files = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
            files.unshift(fileData); // Añadir al principio
            localStorage.setItem(TABLON_KEY, JSON.stringify(files));
            renderFiles(); // Volver a pintar todo
        };
        reader.readAsDataURL(file);
    });

    // --- 4. LÓGICA DE LOS BOTONES DE LA LISTA (MÉTODO DE EVENT DELEGATION) ---
    fileListContainer.addEventListener('click', (event) => {
        const target = event.target;
        const index = target.dataset.index;
        if (index === undefined) return; // Si el clic no fue en un botón con data-index, no hacer nada

        const files = JSON.parse(localStorage.getItem(TABLON_KEY) || '[]');
        const file = files[index];

        if (target.classList.contains('view-btn')) {
            // SI ES IMAGEN: Abrimos el MODAL
            if (file.type.startsWith('image/')) {
                modalImageContent.src = file.data;
                imageModal.classList.remove('oculto');
            } else {
            // SI NO ES IMAGEN (PDF, etc.): Abrimos en nueva pestaña (tu lógica original)
                const win = window.open("", "_blank");
                 if (file.type === 'application/pdf') {
                     win.document.write(`<iframe src="${file.data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                } else {
                    // Fallback para otros tipos de archivo
                     win.document.write(`<p>Contenido no visualizable directamente. Puede intentar descargarlo.</p>`);
                }
            }
        } else if (target.classList.contains('download-btn')) {
            const a = document.createElement('a');
            a.href = file.data;
            a.download = file.name;
            a.click();
        } else if (target.classList.contains('delete-btn')) {
            if (confirm(`¿Seguro que quieres eliminar "${file.name}"?`)) {
                files.splice(index, 1);
                localStorage.setItem(TABLON_KEY, JSON.stringify(files));
                renderFiles();
            }
        }
    });

    // --- 5. LÓGICA PARA ABRIR Y CERRAR EL MODAL ---
    tablonPreviewImage.addEventListener('click', () => {
        if (tablonPreviewImage.src && !tablonPreviewImage.src.endsWith('#')) {
            modalImageContent.src = tablonPreviewImage.src;
            imageModal.classList.remove('oculto');
        }
    });
    modalCloseBtn.addEventListener('click', () => { imageModal.classList.add('oculto'); });
    imageModal.addEventListener('click', (e) => { if (e.target === imageModal) { imageModal.classList.add('oculto'); } });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !imageModal.classList.contains('oculto')) { imageModal.classList.add('oculto'); } });

    // --- 6. LLAMADA INICIAL PARA PINTAR LOS ARCHIVOS ---
    renderFiles();
}

// ===================================================================
//      FUNCIÓN DEFINITIVA Y SEGURA PARA EL PANEL DE DOCUMENTOS (V5)
//    (Con Timeout para evitar que se quede bloqueado en "Procesando...")
// ===================================================================
function initDocumentosPanel() {
    const documentosSection = document.getElementById('documentos-section');
    if (!documentosSection) return;

    if (typeof pdfjsLib === 'undefined') {
        console.error("Error: La librería pdf.js no se ha podido cargar.");
        documentosSection.querySelectorAll('.btn-upload-pdf').forEach(btn => {
            btn.disabled = true;
            btn.textContent = "Error de Carga";
        });
        return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

    const pdfInput = document.getElementById('pdf-input');
    const pdfModal = document.getElementById('pdf-modal');
    const modalPdfContent = document.getElementById('modal-pdf-content');
    const modalCloseBtn = pdfModal.querySelector('.image-modal-close');

    const DOCS_KEY = 'turnapp.documentos.v2';
    const CATEGORIES = ['mes', 'ciclos', 'vacaciones', 'rotacion'];
    let currentUploadCategory = null;

    function loadDocs() { return JSON.parse(localStorage.getItem(DOCS_KEY) || '{}'); }
    function saveDocs(docs) { localStorage.setItem(DOCS_KEY, JSON.stringify(docs)); }
    
    async function generatePdfThumbnail(pdfDataUrl) {
        // El Promise.race es la clave. Compite la generación de la miniatura
        // contra un temporizador de 10 segundos. Lo que ocurra primero, gana.
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout procesando el PDF')), 10000);
        });

        const generationPromise = (async () => {
            const pdf = await pdfjsLib.getDocument(pdfDataUrl).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return canvas.toDataURL('image/jpeg', 0.8);
        })();

        return Promise.race([generationPromise, timeoutPromise]);
    }

    function renderDocs() {
        const docs = loadDocs();
        CATEGORIES.forEach(category => {
            const card = documentosSection.querySelector(`.documento-card[data-category="${category}"]`);
            if (!card) return;

            const imgPreview = card.querySelector('.documento-preview-img');
            const overlay = card.querySelector('.preview-overlay');
            const overlayText = overlay.querySelector('.preview-text');
            
            overlayText.textContent = 'No hay PDF';
            
            const docData = docs[category];
            if (docData && docData.thumbnail) {
                imgPreview.src = docData.thumbnail;
                imgPreview.style.display = 'block';
                overlay.style.display = 'none';
            } else {
                imgPreview.src = '';
                imgPreview.style.display = 'none';
                overlay.style.display = 'flex';
            }
        });
    }

    documentosSection.addEventListener('click', (event) => {
        const target = event.target.closest('button, .documento-preview-container');
        if (!target) return;

        if (target.matches('.btn-upload-pdf')) {
            currentUploadCategory = target.dataset.category;
            pdfInput.value = null;
            pdfInput.click();
        }

        if (target.matches('.btn-delete-pdf')) {
            const categoryToDelete = target.dataset.category;
            if (confirm(`¿Seguro que quieres eliminar el PDF de "${categoryToDelete}"?`)) {
                const docs = loadDocs();
                delete docs[categoryToDelete];
                saveDocs(docs);
                renderDocs();
            }
        }

        if (target.matches('.documento-preview-container')) {
            const category = target.closest('.documento-card').dataset.category;
            const docs = loadDocs();
            const docData = docs[category];
            if (docData && docData.data) {
                if (window.innerWidth < 768) {
                    fetch(docData.data).then(res => res.blob()).then(blob => {
                        window.open(URL.createObjectURL(blob), '_blank');
                    });
                } else {
                    modalPdfContent.src = docData.data;
                    pdfModal.classList.remove('oculto');
                }
            }
        }
    });

    pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUploadCategory) return;

        const card = documentosSection.querySelector(`.documento-card[data-category="${currentUploadCategory}"]`);
        const overlayText = card ? card.querySelector('.preview-text') : null;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const pdfData = event.target.result;
            
            if (overlayText) {
                card.querySelector('.overlay').style.display = 'flex';
                overlayText.textContent = 'Procesando...';
            }

            try {
                const thumbnailData = await generatePdfThumbnail(pdfData);
                const docs = loadDocs();
                docs[currentUploadCategory] = {
                    name: file.name,
                    date: new Date().toISOString(),
                    data: pdfData,
                    thumbnail: thumbnailData
                };
                saveDocs(docs);
            } catch (error) {
                console.error(error);
                alert('Error al procesar el PDF. El archivo puede estar dañado o la operación ha tardado demasiado tiempo.');
            } finally {
                // Esto se ejecuta siempre, tanto si hay éxito como si hay error.
                // Asegura que la interfaz nunca se quede bloqueada.
                renderDocs();
            }
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

        const colorHandle = item.querySelector('.licencia-color-handle');
        if (colorHandle) {
            // Prevenimos múltiples listeners
            const newHandle = colorHandle.cloneNode(true);
            colorHandle.parentNode.replaceChild(newHandle, colorHandle);

newHandle.addEventListener('click', (ev) => {
    ev.stopPropagation();
    openColorPicker(newHandle, (color) => {
        if (color === 'initial') {
            // Si se restaura, quitamos el color de fondo para volver al estado por defecto
            newHandle.style.backgroundColor = '';
        } else {
            // Si se elige un color, lo aplicamos
            newHandle.style.backgroundColor = color;
        }
        // En ambos casos, guardamos el nuevo estado (con o sin color)
        saveState();
    }, colorPalette);
});
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
  { day:1, month:0 }, { day:6, month:0 }, { day:3, month:3 }, { day:1, month:4 },
  { day:15, month:7 }, { day:12, month:9 }, { day:2, month:10 },
  { day:6, month:11 }, { day:8, month:11 }, { day:25, month:11 }
];

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

// ---------------- init / navegación ----------------
function initApp(){
  renderCalendar(currentMonth, currentYear);

  const prev = document.getElementById('prevMonth');
  const next = document.getElementById('nextMonth');
  if(prev) prev.addEventListener('click', ()=> {
    currentMonth--; if(currentMonth < 0){ currentMonth = 11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
  });
  if(next) next.addEventListener('click', ()=> {
    currentMonth++; if(currentMonth > 11){ currentMonth = 0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
  });
}

// ---------------- render calendario ----------------
function renderCalendar(month, year){
  const calendar = document.getElementById('calendar');
  if(!calendar) return;
  calendar.innerHTML = '';

  const monthLabel = document.getElementById('monthLabel');
  const meses = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];
  if(monthLabel) monthLabel.textContent = `${meses[month]} ${year}`;

  // Primer día del mes (lunes=0)
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

    if(spanishHolidays.some(h => h.day===day && h.month===month)){
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

    row.appendChild(createShiftElement(year, month, day, 'M'));
    row.appendChild(createShiftElement(year, month, day, 'T'));
    wrapper.appendChild(row);

    wrapper.appendChild(createShiftElement(year, month, day, 'N'));

    cell.appendChild(wrapper);
    calendar.appendChild(cell);
  }

  if(cadenceData.length>0){
    applyCadenceRender(month, year);
  }
}

// ---------------- crear turno ----------------
function createShiftElement(year, month, day, shiftKey){
  const container = document.createElement('div');
  container.className = (shiftKey === 'N') ? 'shift-container night' : 'shift-container';

  const shift = document.createElement('div');
  shift.className = `shift-${shiftKey.toLowerCase()} shift-cell`;
  shift.contentEditable = true;
  shift.spellcheck = false;
  shift.dataset.shift = shiftKey;

  const dk = dateKey(year, month, day);
  let defaultBg = '#e8f0ff';
  const weekday = new Date(year, month, day).getDay();
  if(weekday === 6) defaultBg = 'rgba(163,193,255,0.65)';
  if(weekday === 0 || spanishHolidays.some(h=>h.day===day && h.month===month)) defaultBg = 'rgba(255,179,179,0.45)';
  shift.style.backgroundColor = defaultBg;
  shift.style.color = '#000';

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

// ---------------- paleta ----------------
function bindLicenciaHandles(){
  const licenciaHandles = document.querySelectorAll('.licencia-color-handle');
  licenciaHandles.forEach(handle => {
    handle.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const item = handle.closest('.licencia-item');
      if(!item) return;
      openColorPicker(handle, (color) => {
        handle.style.backgroundColor = color;
        const tipo = item.dataset.tipo;
        const value = (item.querySelector('.cantidad-input')||{value:0}).value;
        saveLicenciaValue(tipo, value, color);
      }, colorPalette);
    });
  });

  const inputs = Array.from(document.querySelectorAll('.cantidad-input'));
  inputs.forEach(i=>i.addEventListener('input', ()=> {
    const item = i.closest('.licencia-item');
    const tipo = item.dataset.tipo;
    const colorBtn = item.querySelector('.licencia-color');
    saveLicenciaValue(tipo, i.value, colorBtn && colorBtn.style.backgroundColor);
    recalcLicenciasTotal();
  }));
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
  const listaAdmin = null; // ya no existe visualmente, pero mantenemos datos


  if (!listaUsuario || !peticionTexto || !enviarPeticionBtn){
    console.warn("initPeticiones: faltan elementos del DOM.");
    return;
  }

  const KEY_USER = 'peticionesUsuario';

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
      left.appendChild(textoDiv);

      if(p.fecha){
        const fechaDiv = document.createElement('div');
        fechaDiv.className = 'fecha-hora';
        fechaDiv.textContent = p.fecha;
        fechaDiv.style.fontSize = '0.85em';
        fechaDiv.style.opacity = '0.85';
        left.appendChild(fechaDiv);
      }

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '8px';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!p.visto;
      chk.addEventListener('change', () => {
        const u = load();
        u[idx].visto = chk.checked;
        save(u);
        render();
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
    const nueva = { texto, fecha: new Date().toLocaleString(), visto: false };
    const u = load();
    u.unshift(nueva);
    save(u);
    render();
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

  // ------------------ FIN app.js ------------------