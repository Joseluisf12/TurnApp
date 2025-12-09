// =========================================================================
// TurnApp v7.0 - Versión Estable
// =========================================================================
// Esta versión incluye todas las funcionalidades para un solo usuario,
// cálculo de festivos variables y correcciones de UI.
// Sirve como base para el futuro desarrollo multi-usuario.

// =========================================================================
// VARIABLE GLOBAL PARA LA BASE DE DATOS
// =========================================================================
let db; // ¡IMPORTANTE! Única variable `db`, declarada aquí.

// =========================================================================
// GESTOR DE TEMA (CLARO/OSCURO) SINCRONIZADO CON FIREBASE (v3 - Corregido)
// =========================================================================
async function initThemeSwitcher() {
    const themeToggleButton = document.getElementById("btn-toggle-theme");
    const body = document.body;
    if (!themeToggleButton) return;

    // 1. Referencia al documento del usuario en Firestore
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


// =================================================================
// INICIO DEL initCoordinatorTable v5.3 (BOTONES Y REDIBUJADO CORREGIDOS)
// =================================================================
function initCoordinatorTable() {
    const tabla = document.getElementById("tabla-coordinador");
    if (!tabla) return;
    const thead = tabla.querySelector("thead");
    const tbody = tabla.querySelector("tbody");
    
    // --- 1. REFERENCIAS Y CONSTANTES ---\
    const docRef = db.collection('groups').doc(AppState.groupId).collection('appData').doc('coordinatorTable');
    const controls = { addRow: document.getElementById('btn-add-row'), removeRow: document.getElementById('btn-remove-row'), addCol: document.getElementById('btn-add-col'), removeCol: document.getElementById('btn-remove-col'), limpiar: document.getElementById('limpiar-tabla') };
    const COORDINATOR_PALETTE = ['#ef9a9a', '#ffcc80', '#fff59d', '#f48fb1', '#ffab91', '#e6ee9c', '#a5d6a7', '#80cbc4', '#81d4fa', '#c5e1a5', '#80deea', '#90caf9', '#ce93d8', '#b39ddb', '#bcaaa4', '#eeeeee', '#b0bec5', 'initial'];
    const DEFAULT_COLS = [{ id: 'th-m1', header: 'M¹' }, { id: 'th-t1', header: 'T¹' }, { id: 'th-m2', header: 'M²' }, { id: 'th-t2', header: 'T²' }, { id: 'th-n', header: 'N' }];
    const NUM_STATIC_COLS_START = 2, NUM_STATIC_COLS_END = 1;

    // --- 2. MODELO DE DATOS ---\
    const createDefaultCell = () => ({ text: '', color: '' });
    const createDefaultRow = (numTurnCols) => ({ id: `row_${Date.now()}_${Math.random()}`, cells: Array(NUM_STATIC_COLS_START + numTurnCols + NUM_STATIC_COLS_END).fill(null).map(createDefaultCell) });
    const createDefaultTable = () => ({ headers: {}, cols: DEFAULT_COLS, rowData: Array(18).fill(null).map(() => createDefaultRow(DEFAULT_COLS.length)) });

    let tableState = {};
    let selectedRowIndex = -1;
    let localUpdate = false;

    // --- 3. RENDERIZADO Y AYUDANTES ---\
    function renderBody() {
        tbody.innerHTML = '';
        if (!tableState.rowData) return;
        tableState.rowData.forEach((rowDataItem, rowIndex) => {
            const row = tbody.insertRow();
            row.dataset.rowIndex = rowIndex;
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
    
    // --- 4. GESTIÓN DE DATOS CON FIRESTORE ---\
    function onRemoteUpdate(doc) {
        if (localUpdate) return;
        const data = doc.data();
        if (data && Array.isArray(data.rowData)) {
            tableState = data;
        } else {
            tableState = createDefaultTable();
            docRef.set(tableState).catch(console.error);
            return;
        }
        renderColgroup(); renderHeaders(); renderBody(); updateControlsVisibility();
    }
    function updateControlsVisibility() { const display = AppState.isCoordinator ? 'inline-block' : 'none'; Object.values(controls).forEach(btn => { if(btn) btn.style.display = display; }); }

    // --- 5. VINCULACIÓN DE EVENTOS ---\
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
            renderBody();
            updateFirestore();
        };

        if (controls.removeRow) controls.removeRow.onclick = () => {
            if (selectedRowIndex === -1) return alert("Por favor, selecciona una fila para eliminar.");
            if (confirm("¿Seguro que quieres eliminar la fila seleccionada?")) {
                tableState.rowData.splice(selectedRowIndex, 1);
                selectedRowIndex = -1;
                renderBody();
                updateFirestore();
            }
        };

        if (controls.addCol) controls.addCol.onclick = () => {
            const name = prompt("Nombre nueva columna:", `T${(tableState.cols?.length || 0) + 1}`);
            if (name) {
                tableState.cols.push({ id: `th-c-${Date.now()}`, header: name.trim() });
                tableState.rowData.forEach(row => { row.cells.splice(NUM_STATIC_COLS_START + tableState.cols.length - 1, 0, createDefaultCell()); });
                renderColgroup(); renderHeaders(); renderBody();
                updateFirestore();
            }
        };

        if (controls.removeCol) controls.removeCol.onclick = () => {
            if ((tableState.cols?.length || 0) > 0 && confirm("¿Eliminar la última columna de turno?")) {
                tableState.cols.pop();
                tableState.rowData.forEach(row => { row.cells.splice(NUM_STATIC_COLS_START + tableState.cols.length, 1); });
                renderColgroup(); renderHeaders(); renderBody();
                updateFirestore();
            }
        };
        
        if (controls.limpiar) controls.limpiar.onclick = () => {
            if (confirm("¿Borrar TODOS los textos y colores de la tabla?")) {
                tableState.rowData = tableState.rowData.map(() => createDefaultRow(tableState.cols.length));
                renderBody();
                updateFirestore();
            }
        };

        thead.addEventListener('blur', (e) => { const th = e.target.closest('th'); if (th?.isContentEditable) { tableState.headers[th.id] = th.innerText.trim(); updateFirestore(); } }, true);
        tbody.addEventListener('blur', (e) => { const editor = e.target.closest('.text-editor'); if (editor?.isContentEditable) { const cell = editor.closest('td'); const row = editor.closest('tr'); if (cell && row) { tableState.rowData[row.dataset.rowIndex].cells[cell.cellIndex].text = editor.innerText.trim(); updateFirestore(); } } }, true);
        tbody.addEventListener('click', (e) => { const fila = e.target.closest("tr"); if (fila?.parentElement === tbody) { tbody.querySelectorAll("tr.seleccionada").forEach(tr => tr.classList.remove("seleccionada")); fila.classList.add("seleccionada"); selectedRowIndex = parseInt(fila.dataset.rowIndex, 10); } });
    }
    
    // --- 6. AUTOCONTENCIÓN Y ARRANQUE ---\
    var openColorPicker= (t,c)=>{document.getElementById("coord-color-palette")?.remove();const p=document.createElement("div");p.id="coord-color-palette",Object.assign(p.style,{position:"absolute",display:"flex",flexWrap:"wrap",width:"250px",gap:"8px",padding:"10px",backgroundColor:"var(--panel-bg)",borderRadius:"8px",boxShadow:"0 4px 15px rgba(0, 0, 0, 0.2)",zIndex:"100"}),COORDINATOR_PALETTE.forEach(e=>{const o=document.createElement("button");o.className="palette-swatch",Object.assign(o.style,{width:"30px",height:"30px",borderRadius:"50%",cursor:"pointer",border:"2px solid var(--bg-color)",display:"flex",alignItems:"center",justifyContent:"center"}),"initial"===e?(o.innerHTML="\\ud83d\\udd04",o.title="Quitar color"):o.style.backgroundColor=e,o.style.backgroundColor="initial"===e?"var(--button-bg-color)":e,o.onclick=()=>{c(e),p.remove()},p.appendChild(o)}),document.body.appendChild(p);const l=t.getBoundingClientRect();let a=window.scrollX+l.left;a+250>window.innerWidth&&(a=window.innerWidth-260),p.style.top=`${window.scrollY+l.bottom+5}px`,p.style.left=`${a}px`;const r=e=>{p.contains(e.target)||e.target===t||(p.remove(),document.removeEventListener("click",r,!0))};setTimeout(()=>document.addEventListener("click",r,!0),100)};
    var renderColgroup=()=>{let t=tabla.querySelector("colgroup");t||(t=document.createElement("colgroup"),tabla.insertBefore(t,thead));const e=tableState.cols?.length||0,o=e>0?(100-9-18-35)/e:0;let l=`<col style="width:9%;"><col style="width:18%;">`;for(let t=0;t<e;t++)l+=`<col style="width:${o}%;">`;l+='<col style="width:35%;">',t.innerHTML=l};
    var renderHeaders=()=>{thead.innerHTML="";const t=thead.insertRow(),e=thead.insertRow(),o=tableState.cols?.length||0;t.innerHTML=`<th colspan="2">FUNCIONARIO/A</th><th id="th-ciclo" colspan="${o||1}" class="titulo-ciclo">${tableState.headers?.["th-ciclo"]||"CICLO"}</th><th colspan="1">OBSERVACIONES</th>`,e.innerHTML="<th>N\\xba</th><th>NOMBRE</th>",tableState.cols?.forEach(t=>{e.innerHTML+=`<th id="${t.id}">${tableState.headers?.[t.id]||t.header}</th>`}),e.innerHTML+=`<th id="th-cocina">${tableState.headers?.["th-cocina"]||"COCINA"}</th>`,AppState.isCoordinator&&thead.querySelectorAll("th[id]").forEach(t=>{t.contentEditable=!0})};

    docRef.onSnapshot(onRemoteUpdate, (error) => { console.error("Error al sincronizar tabla:", error); tbody.innerHTML = '<tr><td colspan="8">Error al cargar datos.</td></tr>'; });
    bindCoordinatorEvents();
}

// =================================================================
//    NUEVA VERSIÓN de initTablon (CONECTADA A FIREBASE)
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

    const storage = firebase.storage();
    const filesCollection = db.collection('groups').doc(AppState.groupId).collection('tablonFiles');

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
                fileItem.dataset.id = file.id;
                fileItem.dataset.storagePath = file.storagePath;

                const infoDiv = document.createElement('div');
                infoDiv.className = 'tablon-item-info';

                const nameStrong = document.createElement('strong');
                nameStrong.className = 'tablon-item-name';
                nameStrong.textContent = file.name;
                nameStrong.contentEditable = true;
                nameStrong.title = "Haz clic para editar el nombre";

                nameStrong.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.target.blur();
                    }
                });

                nameStrong.addEventListener('blur', async (e) => {
                    const newName = e.target.textContent.trim();
                    const docId = fileItem.dataset.id;
                    if (!docId || !newName) {
                        e.target.textContent = file.name;
                        return;
                    }

                    if (newName !== file.name) {
                        const originalOpacity = e.target.style.opacity;
                        e.target.style.opacity = '0.5';
                        try {
                            await filesCollection.doc(docId).update({ name: newName });
                            file.name = newName;
                            const downloadBtn = fileItem.querySelector('.download-btn');
                            if (downloadBtn) {
                                downloadBtn.dataset.name = newName;
                            }
                        } catch (error) {
                            console.error("Error al actualizar el nombre del archivo:", error);
                            alert(`Error al cambiar el nombre: ${error.message}`);
                            e.target.textContent = file.name;
                        } finally {
                           e.target.style.opacity = originalOpacity;
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

    function handleUpload(file) {
        if (!file) return;
        const timestamp = Date.now();
        const storagePath = `tablon/${AppState.groupId}/${timestamp}-${file.name}`;
        const storageRef = storage.ref(storagePath);
        const uploadTask = storageRef.put(file);

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
                renderFiles();
            }
        );
    }

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
                        imgPreview.dataset.viewUrl = lastFile.downloadURL;
                        imgPreview.style.display = 'block';
                        overlay.style.display = 'none';
                    }

                    filesForCategory.forEach(file => {
                        const fileItem = document.createElement('div');
                        fileItem.className = 'documento-file-item';
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
            null,
            (error) => {
                console.error("Error en la subida del PDF:", error);
                alert(`Error al subir el PDF: ${error.message}`);
                renderDocs();
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
                    thumbnail: thumbnail
                };
                await docsCollection.add(fileData);
                renderDocs();
            }
        );
    }

    documentosSection.addEventListener('click', async (event) => {
        const target = event.target;
        const fileItem = target.closest('.documento-file-item');

        if (target.matches('.btn-upload-pdf')) {
            currentUploadCategory = target.dataset.category;
            pdfInput.value = null;
            pdfInput.click();
            return;
        }

        if (target.matches('.doc-view-btn')) {
            const url = fileItem.dataset.viewUrl;
            if (window.innerWidth < 768) {
                window.open(url, '_blank');
            } else {
                modalPdfContent.src = url;
                pdfModal.classList.remove('oculto');
            }
            return;
        }

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

        if (target.matches('.doc-download-btn')) {
            target.disabled = true;
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

        if (target.matches('.doc-delete-btn')) {
             if (confirm(`¿Seguro que quieres eliminar "${fileItem.dataset.fileName}"?`)) {
                try {
                    fileItem.style.opacity = '0.5';
                    target.disabled = true;
                    await storage.ref(fileItem.dataset.storagePath).delete();
                    await docsCollection.doc(fileItem.dataset.id).delete();
                    renderDocs();
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
    
    modalCloseBtn.addEventListener('click', () => pdfModal.classList.add('oculto'));
    pdfModal.addEventListener('click', (e) => { if (e.target === pdfModal) pdfModal.classList.add('oculto'); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pdfModal.classList.contains('oculto')) { pdfModal.classList.add('oculto'); }});

    renderDocs();
}

// ---------------- estado ----------------
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let cadenceData = []; // array con {date: Date, type: string}
let cadenceSpec = null; // { type: 'V-1'|'V-2'|'Personalizada', startISO: '', pattern: [...], v1Index:0 }
let manualEdits = {}; // mapa "YYYY-MM-DD" -> { M: { text?, color?, userColor? }, T:..., N:... }

const AppState = {
    groupId: 'equipo_alpha',
    
    // !! IMPORTANTE !!
    // Pega aquí tu "User ID" de Firebase para asignarte como Coordinador.
    // Lo encuentras en: Firebase Console > Authentication > Users tab.
    coordinatorId: 'rD3KBeWoJEgyhXQXoFV58ia6N3x1', 
    
    userId: null,        // Se establecerá dinámicamente en el login.
    userName: null,      // También lo guardaremos en el login.
    isCoordinator: false // Se calculará automáticamente en el login.
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
let saveTimeout = null; 

async function restoreManualEdits() {
    if (!AppState.userId) {
        manualEdits = {};
        return; 
    }

    const userDocRef = db.collection('userData').doc(AppState.userId);

    try {
        const doc = await userDocRef.get();
        if (doc.exists && doc.data().manualEdits) {
            manualEdits = doc.data().manualEdits;
            console.log("Calendario: Ediciones manuales cargadas desde Firestore.");
        } else {
            manualEdits = {};
            console.log("Calendario: No se encontraron ediciones guardadas en la nube.");
        }
    } catch (error) {
        console.error("Error al cargar el calendario desde Firestore:", error);
        manualEdits = {};
    }
}

function saveManualEdits() {
    if (!AppState.userId) return; 

    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
        const userDocRef = db.collection('userData').doc(AppState.userId);
        
        console.log(`Guardando calendario en la nube para ${AppState.userId}...`);
        
        userDocRef.set({ manualEdits: manualEdits }, { merge: true })
            .catch(error => {
                console.error("Error al guardar calendario en Firestore:", error);
            });
    }, 1500); 
}

// 2. NUEVA FUNCIÓN DE LICENCIAS (CONECTADA A FIRESTORE)
async function initLicenciasPanel() {
    const licenciasContainer = document.getElementById('licencias-container');
    if (!licenciasContainer) return;

    const items = licenciasContainer.querySelectorAll('.licencia-item');
    const totalCargaEl = document.getElementById('total-carga');
    const totalConsumidosEl = document.getElementById('total-consumidos');
    const totalRestanEl = document.getElementById('total-restan');
    
    let saveTimeout = null;

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
            
            const userDocRef = db.collection('userData').doc(AppState.userId);
            console.log(`Guardando licencias en la nube para ${AppState.userId}...`);
            userDocRef.set({ licenciasData: state }, { merge: true })
                .catch(error => console.error("Error al guardar licencias en Firestore:", error));
        }, 1500);
    }

    async function loadState() {
        if (!AppState.userId) return;
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

    await loadState();
    updateCalculations();
}

// =========================================================================
// LÓGICA PARA EL TÍTULO EDITABLE (CONECTADO A FIREBASE)
// =========================================================================
function initEditableTitle() {
    const titleElement = document.getElementById('editable-title');
    if (!titleElement) return;

    // 1. Referencia al documento del grupo en Firestore
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
            if (titleElement.textContent !== doc.data().groupName) {
                titleElement.textContent = doc.data().groupName;
            }
        } else {
            const defaultText = "Nombre del Grupo";
            if (titleElement.textContent !== defaultText) {
                 titleElement.textContent = defaultText;
            }
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
                groupDocRef.get().then(doc => {
                    if (!doc.exists || doc.data().groupName !== newTitle) {
                        console.log("Guardando nuevo nombre de grupo en Firestore:", newTitle);
                        groupDocRef.set({ groupName: newTitle }, { merge: true });
                    }
                });
            }
        });

        titleElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                titleElement.blur();
            }
        });
    }
}


// festivos nacionales (mes 0-11)
const spanishHolidays = [
  { day:1, month:0 }, { day:6, month:0 }, { day:1, month:4 },
  { day:15, month:7 }, { day:12, month:9 }, { day:1, month:10 }, // Corregido: 1 de Noviembre
  { day:6, month:11 }, { day:8, month:11 }, { day:25, month:11 }
];

// =========================================================================
// CÁLCULO DE FESTIVOS VARIABLES (SEMANA SANTA)
// =========================================================================
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
    
    const variableHolidays = [
        { day: goodFriday.getDate(), month: goodFriday.getMonth() }
    ];
    
    return variableHolidays;
}

// paleta color
const colorPalette = [
  "#d87d00", "#4d9ef7", "#f7a64d", "#6fd773", "#e65252", "#c9c9c9",
  "#ff4d4d","#ffa64d","#ffd24d","#85e085","#4dd2ff", "#4d79ff",
  "#b84dff","#ff4da6","#a6a6a6","#ffffff", "rgba(232,240,255,1)",
  "rgba(163,193,255,0.65)","rgba(255,179,179,0.45)"
];

// ---------------- init / navegación (con swipe) ----------------
function initApp(){
  renderCalendar(currentMonth, currentYear);

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

  if(prevBtn) prevBtn.addEventListener('click', goToPrevMonth);
  if(nextBtn) nextBtn.addEventListener('click', goToNextMonth);

  if (calendarPanel) {
    let touchStartX = 0;
    let touchEndX = 0;

    calendarPanel.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    calendarPanel.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        const swipeDistance = touchEndX - touchStartX;
        const swipeThreshold = 50; 

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance < 0) {
                goToNextMonth();
            } else {
                goToPrevMonth();
            }
        }
    });
  }
}

// =================================================================
//    renderCalendar (VERSIÓN CORREGIDA)
// =================================================================
function renderCalendar(month, year){
  const calendar = document.getElementById('calendar');
  if(!calendar) return;
  calendar.innerHTML = '';

  const variableHolidays = getVariableHolidays(year);

  const monthLabel = document.getElementById('monthLabel');
  const meses = [ "Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre" ];
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

    row.appendChild(createShiftElement(year, month, day, 'M', isTodayHoliday));
    row.appendChild(createShiftElement(year, month, day, 'T', isTodayHoliday));
    wrapper.appendChild(row);

    wrapper.appendChild(createShiftElement(year, month, day, 'N', isTodayHoliday));

    cell.appendChild(wrapper);
    calendar.appendChild(cell);
  }

  if(cadenceData.length>0){
    applyCadenceRender(month, year);
  }
}

// =========================================================================
// FUNCIÓN CENTRAL DE ARRANQUE TRAS LOGIN
// =========================================================================
async function initializeAndStartApp(user) {
    if (!user) return;
    
    console.log("Usuario autenticado, inicializando aplicación...");

    // 1. ESTABLECER LA CONEXIÓN A LA BASE DE DATOS (UNA SOLA VEZ)
    // Esta es la única variable `db` que se usará en toda la app.
    db = firebase.firestore();

    // 2. ACTIVAR PERSISTENCIA (MOVIDO AQUÍ PARA EJECUTARSE EN EL MOMENTO CORRECTO)
    try {
        await db.enablePersistence();
        console.log("Soporte offline de Firestore habilitado con éxito.");
    } catch (err) {
        if (err.code == 'failed-precondition') {
            console.warn("Persistencia de Firestore no habilitada (múltiples pestañas abiertas).");
        } else if (err.code == 'unimplemented') {
            console.log("Persistencia de Firestore no soportada en este navegador.");
        }
    }

    // 3. ESTABLECER ESTADO GLOBAL DEL USUARIO
    AppState.userId = user.uid;
    AppState.userName = user.email; // O user.displayName si lo usas
    AppState.isCoordinator = (user.uid === AppState.coordinatorId);
    
    console.log(`Bienvenido, ${AppState.userName}.`);
    console.log(`Rol: ${AppState.isCoordinator ? 'Coordinador' : 'Usuario'}`);

    // 4. INICIALIZAR TODOS LOS MÓDULOS DE LA APLICACIÓN
    // Llamamos a todas las funciones `init...` que preparan cada parte de la UI.
    initApp();
    await initThemeSwitcher();
    initEditableTitle();
    initCadenceModal();
    initPeticiones();
    initLicenciasPanel();
    initTablon();
    initDocumentosPanel();
    initCoordinatorTable();

    // 5. CARGAR DATOS ESPECFICOS DEL USUARIO (CALENDARIO Y CADENCIA)
    await restoreManualEdits();
    await loadCadence();

    // 6. RE-RENDERIZAR EL CALENDARIO CON TODOS LOS DATOS YA CARGADOS
    // Esto asegura que el calendario se muestra correctamente desde el principio.
    renderCalendar(currentMonth, currentYear);
}
