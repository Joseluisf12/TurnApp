// =========================================================================
// TurnApp v7.0 - Versión Estable
// =========================================================================
// Esta versión incluye todas las funcionalidades para un solo usuario,
// cálculo de festivos variables y correcciones de UI.
// Sirve como base para el futuro desarrollo multi-usuario.

// =========================================================================
// GESTOR DE TEMA (CLARO/OSCURO) SINCRONIZADO CON FIREBASE (v3 - Corregido)
// =========================================================================
async function initThemeSwitcher() {
    const themeToggleButton = document.getElementById("btn-toggle-theme");
    const body = document.body;
    if (!themeToggleButton) return;

    // 1. Referencia al documento del usuario en Firestore
    const db = firebase.firestore();
    if (!AppState.userId) {
        console.error("ThemeSwitcher: No se pudo obtener el ID de usuario. Usando tema por defecto.");
        body.dataset.theme = 'light';
        themeToggleButton.textContent = '🌙';
        return;
    }
    const userDocRef = db.collection('userData').doc(AppState.userId);

    // Función interna que aplica el tema usando el atributo 'data-theme'
    const applyThemeToUI = (theme) => {
        body.dataset.theme = theme;
        themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
    };

    // 2. Carga inicial del tema al arrancar la app
    try {
        const doc = await userDocRef.get();
        const initialTheme = (doc.exists && doc.data().theme) ? doc.data().theme : 'light';
        applyThemeToUI(initialTheme);
    } catch (error) {
        console.error("Error en la carga inicial del tema:", error);
        applyThemeToUI('light'); // Fallback a tema claro
    }

    // 3. Escuchamos en tiempo real para cambios posteriores (desde otros dispositivos)
    userDocRef.onSnapshot(snapshot => {
        if (snapshot.exists && snapshot.data().theme) {
            // Solo actualizamos si el tema en la DB es diferente al que ya se muestra
            if (body.dataset.theme !== snapshot.data().theme) {
                applyThemeToUI(snapshot.data().theme);
            }
        }
    });

    // 4. Al hacer clic, damos respuesta inmediata y guardamos en Firestore
    themeToggleButton.addEventListener('click', () => {
        const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
        // Primero, actualizamos la UI localmente para una respuesta instantánea
        applyThemeToUI(newTheme);
        // Segundo, guardamos el cambio en Firestore para sincronizarlo
        userDocRef.set({ theme: newTheme }, { merge: true }).catch(error => {
            console.error("No se pudo guardar la preferencia de tema:", error);
        });
    });
}

// =========================================================================
// HABILITAR PERSISTENCIA OFFLINE DE FIRESTORE
// =========================================================================
firebase.firestore().enablePersistence()
    .then(() => {
        console.log("Soporte offline de Firestore habilitado con éxito.");
    })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn("Soporte offline no habilitado. Solo se puede activar en una pestaña a la vez.");
        } else if (err.code == 'unimplemented') {
            console.warn("Soporte offline no disponible en este navegador.");
        }
    });

// =================================================================
// INICIO DEL initCoordinatorTable v5.3 (BOTONES Y REDIBUJADO CORREGIDOS)
// =================================================================
function initCoordinatorTable() {
    const tabla = document.getElementById("tabla-coordinador");
    if (!tabla) return;
    const thead = tabla.querySelector("thead");
    const tbody = tabla.querySelector("tbody");
    
    // --- 1. REFERENCIAS Y CONSTANTES ---
    const db = firebase.firestore();
    const docRef = db.collection('groups').doc(AppState.groupId).collection('appData').doc('coordinatorTable');
    const controls = { addRow: document.getElementById('btn-add-row'), removeRow: document.getElementById('btn-remove-row'), addCol: document.getElementById('btn-add-col'), removeCol: document.getElementById('btn-remove-col'), limpiar: document.getElementById('limpiar-tabla') };
    const COORDINATOR_PALETTE = ['#ef9a9a', '#ffcc80', '#fff59d', '#f48fb1', '#ffab91', '#e6ee9c', '#a5d6a7', '#80cbc4', '#81d4fa', '#c5e1a5', '#80deea', '#90caf9', '#ce93d8', '#b39ddb', '#bcaaa4', '#eeeeee', '#b0bec5', 'initial'];
    const DEFAULT_COLS = [{ id: 'th-m1', header: 'M¹' }, { id: 'th-t1', header: 'T¹' }, { id: 'th-m2', header: 'M²' }, { id: 'th-t2', header: 'T²' }, { id: 'th-n', header: 'N' }];
    const NUM_STATIC_COLS_START = 2, NUM_STATIC_COLS_END = 1;

    // --- 2. MODELO DE DATOS ---
    const createDefaultCell = () => ({ text: '', color: '' });
    const createDefaultRow = (numTurnCols) => ({ id: `row_${Date.now()}_${Math.random()}`, cells: Array(NUM_STATIC_COLS_START + numTurnCols + NUM_STATIC_COLS_END).fill(null).map(createDefaultCell) });
    const createDefaultTable = () => ({ headers: {}, cols: DEFAULT_COLS, rowData: Array(18).fill(null).map(() => createDefaultRow(DEFAULT_COLS.length)) });

    let tableState = {};
    let selectedRowIndex = -1;
    let localUpdate = false;

    // --- 3. RENDERIZADO Y AYUDANTES ---
    // (Funciones auxiliares autocontenidas al final)
    function renderBody() {
        tbody.innerHTML = '';
        if (!tableState.rowData) return;
        tableState.rowData.forEach((rowDataItem, rowIndex) => {
            const row = tbody.insertRow();
            row.dataset.rowIndex = rowIndex;
            // ¡Importante! Mantiene la selección visual después del redibujado
            if(rowIndex === selectedRowIndex) row.classList.add('seleccionada');

            const numTurnCols = tableState.cols?.length || 0;
            const totalCells = NUM_STATIC_COLS_START + numTurnCols + NUM_STATIC_COLS_END;
            for (let cellIndex = 0; cellIndex < totalCells; cellIndex++) {
                const cell = row.insertCell();
                const cellData = rowDataItem.cells[cellIndex] || createDefaultCell();
                const textEditor = document.createElement('div');
                textEditor.className = 'text-editor';
                textEditor.innerText = cellData.text || '';
                if (AppState.isCoordinator) textEditor.contentEditable = true;
                cell.appendChild(textEditor);
                cell.style.backgroundColor = cellData.color || '';
                const isTurnColumn = cellIndex >= NUM_STATIC_COLS_START && cellIndex < NUM_STATIC_COLS_START + numTurnCols;
                if (isTurnColumn && AppState.isCoordinator) {
                    cell.style.position = 'relative';
                    const handle = document.createElement('button');
                    handle.className = 'coord-color-handle';
                    handle.innerHTML = '●';
                    handle.onclick = (ev) => {
                         ev.stopPropagation();
                         openColorPicker(handle, (color) => {
                            handle.closest('td').style.backgroundColor = (color === 'initial' ? '' : color);
                            tableState.rowData[rowIndex].cells[cellIndex].color = (color === 'initial' ? '' : color);
                            localUpdate = true;
                            docRef.update({ rowData: tableState.rowData }).finally(() => setTimeout(() => localUpdate = false, 50));
                         });
                    };
                    cell.appendChild(handle);
                }
            }
        });
    }
    
    // --- 4. GESTIÓN DE DATOS CON FIRESTORE ---
    function onRemoteUpdate(doc) {
        if (localUpdate) return;
        const data = doc.data();
        if (data && Array.isArray(data.rowData)) {
            tableState = data;
        } else {
            tableState = createDefaultTable();
            docRef.set(tableState).catch(console.error);
            return; // Importante salir para evitar errores de renderizado con estado vacío
        }
        renderColgroup(); renderHeaders(); renderBody(); updateControlsVisibility();
    }
    function updateControlsVisibility() { const display = AppState.isCoordinator ? 'inline-block' : 'none'; Object.values(controls).forEach(btn => { if(btn) btn.style.display = display; }); }

    // --- 5. VINCULACIÓN DE EVENTOS (CON REDIBUJADO INMEDIATO) ---
    function bindCoordinatorEvents() {
        if (!AppState.isCoordinator) return;
        
        function updateFirestore() {
            localUpdate = true;
            docRef.update({ cols: tableState.cols, rowData: tableState.rowData, headers: tableState.headers })
                .finally(() => setTimeout(() => localUpdate = false, 100));
        }

        if (controls.addRow) controls.addRow.onclick = () => {
            const newRow = createDefaultRow(tableState.cols.length);
            const insertIndex = (selectedRowIndex === -1) ? tableState.rowData.length : selectedRowIndex + 1;
            tableState.rowData.splice(insertIndex, 0, newRow);
            renderBody(); // ¡REDIBUJA AHORA!
            updateFirestore();
        };

        if (controls.removeRow) controls.removeRow.onclick = () => {
            if (selectedRowIndex === -1) return alert("Por favor, selecciona una fila para eliminar.");
            if (confirm("¿Seguro que quieres eliminar la fila seleccionada?")) {
                tableState.rowData.splice(selectedRowIndex, 1);
                selectedRowIndex = -1; // Deselecciona para evitar errores
                renderBody(); // ¡REDIBUJA AHORA!
                updateFirestore();
            }
        };

        if (controls.addCol) controls.addCol.onclick = () => {
            const name = prompt("Nombre nueva columna:", `T${(tableState.cols?.length || 0) + 1}`);
            if (name) {
                tableState.cols.push({ id: `th-c-${Date.now()}`, header: name.trim() });
                tableState.rowData.forEach(row => { row.cells.splice(NUM_STATIC_COLS_START + tableState.cols.length - 1, 0, createDefaultCell()); });
                renderColgroup(); renderHeaders(); renderBody(); // ¡REDIBUJA TODO AHORA!
                updateFirestore();
            }
        };

        if (controls.removeCol) controls.removeCol.onclick = () => {
            if ((tableState.cols?.length || 0) > 0 && confirm("¿Eliminar la última columna de turno?")) {
                tableState.cols.pop();
                tableState.rowData.forEach(row => { row.cells.splice(NUM_STATIC_COLS_START + tableState.cols.length, 1); });
                renderColgroup(); renderHeaders(); renderBody(); // ¡REDIBUJA TODO AHORA!
                updateFirestore();
            }
        };
        
        if (controls.limpiar) controls.limpiar.onclick = () => {
            if (confirm("¿Borrar TODOS los textos y colores de la tabla?")) {
                tableState.rowData = tableState.rowData.map(() => createDefaultRow(tableState.cols.length));
                renderBody(); // ¡REDIBUJA AHORA!
                updateFirestore();
            }
        };

        thead.addEventListener('blur', (e) => { const th = e.target.closest('th'); if (th?.isContentEditable) { tableState.headers[th.id] = th.innerText.trim(); updateFirestore(); } }, true);
        tbody.addEventListener('blur', (e) => { const editor = e.target.closest('.text-editor'); if (editor?.isContentEditable) { const cell = editor.closest('td'); const row = editor.closest('tr'); if (cell && row) { tableState.rowData[row.dataset.rowIndex].cells[cell.cellIndex].text = editor.innerText.trim(); updateFirestore(); } } }, true);
        tbody.addEventListener('click', (e) => { const fila = e.target.closest("tr"); if (fila?.parentElement === tbody) { tbody.querySelectorAll("tr.seleccionada").forEach(tr => tr.classList.remove("seleccionada")); fila.classList.add("seleccionada"); selectedRowIndex = parseInt(fila.dataset.rowIndex, 10); } });
    }
    
    // --- 6. AUTOCONTENCIÓN Y ARRANQUE ---
    var openColorPicker= (t,c)=>{document.getElementById("coord-color-palette")?.remove();const p=document.createElement("div");p.id="coord-color-palette",Object.assign(p.style,{position:"absolute",display:"flex",flexWrap:"wrap",width:"250px",gap:"8px",padding:"10px",backgroundColor:"var(--panel-bg)",borderRadius:"8px",boxShadow:"0 4px 15px rgba(0, 0, 0, 0.2)",zIndex:"100"}),COORDINATOR_PALETTE.forEach(e=>{const o=document.createElement("button");o.className="palette-swatch",Object.assign(o.style,{width:"30px",height:"30px",borderRadius:"50%",cursor:"pointer",border:"2px solid var(--bg-color)",display:"flex",alignItems:"center",justifyContent:"center"}),"initial"===e?(o.innerHTML="\ud83d\udd04",o.title="Quitar color"):o.style.backgroundColor=e,o.style.backgroundColor="initial"===e?"var(--button-bg-color)":e,o.onclick=()=>{c(e),p.remove()},p.appendChild(o)}),document.body.appendChild(p);const l=t.getBoundingClientRect();let a=window.scrollX+l.left;a+250>window.innerWidth&&(a=window.innerWidth-260),p.style.top=`${window.scrollY+l.bottom+5}px`,p.style.left=`${a}px`;const r=e=>{p.contains(e.target)||e.target===t||(p.remove(),document.removeEventListener("click",r,!0))};setTimeout(()=>document.addEventListener("click",r,!0),100)};
    var renderColgroup=()=>{let t=tabla.querySelector("colgroup");t||(t=document.createElement("colgroup"),tabla.insertBefore(t,thead));const e=tableState.cols?.length||0,o=e>0?(100-9-18-35)/e:0;let l=`<col style="width:9%;"><col style="width:18%;">`;for(let t=0;t<e;t++)l+=`<col style="width:${o}%;">`;l+='<col style="width:35%;">',t.innerHTML=l};
    var renderHeaders=()=>{thead.innerHTML="";const t=thead.insertRow(),e=thead.insertRow(),o=tableState.cols?.length||0;t.innerHTML=`<th colspan="2">FUNCIONARIO/A</th><th id="th-ciclo" colspan="${o||1}" class="titulo-ciclo">${tableState.headers?.["th-ciclo"]||"CICLO"}</th><th colspan="1">OBSERVACIONES</th>`,e.innerHTML="<th>N\xba</th><th>NOMBRE</th>",tableState.cols?.forEach(t=>{e.innerHTML+=`<th id="${t.id}">${tableState.headers?.[t.id]||t.header}</th>`}),e.innerHTML+=`<th id="th-cocina">${tableState.headers?.["th-cocina"]||"COCINA"}</th>`,AppState.isCoordinator&&thead.querySelectorAll("th[id]").forEach(t=>{t.contentEditable=!0})};

    docRef.onSnapshot(onRemoteUpdate, (error) => { console.error("Error al sincronizar tabla:", error); tbody.innerHTML = '<tr><td colspan="8">Error al cargar datos.</td></tr>'; });
    bindCoordinatorEvents();
}

// =================================================================
//    NUEVA VERSIÓN de initTablon (CONECTADA A FIREBASE)
// =================================================================
function initTablon() {
    // --- 1. Elementos del DOM ---
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

    // --- 2. Referencias a Firebase ---
    // Usamos Firestore para guardar la información (metadata) de los archivos
    // y Storage para guardar el archivo en sí.
    const db = firebase.firestore();
    const storage = firebase.storage();
    const filesCollection = db.collection('groups').doc(AppState.groupId).collection('tablonFiles');

    // --- 3. Renderizar la lista de archivos desde Firestore ---
    async function renderFiles() {
        fileListContainer.innerHTML = '<li>Cargando archivos desde la nube...</li>';
        try {
            const snapshot = await filesCollection.orderBy('createdAt', 'desc').get();
            const files = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            fileListContainer.innerHTML = '';
            const fragment = document.createDocumentFragment();

            if (files.length === 0) {
                fileListContainer.innerHTML = '<li>No hay archivos en el tablón. ¡Sube el primero!</li>';
                tablonPreviewContainer.classList.add('oculto');
                return;
            }

            const latestImage = files.find(file => file.type.startsWith('image/'));
            if (latestImage) {
                tablonPreviewImage.src = latestImage.downloadURL;
                tablonPreviewContainer.classList.remove('oculto');
            } else {
                tablonPreviewContainer.classList.add('oculto');
            }

            files.forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'tablon-item';
                fileItem.dataset.id = file.id; // ID del documento de Firestore
                fileItem.dataset.storagePath = file.storagePath; // Ruta en Storage para borrar

                const infoDiv = document.createElement('div');
                infoDiv.className = 'tablon-item-info';

                const nameStrong = document.createElement('strong');
                nameStrong.className = 'tablon-item-name';
                nameStrong.textContent = file.name;
                nameStrong.contentEditable = true; // <-- AÑADIDO: Hacemos el nombre editable
                nameStrong.title = "Haz clic para editar el nombre"; // <-- AÑADIDO: Pista visual para el usuario

                // --- INICIO: NUEVO BLOQUE DE CÓDIGO AÑADIDO ---
                // Guardar al pulsar 'Enter'
                nameStrong.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault(); // Evita saltos de línea
                        e.target.blur();    // Dispara el evento 'blur' para guardar
                    }
                });

                // Guardar al hacer clic fuera (perder el foco)
                nameStrong.addEventListener('blur', async (e) => {
                    const newName = e.target.textContent.trim();
                    const docId = fileItem.dataset.id;

                    // Si no hay ID o el nombre está vacío, no hacemos nada y restauramos el original
                    if (!docId || !newName) {
                        e.target.textContent = file.name;
                        return;
                    }

                    // Solo actualizamos si el nombre realmente ha cambiado
                    if (newName !== file.name) {
                        const originalOpacity = e.target.style.opacity;
                        e.target.style.opacity = '0.5'; // Indicador visual de que se está guardando

                        try {
                            // Actualizamos solo el campo 'name' en Firestore
                            await filesCollection.doc(docId).update({ name: newName });
                            
                            // Actualizamos el objeto 'file' local para consistencia
                            file.name = newName;

                            // ¡IMPORTANTE! Actualizamos también el nombre en el botón de descarga
                            const downloadBtn = fileItem.querySelector('.download-btn');
                            if (downloadBtn) {
                                downloadBtn.dataset.name = newName;
                            }

                        } catch (error) {
                            console.error("Error al actualizar el nombre del archivo:", error);
                            alert(`Error al cambiar el nombre: ${error.message}`);
                            e.target.textContent = file.name; // Revertimos en caso de error
                        } finally {
                           e.target.style.opacity = originalOpacity; // Restauramos la opacidad
                        }
                    }
                });

                const metaSmall = document.createElement('small');
                metaSmall.className = 'tablon-item-meta';

                const uploadDate = new Date(file.createdAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                metaSmall.textContent = `Subido: ${uploadDate} | ${(file.size / 1024).toFixed(1)} KB`;

                infoDiv.appendChild(nameStrong);
                infoDiv.appendChild(metaSmall);

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'tablon-item-actions';
                actionsDiv.innerHTML = `
                    <button class="view-btn modern-btn green" data-url="${file.downloadURL}" data-type="${file.type}" title="Ver">👁️</button>
                    <button class="download-btn modern-btn" data-url="${file.downloadURL}" data-name="${file.name}" title="Descargar">📥</button>
                    <button class="delete-btn modern-btn red" title="Eliminar">🗑️</button>
                `;

                fileItem.appendChild(infoDiv);
                fileItem.appendChild(actionsDiv);
                fragment.appendChild(fileItem);
            });
            fileListContainer.appendChild(fragment);

        } catch (error) {
            console.error("Error al cargar archivos desde Firebase:", error);
            fileListContainer.innerHTML = `<li>Error al cargar archivos. Revisa la consola.</li>`;
        }
    }

    // --- 4. Subir un nuevo archivo ---
    function handleUpload(file) {
        if (!file) return;
        const timestamp = Date.now();
        const storagePath = `tablon/${AppState.groupId}/${timestamp}-${file.name}`;
        const storageRef = storage.ref(storagePath);
        const uploadTask = storageRef.put(file);

        // Creamos un item temporal para mostrar el progreso
        const tempId = `upload-${timestamp}`;
        const tempItem = document.createElement('div');
        tempItem.className = 'tablon-item';
        tempItem.id = tempId;
        tempItem.innerHTML = `<div class="tablon-item-info"><strong>Subiendo ${file.name}...</strong><small id="${tempId}-progress">0%</small></div>`;
        const firstItem = fileListContainer.firstChild;
        fileListContainer.insertBefore(tempItem, firstItem);


        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                const progressEl = document.getElementById(`${tempId}-progress`);
                if (progressEl) progressEl.textContent = `${Math.round(progress)}%`;
            },
            (error) => {
                console.error("Error en la subida:", error);
                document.getElementById(tempId)?.remove();
                alert(`Error al subir el archivo: ${error.message}`);
            },
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                const fileData = {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    createdAt: new Date().toISOString(),
                    downloadURL: downloadURL,
                    storagePath: storagePath
                };
                await filesCollection.add(fileData);
                document.getElementById(tempId)?.remove();
                renderFiles(); // Recargamos desde la fuente de la verdad
            }
        );
    }

    // --- 5. Eventos de click ---
    btnUpload.addEventListener('click', () => {
        fileInput.value = null;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => handleUpload(e.target.files[0]));

    fileListContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const fileItem = target.closest('.tablon-item');

        if (target.classList.contains('view-btn')) {
            const url = target.dataset.url;
            const type = target.dataset.type;
            if (type.startsWith('image/')) {
                modalImageContent.src = url;
                imageModal.classList.remove('oculto');
            } else {
                window.open(url, '_blank');
            }
        }
        else if (target.classList.contains('download-btn')) {
            try {
                const url = target.dataset.url;
                const name = target.dataset.name;
                const response = await fetch(url);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            } catch (error) {
                console.error("Error al descargar:", error);
                alert("No se pudo descargar el archivo.");
            }
        }
        else if (target.classList.contains('delete-btn')) {
            const docId = fileItem.dataset.id;
            const storagePath = fileItem.dataset.storagePath;
            const fileName = fileItem.querySelector('.tablon-item-name').textContent;

            if (confirm(`¿Seguro que quieres eliminar "${fileName}"?`)) {
                try {
                    fileItem.style.opacity = '0.5';
                    if (storagePath) await storage.ref(storagePath).delete();
                    await filesCollection.doc(docId).delete();
                    renderFiles();
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    alert(`No se pudo eliminar el archivo: ${error.message}`);
                    renderFiles();
                }
            }
        }
    });

    // Eventos del modal
    tablonPreviewImage.addEventListener('click', () => {
        if (tablonPreviewImage.src && !tablonPreviewImage.src.endsWith('#')) {
            modalImageContent.src = tablonPreviewImage.src;
            imageModal.classList.remove('oculto');
        }
    });
    modalCloseBtn.addEventListener('click', () => { imageModal.classList.add('oculto'); });
    imageModal.addEventListener('click', (e) => { if (e.target === imageModal) { imageModal.classList.add('oculto'); } });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !imageModal.classList.contains('oculto')) { imageModal.classList.add('oculto'); } });

    // --- 6. Carga inicial ---
    renderFiles();
}

// =================================================================
//    NUEVA VERSIÓN de initDocumentosPanel (CONECTADA A FIREBASE)
// =================================================================
function initDocumentosPanel() {
    // --- 1. Elementos del DOM y Configuración ---
    const documentosSection = document.getElementById('documentos-section');
    if (!documentosSection) return;

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
    }

    const pdfInput = document.getElementById('pdf-input');
    const pdfModal = document.getElementById('pdf-modal');
    const modalPdfContent = document.getElementById('modal-pdf-content');
    const modalCloseBtn = pdfModal.querySelector('.image-modal-close');

    const CATEGORIES = ['mes', 'ciclos', 'vacaciones', 'rotacion'];
    let currentUploadCategory = null;

    // --- 2. Referencias a Firebase ---
    const db = firebase.firestore();
    const storage = firebase.storage();
    const docsCollection = db.collection('groups').doc(AppState.groupId).collection('documentos');

    // --- 3. Funciones de Renderizado ---
    async function generatePdfThumbnail(file) {
        const fileUrl = URL.createObjectURL(file);
        try {
            const pdf = await pdfjsLib.getDocument(fileUrl).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.3 }); // Escala pequeña para thumbnail
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return canvas.toDataURL('image/jpeg', 0.8);
        } catch (error) {
            console.error("Error generando la miniatura del PDF:", error);
            return null; // Devuelve null si falla
        } finally {
            URL.revokeObjectURL(fileUrl); // Liberamos memoria
        }
    }

    async function renderDocs() {
        // Limpiamos todas las tarjetas antes de cargar
        CATEGORIES.forEach(category => {
            const card = documentosSection.querySelector(`.documento-card[data-category="${category}"]`);
            if (card) {
                card.querySelector('.documento-file-list').innerHTML = '<li>Cargando...</li>';
                const imgPreview = card.querySelector('.documento-preview-img');
                const overlay = card.querySelector('.preview-overlay');
                imgPreview.style.display = 'none';
                overlay.style.display = 'flex';
            }
        });

        try {
            const snapshot = await docsCollection.orderBy('createdAt', 'desc').get();
            const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            CATEGORIES.forEach(category => {
                const card = documentosSection.querySelector(`.documento-card[data-category="${category}"]`);
                const fileListContainer = card.querySelector('.documento-file-list');
                const imgPreview = card.querySelector('.documento-preview-img');
                const overlay = card.querySelector('.preview-overlay');
                
                const filesForCategory = allDocs.filter(doc => doc.category === category);

                fileListContainer.innerHTML = '';
                const fragment = document.createDocumentFragment();

                if (filesForCategory.length > 0) {
                    const lastFile = filesForCategory[0];
                    if (lastFile.thumbnail) {
                        imgPreview.src = lastFile.thumbnail;
                        imgPreview.dataset.viewUrl = lastFile.downloadURL; // Guardamos URL para vista rápida
                        imgPreview.style.display = 'block';
                        overlay.style.display = 'none';
                    }

                    filesForCategory.forEach(file => {
                        const fileItem = document.createElement('div');
                        fileItem.className = 'documento-file-item';
                        // Guardamos todos los datos necesarios en el elemento
                        fileItem.dataset.id = file.id;
                        fileItem.dataset.storagePath = file.storagePath;
                        fileItem.dataset.viewUrl = file.downloadURL;
                        fileItem.dataset.fileName = file.name;

                        const uploadDate = new Date(file.createdAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        fileItem.innerHTML = `
                            <div class="documento-file-info">
                                <strong class="documento-file-name">${file.name}</strong>
                                <small class="documento-file-meta">Subido: ${uploadDate}</small>
                            </div>
                            <div class="documento-file-actions">
                                <button class="doc-view-btn modern-btn green" title="Ver">👁️</button>
                                <button class="doc-download-btn modern-btn" title="Descargar">📥</button>
                                <button class="doc-delete-btn modern-btn red" title="Eliminar">🗑️</button>
                            </div>
                        `;
                        fragment.appendChild(fileItem);
                    });
                } else {
                     fileListContainer.innerHTML = '<li>No hay documentos.</li>';
                }
                 fileListContainer.appendChild(fragment);
            });
        } catch (error) {
            console.error("Error al cargar documentos desde Firebase:", error);
            CATEGORIES.forEach(category => {
                 const card = documentosSection.querySelector(`.documento-card[data-category="${category}"]`);
                 if(card) card.querySelector('.documento-file-list').innerHTML = '<li>Error al cargar.</li>';
            });
        }
    }
    
    // --- 4. Subida de Archivos ---
    async function handleUpload(file, category) {
        if (!file || !category) return;

        const card = documentosSection.querySelector(`.documento-card[data-category="${category}"]`);
        const overlayText = card.querySelector('.preview-text');
        if (overlayText) overlayText.textContent = 'Procesando...';

        const thumbnail = await generatePdfThumbnail(file);

        if (overlayText) overlayText.textContent = 'Subiendo...';
        
        const timestamp = Date.now();
        const storagePath = `documentos/${AppState.groupId}/${category}/${timestamp}-${file.name}`;
        const storageRef = storage.ref(storagePath);
        const uploadTask = storageRef.put(file);

        uploadTask.on('state_changed',
            null, // No usamos el progreso aquí, pero se podría
            (error) => {
                console.error("Error en la subida del PDF:", error);
                alert(`Error al subir el PDF: ${error.message}`);
                renderDocs(); // Revertimos al estado original
            },
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                const fileData = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    createdAt: new Date().toISOString(),
                    downloadURL: downloadURL,
                    storagePath: storagePath,
                    category: category,
                    thumbnail: thumbnail // Guardamos la miniatura
                };
                await docsCollection.add(fileData);
                renderDocs(); // Recargamos todo para mostrar el nuevo estado
            }
        );
    }

    // --- 5. Eventos ---
    documentosSection.addEventListener('click', async (event) => {
        const target = event.target;
        const fileItem = target.closest('.documento-file-item');

        // Botón Subir
        if (target.matches('.btn-upload-pdf')) {
            currentUploadCategory = target.dataset.category;
            pdfInput.value = null;
            pdfInput.click();
            return;
        }

        // Botón Ver
        if (target.matches('.doc-view-btn')) {
            const url = fileItem.dataset.viewUrl;
            if (window.innerWidth < 768) { // En móvil, abrir en nueva pestaña
                window.open(url, '_blank');
            } else {
                modalPdfContent.src = url;
                pdfModal.classList.remove('oculto');
            }
            return;
        }

        // Vista rápida desde la miniatura
        const previewContainer = target.closest('.documento-preview-container');
         if (previewContainer && previewContainer.querySelector('.documento-preview-img').style.display === 'block') {
            const url = previewContainer.querySelector('.documento-preview-img').dataset.viewUrl;
             if (window.innerWidth < 768) {
                window.open(url, '_blank');
            } else {
                modalPdfContent.src = url;
                pdfModal.classList.remove('oculto');
            }
            return;
        }

        // Botón Descargar
        if (target.matches('.doc-download-btn')) {
            target.disabled = true; // Prevenir doble clic
            try {
                const url = fileItem.dataset.viewUrl;
                const name = fileItem.dataset.fileName;
                const response = await fetch(url);
                const blob = await response.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            } catch (error) {
                console.error("Error al descargar PDF:", error);
                alert("No se pudo descargar el archivo.");
            } finally {
                target.disabled = false;
            }
            return;
        }

        // Botón Eliminar
        if (target.matches('.doc-delete-btn')) {
             if (confirm(`¿Seguro que quieres eliminar "${fileItem.dataset.fileName}"?`)) {
                try {
                    fileItem.style.opacity = '0.5';
                    target.disabled = true;
                    await storage.ref(fileItem.dataset.storagePath).delete();
                    await docsCollection.doc(fileItem.dataset.id).delete();
                    renderDocs(); // Recargamos para reflejar el cambio
                } catch (error) {
                    console.error("Error al eliminar PDF:", error);
                    alert(`No se pudo eliminar el archivo: ${error.message}`);
                    fileItem.style.opacity = '1';
                    target.disabled = false;
                }
            }
            return;
        }
    });

    pdfInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && currentUploadCategory) {
            handleUpload(file, currentUploadCategory);
        }
    });
    
    // Eventos del modal
    modalCloseBtn.addEventListener('click', () => pdfModal.classList.add('oculto'));
    pdfModal.addEventListener('click', (e) => { if (e.target === pdfModal) pdfModal.classList.add('oculto'); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pdfModal.classList.contains('oculto')) { pdfModal.classList.add('oculto'); }});

    // --- 6. Carga Inicial ---
    renderDocs();
}


// ---------------- estado ----------------
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = []; // array con {date: Date, type: string}
let cadenceSpec = null; // { type: 'V-1'|'V-2'|'Personalizada', startISO: '', pattern: [...], v1Index:0 }
let manualEdits = {}; // mapa "YYYY-MM-DD" -> { M: { text?, color?, userColor? }, T:..., N:... }

// =========================================================================
// ARQUITECTURA v8.0 - SUPER ADMIN Y ESTADO DINÁMICO
// =========================================================================

// !! IMPORTANTE !!
// Este es el UID del "dueño" de toda la plataforma. Solo este usuario
// podrá crear nuevos grupos y asignar coordinadores.
// Asegúrate de que aquí está tu User ID de Firebase.
const SUPER_ADMIN_UID = 'rD3KBeWoJEgyhXQXoFV58ia6N3x1';

const AppState = {
    userId: null,            // UID del usuario que ha iniciado sesión (se mantiene).
    userName: null,          // Nombre del usuario que ha iniciado sesión (se mantiene).
    
    // --- Nuevos campos para la v8.0 ---
    isSuperAdmin: false,     // Se calculará en el login. ¿Es el usuario el dueño de la app?
    isCoordinator: false,    // Se calculará en el login. ¿Es el usuario el coordinador del grupo actual?
    
    groupId: null,           // El ID del grupo se cargará dinámicamente después del login.
    groupName: "TurnApp"     // Nombre visible del grupo, se cargará dinámicamente.
};


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

// 1. GESTIÓN DE EDICIONES MANUALES DEL CALENDARIO CON FIRESTORE
let saveTimeout = null; // Variable para controlar el debounce del guardado

/**
 * Carga las ediciones manuales del calendario desde el documento del usuario en Firestore.
 * Debe ejecutarse como una función asíncrona al inicio.
 */
async function restoreManualEdits() {
    if (!AppState.userId) {
        manualEdits = {};
        return; // Salir si no hay un ID de usuario
    }

    const db = firebase.firestore();
    // Apuntamos a un documento específico del usuario en una nueva colección 'userData'
    const userDocRef = db.collection('userData').doc(AppState.userId);

    try {
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().manualEdits) {
            manualEdits = doc.data().manualEdits;
            console.log("Calendario: Ediciones manuales cargadas desde Firestore.");
        } else {
            // Si no existe el documento o el campo, empezamos con un objeto vacío
            manualEdits = {};
            console.log("Calendario: No se encontraron ediciones guardadas en la nube.");
        }
    } catch (error) {
        console.error("Error al cargar el calendario desde Firestore:", error);
        manualEdits = {}; // En caso de error, asegurar un estado limpio
    }
}

/**
 * Guarda el objeto `manualEdits` completo en Firestore.
 * Utiliza un "debounce" para no escribir en la base de datos en cada pulsación de tecla,
 * sino que espera 1.5 segundos de inactividad para guardar.
 */
function saveManualEdits() {
    if (!AppState.userId) return; // No intentar guardar si no estamos conectados

    // Si ya hay un guardado programado, lo cancelamos para empezar de nuevo la cuenta
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    // Programamos el guardado para dentro de 1.5 segundos
    saveTimeout = setTimeout(() => {
        const db = firebase.firestore();
        const userDocRef = db.collection('userData').doc(AppState.userId);
        
        console.log(`Guardando calendario en la nube para ${AppState.userId}...`);
        
        // Usamos .set con { merge: true } para crear/actualizar el campo `manualEdits`
        // sin sobreescribir otros posibles datos del usuario (como licencias, etc.).
        userDocRef.set({ manualEdits: manualEdits }, { merge: true })
            .catch(error => {
                console.error("Error al guardar calendario en Firestore:", error);
                // Aquí se podría añadir una alerta para el usuario si falla el guardado
            });
    }, 1500); // 1500 ms = 1.5 segundos
}

// 2. NUEVA FUNCIÓN DE LICENCIAS (CONECTADA A FIRESTORE)
async function initLicenciasPanel() {
    const licenciasContainer = document.getElementById('licencias-container');
    if (!licenciasContainer) return;

    const items = licenciasContainer.querySelectorAll('.licencia-item');
    const totalCargaEl = document.getElementById('total-carga');
    const totalConsumidosEl = document.getElementById('total-consumidos');
    const totalRestanEl = document.getElementById('total-restan');
    
    let saveTimeout = null; // Para el debounce del guardado

    function updateCalculations() {
        let totalCarga = 0, totalConsumidos = 0;
        items.forEach(item => {
            const carga = parseInt(item.querySelector('.carga').value, 10) || 0;
            const consumidos = parseInt(item.querySelector('.consumidos').value, 10) || 0;
            item.querySelector('.restan').value = carga - consumidos;
            totalCarga += carga;
            totalConsumidos += consumidos;
        });
        if(totalCargaEl) totalCargaEl.value = totalCarga;
        if(totalConsumidosEl) totalConsumidosEl.value = totalConsumidos;
        if(totalRestanEl) totalRestanEl.value = totalCarga - totalConsumidos;
    }

    function saveState() {
        if (!AppState.userId) return;
        if (saveTimeout) clearTimeout(saveTimeout);

        saveTimeout = setTimeout(() => {
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
            
            const db = firebase.firestore();
            const userDocRef = db.collection('userData').doc(AppState.userId);
            console.log(`Guardando licencias en la nube para ${AppState.userId}...`);
            userDocRef.set({ licenciasData: state }, { merge: true })
                .catch(error => console.error("Error al guardar licencias en Firestore:", error));
        }, 1500);
    }

    async function loadState() {
        if (!AppState.userId) return;
        const db = firebase.firestore();
        const userDocRef = db.collection('userData').doc(AppState.userId);

        try {
            const doc = await userDocRef.get();
            if (doc.exists && doc.data().licenciasData) {
                const savedState = doc.data().licenciasData;
                items.forEach(item => {
                    const tipo = item.dataset.tipo;
                    if (tipo && savedState[tipo]) {
                        item.querySelector('.carga').value = savedState[tipo].carga || 0;
                        item.querySelector('.consumidos').value = savedState[tipo].consumidos || 0;
                        const colorHandle = item.querySelector('.licencia-color-handle');
                        if (colorHandle && savedState[tipo].color) {
                           colorHandle.style.backgroundColor = savedState[tipo].color;
                        }
                    }
                });
                console.log("Licencias: Datos cargados desde Firestore.");
            } else {
                console.log("Licencias: No se encontraron datos guardados en la nube.");
            }
        } catch (error) {
            console.error("Error al cargar licencias desde Firestore:", error);
        }
    }

    items.forEach(item => {
        item.querySelectorAll('.carga, .consumidos').forEach(input => {
            input.addEventListener('input', () => {
                updateCalculations();
                saveState();
            });
        });

        const colorCell = item.querySelector('.licencia-color-handle');
        if (colorCell) {
            colorCell.style.position = 'relative';
            colorCell.innerHTML = '';
            const innerHandle = document.createElement('button');
            innerHandle.type = 'button';
            innerHandle.title = 'Elegir color';
            innerHandle.innerHTML = '●';
            innerHandle.className = 'licencia-inner-handle';
            innerHandle.addEventListener('click', (ev) => {
                ev.stopPropagation();
                openColorPicker(innerHandle, (color) => {
                    colorCell.style.backgroundColor = (color === 'initial') ? '' : color;
                    saveState();
                }, colorPalette);
            });
            colorCell.appendChild(innerHandle);
        }
    });

    // Carga inicial de datos y cálculos
    await loadState();
    updateCalculations();
}

// =========================================================================
// FIN DEL NUEVO BLOQUE DE LÓGICA
// =========================================================================

// =========================================================================
// LÓGICA PARA EL TÍTULO EDITABLE (CONECTADO A FIREBASE)
// =========================================================================
function initEditableTitle() {
    const titleElement = document.getElementById('editable-title');
    if (!titleElement) return;

    // 1. Referencia al documento del grupo en Firestore
    const db = firebase.firestore();
    const groupDocRef = db.collection('groups').doc(AppState.groupId);

    // 2. Hacer editable el título SOLO para el Coordinador
    if (AppState.isCoordinator) {
        titleElement.contentEditable = true;
        titleElement.style.cursor = 'text';
    } else {
        titleElement.contentEditable = false;
        titleElement.style.cursor = 'default';
    }

    // 3. Escuchar cambios en tiempo real desde Firestore
    groupDocRef.onSnapshot(doc => {
        if (doc.exists && doc.data().groupName) {
            // Actualizamos el título si es diferente, para evitar perder el foco si se está editando
            if (titleElement.textContent !== doc.data().groupName) {
                titleElement.textContent = doc.data().groupName;
            }
        } else {
            // Si el nombre no existe, ponemos uno por defecto (y el coordinador puede crearlo)
            const defaultText = "Nombre del Grupo";
            if (titleElement.textContent !== defaultText) {
                 titleElement.textContent = defaultText;
            }
            // Si el documento o el campo no existen, el coordinador lo creará al editar
            if (AppState.isCoordinator) {
                groupDocRef.set({ groupName: defaultText }, { merge: true });
            }
        }
    }, error => {
        console.error("Error al sincronizar el título del grupo:", error);
        titleElement.textContent = "Error de conexión";
    });

    // 4. Guardar el nuevo nombre cuando el Coordinador deja de editar
    if (AppState.isCoordinator) {
        titleElement.addEventListener('blur', () => {
            const newTitle = titleElement.textContent.trim();
            if (newTitle) {
                // Solo guardamos si el título ha cambiado para no hacer escrituras innecesarias
                groupDocRef.get().then(doc => {
                    if (!doc.exists || doc.data().groupName !== newTitle) {
                        console.log("Guardando nuevo nombre de grupo en Firestore:", newTitle);
                        groupDocRef.set({ groupName: newTitle }, { merge: true });
                    }
                });
            }
        });

        // 5. Evitar saltos de línea con 'Enter' y forzar guardado
        titleElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleElement.blur(); // Dispara el evento 'blur' para guardar
            }
        });
    }
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

// ---------------- GESTIÓN DE CADENCIA CON FIRESTORE ----------------
/**
 * Guarda la especificación de la cadencia en el documento del usuario en Firestore.
 * Esta acción es directa, ya que se invoca tras una confirmación explícita del usuario.
 * @param {object | null} spec - El objeto de especificación de la cadencia, o null para borrarla.
 */
function saveCadenceSpec(spec) {
    if (!AppState.userId) return;

    const db = firebase.firestore();
    const userDocRef = db.collection('userData').doc(AppState.userId);

    console.log(`Guardando cadencia en la nube para ${AppState.userId}...`);
    
    // Usamos { merge: true } para no sobreescribir otros datos del usuario.
    // Si spec es null, Firestore eliminará el campo 'cadenceSpec' del documento.
    userDocRef.set({ cadenceSpec: spec }, { merge: true })
        .catch(error => {
            console.error("Error al guardar la cadencia en Firestore:", error);
            alert("Hubo un error al guardar tu cadencia en la nube.");
        });
}

/**
 * Carga la especificación de la cadencia desde Firestore y reconstruye los datos locales.
 * Es una función asíncrona que debe esperarse (await) al arrancar la app.
 */
async function restoreCadenceSpec() {
    if (!AppState.userId) {
        cadenceSpec = null;
        return;
    }

    const db = firebase.firestore();
    const userDocRef = db.collection('userData').doc(AppState.userId);

    try {
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().cadenceSpec) {
            cadenceSpec = doc.data().cadenceSpec;
            console.log("Cadencia: Datos cargados desde Firestore.");
            
            // Si la cadencia existe, reconstruimos los datos para el calendario.
            if (cadenceSpec) {
                buildCadenceDataFromSpec(); // Reutilizamos esta función existente.
            }
        } else {
            cadenceSpec = null; // No hay cadencia guardada.
        }
    } catch (error) {
        console.error("Error al cargar la cadencia desde Firestore:", error);
        cadenceSpec = null; // En caso de error, aseguramos un estado limpio.
    }
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

// Limpieza de cadencia (versión simplificada y conectada a Firestore)
function clearCadencePrompt() {
    if (confirm("¿Seguro que quieres eliminar la cadencia activa? Esta acción no se puede deshacer.")) {
        cadenceSpec = null;
        cadenceData = []; // Vaciar los datos locales inmediatamente

        // Guardar el estado 'null' en Firestore para persistir el cambio
        saveCadenceSpec(null);

        // Volver a renderizar el calendario para reflejar el cambio al instante
        renderCalendar(currentMonth, currentYear);
        
        alert("La cadencia ha sido eliminada.");
    }
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

// =================================================================
//    NUEVO GESTOR DE ALIAS DE USUARIO (SOLO COORDINADOR)
// =================================================================
function initAliasManager() {
    // 1. Solo se ejecuta si el usuario es Coordinador
    if (!AppState.isCoordinator) return;

    // 2. Localizamos el DIV que contiene el botón "Enviar Petición"
    const peticionesControles = document.querySelector('.peticiones-controles');
    if (!peticionesControles) {
        console.error("Error en Gestor de Alias: No se encontró el contenedor '.peticiones-controles'.");
        return;
    }

    // 3. Crear el botón para abrir el gestor de alias
    const openManagerBtn = document.createElement('button');
    openManagerBtn.id = 'btn-open-alias-manager';
    openManagerBtn.className = 'modern-btn';
    openManagerBtn.innerHTML = '👤 <span class="btn-text">Gestionar Alias</span>';
    openManagerBtn.title = 'Asignar nombres a los usuarios';
    openManagerBtn.style.backgroundColor = '#6c757d';
    // --- CORRECCIÓN: Se ha arreglado el nombre de la variable aquí ---
    openManagerBtn.style.marginRight = '10px'; 

    // 4. Insertamos el nuevo botón ANTES del botón de "Enviar Petición"
    const enviarBtn = document.getElementById('enviar-peticion');
    if (enviarBtn) {
        peticionesControles.insertBefore(openManagerBtn, enviarBtn);
    } else {
        peticionesControles.appendChild(openManagerBtn); // Fallback
    }

    // 5. Crear el HTML del modal (esto no cambia)
    const modalHTML = `
        <div id="alias-manager-overlay">
            <div id="alias-manager-modal">
                <h3>Gestor de Alias de Usuarios</h3>
                <div id="alias-list-container">
                    <p>Asigna un nombre o número a cada usuario para identificarlo fácilmente en las peticiones.</p>
                    <div id="alias-list">Cargando usuarios...</div>
                </div>
                <div id="alias-manager-actions">
                    <button id="btn-close-alias" class="modern-btn">Cerrar</button>
                    <button id="btn-save-alias" class="modern-btn green">Guardar Cambios</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.getElementById('alias-manager-overlay');
    const saveBtn = document.getElementById('btn-save-alias');
    const closeBtn = document.getElementById('btn-close-alias');
    const aliasListDiv = document.getElementById('alias-list');
    
    const db = firebase.firestore();

    // El resto de la función (loadUsersAndAliases, saveAliases, eventos) permanece exactamente igual...
    
    async function loadUsersAndAliases() {
        aliasListDiv.innerHTML = 'Cargando usuarios...';
        try {
            const snapshot = await db.collection('userData').get();
            const users = snapshot.docs.map(doc => ({
                uid: doc.id,
                alias: doc.data().alias || '',
                originalName: doc.data().userName || doc.id
            }));

            aliasListDiv.innerHTML = '';
            if (users.length === 0) {
                aliasListDiv.innerHTML = '<p>Aún no se han registrado otros usuarios.</p>';
                return;
            }

            users.forEach(user => {
                const item = document.createElement('div');
                item.className = 'alias-item';
                item.innerHTML = `
                    <span class="alias-uid" title="${user.uid}">(${user.originalName})</span>
                    <input type="text" class="alias-input" data-uid="${user.uid}" value="${user.alias}" placeholder="Nombre o alias...">
                `;
                aliasListDiv.appendChild(item);
            });

        } catch (error) {
            console.error("Error al cargar usuarios para el gestor de alias:", error);
            aliasListDiv.innerHTML = 'Error al cargar los datos. Inténtalo de nuevo.';
        }
    }

    async function saveAliases() {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        const batch = db.batch();
        const inputs = aliasListDiv.querySelectorAll('.alias-input');

        inputs.forEach(input => {
            const uid = input.dataset.uid;
            const newAlias = input.value.trim();
            const userDocRef = db.collection('userData').doc(uid);
            batch.set(userDocRef, { alias: newAlias }, { merge: true });
        });

        try {
            await batch.commit();
            if (window.TurnApp && typeof window.TurnApp.reloadPeticiones === 'function') {
                window.TurnApp.reloadPeticiones();
            }
            overlay.classList.remove('visible');
        } catch (error) {
            console.error("Error al guardar los alias:", error);
            alert('No se pudieron guardar los cambios. Revisa la consola.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Guardar Cambios';
        }
    }

    // Eventos
    openManagerBtn.addEventListener('click', () => {
        overlay.classList.add('visible');
        loadUsersAndAliases();
    });

    closeBtn.addEventListener('click', () => overlay.classList.remove('visible'));
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('visible');
        }
    });

    saveBtn.addEventListener('click', saveAliases);
}

// =================================================================
//    NUEVA VERSIÓN de initPeticiones (CONECTADA A ALIAS)
// =================================================================
function initPeticiones() {
    const listaUsuario = document.getElementById('lista-peticiones-usuario');
    const peticionTexto = document.getElementById('peticion-texto');
    const enviarPeticionBtn = document.getElementById('enviar-peticion');

    if (!listaUsuario || !peticionTexto || !enviarPeticionBtn) {
        console.error("initPeticiones: faltan elementos del DOM.");
        return;
    }

    const db = firebase.firestore();
    const peticionesCollection = db.collection('groups').doc(AppState.groupId).collection('peticiones');
    const userDataCollection = db.collection('userData');
    
    let userAliases = {}; // Caché local para los alias y nombres de usuario
    let unsubscribe = null; // Para poder detener el listener de peticiones al recargar

    // 1. Función para obtener TODOS los alias y nombres de usuario
    async function fetchAliases() {
        try {
            const snapshot = await userDataCollection.get();
            const aliases = {};
            snapshot.forEach(doc => {
                aliases[doc.id] = {
                    alias: doc.data().alias || '',
                    // Guardamos el userName original como respaldo
                    userName: doc.data().userName || doc.id 
                };
            });
            userAliases = aliases;
            console.log("Alias de usuarios cargados/actualizados:", userAliases);
        } catch (error) {
            console.error("Error al cargar los alias de usuario:", error);
        }
    }

    // 2. Función para renderizar una única petición, usando los alias
    function renderPeticion(peticion) {
        const li = document.createElement('li');
        li.className = 'peticion-item';
        li.dataset.id = peticion.id;

        const fechaHora = peticion.createdAt ? new Date(peticion.createdAt).toLocaleString('es-ES') : 'Fecha no disponible';
        
        // --- ¡LÓGICA MEJORADA PARA MOSTRAR EL NOMBRE! ---
        const userData = userAliases[peticion.userId];
        // Prioridad: 1. Alias, 2. Nombre de usuario original, 3. 'Usuario desconocido'
        const autor = (userData?.alias) ? userData.alias : (peticion.userName || 'Usuario desconocido');
        // --- Fin de la mejora ---

        const revisadoCheckbox = `
            <input type="checkbox" 
                   ${peticion.revisada ? 'checked' : ''} 
                   ${!AppState.isCoordinator ? 'disabled' : ''} 
                   title="${AppState.isCoordinator ? 'Marcar como revisada' : 'Estado de la petición'}">
        `;

        li.innerHTML = `
            <div class="peticion-left">
                <div class="peticion-texto">${peticion.texto}</div>
                <div class="fecha-hora">De: <strong>${autor}</strong> - ${fechaHora}</div>
            </div>
            <div class="peticion-right">
                ${revisadoCheckbox}
                <button class="delete-btn modern-btn red" 
                        title="Eliminar petición" 
                        ${!AppState.isCoordinator ? 'style="display:none;"' : ''}>
                    🗑️
                </button>
            </div>
        `;

        // Eventos de la petición...
        if (AppState.isCoordinator) {
            const chk = li.querySelector('input[type="checkbox"]');
            chk.addEventListener('change', () => {
                peticionesCollection.doc(peticion.id).update({ revisada: chk.checked });
            });
            const delBtn = li.querySelector('.delete-btn');
            delBtn.addEventListener('click', () => {
                if (confirm('¿Seguro que quieres eliminar esta petición?')) {
                    peticionesCollection.doc(peticion.id).delete().catch(err => console.error("Error al eliminar petición:", err));
                }
            });
        }
        return li;
    }

    // 3. Función principal que escucha cambios en las peticiones
    function listenForPeticiones() {
        if (unsubscribe) {
            unsubscribe(); // Detenemos el listener anterior si existe
        }
        
        unsubscribe = peticionesCollection.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            listaUsuario.innerHTML = '';
            if (snapshot.empty) {
                listaUsuario.innerHTML = '<li>No hay peticiones.</li>';
                return;
            }
            snapshot.forEach(doc => {
                const peticion = { id: doc.id, ...doc.data() };
                listaUsuario.appendChild(renderPeticion(peticion));
            });
        }, error => {
            console.error("Error al escuchar peticiones:", error);
            listaUsuario.innerHTML = '<li>Error al cargar las peticiones.</li>';
        });
    }

    // 4. Función para recargar todo (se llamará desde el gestor de alias)
    async function reloadPeticiones() {
        listaUsuario.innerHTML = '<li>Actualizando nombres...</li>';
        await fetchAliases();     // Primero actualiza la caché de nombres
        listenForPeticiones();    // Después, vuelve a dibujar las peticiones
    }

    // 5. Exponemos la función de recarga para que sea accesible globalmente
    window.TurnApp = window.TurnApp || {};
    window.TurnApp.reloadPeticiones = reloadPeticiones;
    
    // 6. Evento para enviar una nueva petición
    enviarPeticionBtn.addEventListener('click', () => {
        const texto = peticionTexto.value.trim();
        if (!texto) return;

        enviarPeticionBtn.disabled = true;
        const nuevaPeticion = {
            texto: texto,
            createdAt: new Date().toISOString(),
            revisada: false,
            userId: AppState.userId,
            userName: AppState.userName // Guardamos el nombre original siempre
        };

        peticionesCollection.add(nuevaPeticion)
            .then(() => { peticionTexto.value = ''; })
            .catch(error => { console.error("Error al añadir petición:", error); })
            .finally(() => { enviarPeticionBtn.disabled = false; peticionTexto.focus(); });
    });

    // 7. Carga inicial
    reloadPeticiones();
}

/* ================================================================= */
/*    NUEVO GESTOR DE NOTIFICACIONES CONECTADO A FIREBASE (v2)       */
/* ================================================================= */
async function initNotificationManager() {
    const db = firebase.firestore();
    const userDocRef = db.collection('userData').doc(AppState.userId);

    const navTablon = document.querySelector('.nav-btn[data-section="tablon"]');
    const navDocs = document.querySelector('.nav-btn[data-section="documentos"]');

    if (!navTablon || !navDocs) {
        console.error("NotificationManager: No se encontraron los botones de navegación.");
        return;
    }

    let seenFileIds = new Set();

    // 1. Carga los IDs de los archivos que el usuario ya ha visto
    async function loadSeenIds() {
        try {
            const userDoc = await userDocRef.get();
            if (userDoc.exists && Array.isArray(userDoc.data().seenFileIds)) {
                seenFileIds = new Set(userDoc.data().seenFileIds);
            }
        } catch (error) {
            console.error("Error al cargar IDs vistos:", error);
        }
    }

    // 2. Comprueba si hay archivos sin ver en una colección
    async function hasUnseen(collectionName) {
        try {
            const snapshot = await db.collection('groups').doc(AppState.groupId).collection(collectionName).get();
            const allFileIds = snapshot.docs.map(doc => doc.id);
            // Si algún ID de la colección no está en el set de "vistos", devuelve true
            return allFileIds.some(id => !seenFileIds.has(id));
        } catch (error) {
            console.error(`Error comprobando ${collectionName}:`, error);
            return false;
        }
    }

    // 3. Actualiza la UI con los puntos rojos
    async function checkAndDisplayNotifications() {
        // Ejecutamos las comprobaciones en paralelo para más eficiencia
        const [unseenTablon, unseenDocs] = await Promise.all([
            hasUnseen('tablonFiles'),
            hasUnseen('documentos')
        ]);
        
        navTablon.classList.toggle('has-notification', unseenTablon);
        navDocs.classList.toggle('has-notification', unseenDocs);
    }

    // 4. Marca todos los archivos de una sección como "vistos"
    async function markSectionAsSeen(collectionName) {
        try {
            const snapshot = await db.collection('groups').doc(AppState.groupId).collection(collectionName).get();
            const allFileIds = snapshot.docs.map(doc => doc.id);
            
            let changed = false;
            allFileIds.forEach(id => {
                if (!seenFileIds.has(id)) {
                    seenFileIds.add(id);
                    changed = true;
                }
            });

            // Si se añadieron nuevos IDs, los guardamos en Firestore
            if (changed) {
                await userDocRef.set({ seenFileIds: Array.from(seenFileIds) }, { merge: true });
            }
        } catch (error) {
            console.error(`Error marcando como vista la sección ${collectionName}:`, error);
        } finally {
            // Re-evaluamos las notificaciones para que el punto rojo desaparezca al instante
            await checkAndDisplayNotifications();
        }
    }

    // 5. Eventos y carga inicial
    navTablon.addEventListener('click', () => markSectionAsSeen('tablonFiles'));
    navDocs.addEventListener('click', () => markSectionAsSeen('documentos'));
    
    // Al iniciar, cargamos los datos y hacemos la primera comprobación
    await loadSeenIds();
    await checkAndDisplayNotifications();

    // Hacemos la función de chequeo global por si se necesita desde fuera
    window.TurnApp = window.TurnApp || {};
    window.TurnApp.checkAndDisplayNotifications = checkAndDisplayNotifications;
}

// =========================================================================
// ARRANQUE v8.0 - LÓGICA DE INICIO DINÁMICA Y MULTI-GRUPO
// =========================================================================

/**
 * Función principal que arranca la aplicación tras el login.
 * Ahora determina si el usuario es Super Admin, si pertenece a un grupo,
 * y carga la interfaz correspondiente.
 */
async function initializeAndStartApp(user) {
    if (!user) return;

    // --- 1. Configuración básica del estado ---
    AppState.userId = user.uid;
    AppState.userName = user.displayName || user.email.split('@')[0];
    AppState.isSuperAdmin = (user.uid === SUPER_ADMIN_UID);

    console.log(`Usuario conectado: ${AppState.userName} (Super Admin: ${AppState.isSuperAdmin})`);
    
    // Ocultamos el contenido principal mientras averiguamos el grupo
    const mainContent = document.getElementById('content');
    const appHeader = document.querySelector('.main-header');
    if (mainContent) mainContent.style.display = 'none';
    if (appHeader) appHeader.style.display = 'none';

    // --- 2. Lógica de asignación de grupo ---
    const db = firebase.firestore();
    const userDocRef = db.collection('userData').doc(user.uid);

    try {
        const userDoc = await userDocRef.get();
        // Buscamos a qué grupo pertenece el usuario
        const groupIdFromDB = userDoc.exists ? userDoc.data().memberOfGroup : null;

        if (groupIdFromDB) {
            // --- CASO A: El usuario pertenece a un grupo ---
            AppState.groupId = groupIdFromDB;
            const groupDocRef = db.collection('groups').doc(AppState.groupId);
            const groupDoc = await groupDocRef.get();

            if (groupDoc.exists) {
                const groupData = groupDoc.data();
                AppState.groupName = groupData.groupName || "Grupo sin nombre";
                // Comprobamos si el usuario es el coordinador de ESTE grupo
                AppState.isCoordinator = (user.uid === groupData.coordinatorId);
            } else {
                 throw new Error(`El grupo '${AppState.groupId}' asignado a tu usuario no existe. Contacta con el administrador.`);
            }

            console.log("Estado final de la app:", AppState);
            
            // Mostramos la UI principal y arrancamos los módulos
            if (mainContent) mainContent.style.display = 'block';
            if (appHeader) appHeader.style.display = 'flex';
            await initializeAppModules();

        } else {
            // --- CASO B: El usuario NO pertenece a ningún grupo ---
            if (AppState.isSuperAdmin) {
                // Es el Super Admin sin grupo -> mostramos su panel de creación
                displayAdminPanel();
            } else {
                // Es un usuario normal sin grupo -> mostramos mensaje de espera
                displayLimboScreen("Tu cuenta aún no ha sido asignada a un grupo. Por favor, contacta con tu coordinador.");
            }
        }
    } catch (error) {
        console.error("Error fatal durante la inicialización:", error);
        displayLimboScreen(`Error al iniciar la aplicación: ${error.message}. Recarga la página o contacta con soporte.`);
    }
}

/**
 * Agrupa la inicialización de todos los módulos de la aplicación.
 * Se llama únicamente cuando el usuario tiene un grupo asignado.
 */
async function initializeAppModules() {
    console.log("Inicializando módulos de la aplicación...");
    // El orden es importante para las dependencias
    await Promise.all([restoreManualEdits(), restoreCadenceSpec(), initLicenciasPanel()]);
    await initThemeSwitcher();
    
    initApp();
    initCoordinatorTable();
    initTablon();
    initDocumentosPanel();
    initPeticiones();
    initAliasManager();
    initEditableTitle();
    initNotificationManager();
    console.log("Módulos inicializados.");
}

/**
 * Muestra una pantalla completa con un mensaje. Se usa para usuarios sin
 * grupo asignado o para mostrar errores fatales.
 */
function displayLimboScreen(message) {
    let limboScreen = document.getElementById('limbo-screen');
    if (!limboScreen) {
        document.body.innerHTML = ''; // Limpiamos el body para evitar conflictos
        limboScreen = document.createElement('div');
        limboScreen.id = 'limbo-screen';
        limboScreen.style.cssText = 'display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; text-align: center; padding: 20px; font-size: 1.2em; background-color: var(--bg-color); color: var(--text-color);';
        document.body.appendChild(limboScreen);
    }
    limboScreen.innerHTML = `<img src="icon-192x192.png" alt="TurnApp Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
                             <p>${message}</p>`;
    limboScreen.style.display = 'flex';
}

/**
 * Placeholder para la futura función del panel de Super Admin.
 * Por ahora, solo muestra un mensaje de bienvenida.
 */
function displayAdminPanel() {
    displayLimboScreen("¡Bienvenido, Super Admin! Aquí aparecerá tu panel para gestionar los grupos de la plataforma.");
}

// =========================================================================
// INICIADOR GLOBAL DE LA APLICACIÓN (v8.0) - VERSIÓN CORREGIDA Y CENTRALIZADA
// Este será el único punto de entrada llamado desde index.html
// =========================================================================
function TurnAppGlobalInitializer() {
    const loginContainer = document.getElementById('auth-container'); // ID correcto de tu HTML
    const appContainer = document.getElementById('app'); // ID correcto de tu HTML
    const mainContent = document.getElementById('content');
    const appHeader = document.querySelector('.app-header'); // Selector correcto de tu HTML
    const splashScreen = document.getElementById('splash');

    // Ocultamos todo al principio para evitar parpadeos
    if (splashScreen) splashScreen.style.display = 'flex';
    if (loginContainer) loginContainer.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';

    // --- Lógica del formulario de Login/Registro (movida desde index.html) ---
    const emailInput = document.getElementById('auth-email'), 
          passwordInput = document.getElementById('auth-password'), 
          submitBtn = document.getElementById('auth-submit-btn'), 
          toggleLink = document.getElementById('auth-toggle-link'), 
          authTitle = document.getElementById('auth-title'), 
          errorContainer = document.getElementById('auth-error');
    
    if (submitBtn) {
        let isLoginMode = true;
        toggleLink.addEventListener('click', (e) => { 
            e.preventDefault(); 
            isLoginMode = !isLoginMode; 
            authTitle.textContent = isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta'; 
            submitBtn.textContent = isLoginMode ? 'Acceder' : 'Registrarse'; 
            const toggleText = toggleLink.previousSibling;
            if(toggleText) toggleText.textContent = isLoginMode ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '; 
            toggleLink.textContent = isLoginMode ? 'Regístrate' : 'Inicia sesión'; 
            errorContainer.textContent = ''; 
        });
        submitBtn.addEventListener('click', () => { 
            const email = emailInput.value, password = passwordInput.value; 
            errorContainer.textContent = ''; 
            if (!email || !password) { 
                errorContainer.textContent = 'Por favor, introduce email y contraseña.'; 
                return; 
            } 
            if (isLoginMode) { 
                firebase.auth().signInWithEmailAndPassword(email, password).catch(error => { errorContainer.textContent = 'Error: ' + error.message; }); 
            } else { 
                firebase.auth().createUserWithEmailAndPassword(email, password).catch(error => { errorContainer.textContent = 'Error: ' + error.message; }); 
            } 
        });
    }
    // --- Fin de la lógica del formulario ---

    firebase.auth().onAuthStateChanged(async (user) => {
        if (splashScreen) splashScreen.style.display = 'none'; // Ocultar splash en cualquier caso

        if (user) {
            // Usuario conectado -> Ocultar login, mostrar app e inicializar
            if (loginContainer) loginContainer.style.display = 'none';
            if (appContainer) appContainer.style.display = 'block';

            const logoutBtn = document.getElementById('btn-logout');
            if(logoutBtn) logoutBtn.style.display = 'block';
            
            await initializeAndStartApp(user);
        } else {
            // Usuario no conectado -> Mostrar login, ocultar app
            if (loginContainer) loginContainer.style.display = 'flex';
            if (appContainer) appContainer.style.display = 'none';

            const limboScreen = document.getElementById('limbo-screen');
            if(limboScreen) limboScreen.remove();

            const logoutBtn = document.getElementById('btn-logout');
            if(logoutBtn) logoutBtn.style.display = 'none';

            if (mainContent) mainContent.style.display = 'block';
            if (appHeader) appHeader.style.display = 'flex';
        }
    });
}

  // ------------------ FIN app.js ------------------