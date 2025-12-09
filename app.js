document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // 1. VARIABLES GLOBALES Y ESTADO DE LA APLICACIÓN
    // =========================================================================
    let db;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let cadenceData = [];
    let cadenceSpec = null;
    let manualEdits = {};
    let saveTimeout = null;
    let appInitialized = false; // Control para que la UI no se inicialice múltiples veces

    const AppState = {
        groupId: 'equipo_alpha',
        coordinatorId: 'rD3KBeWoJEgyhXQXoFV58ia6N3x1', // UID del coordinador
        userId: null,
        userName: null,
        isCoordinator: false
    };

    // Paletas de colores
    const colorPalette = [
      "#d87d00", "#4d9ef7", "#f7a64d", "#6fd773", "#e65252", "#c9c9c9",
      "#ff4d4d","#ffa64d","#ffd24d","#85e085","#4dd2ff", "#4d79ff",
      "#b84dff","#ff4da6","#a6a6a6","#ffffff", "rgba(232,240,255,1)",
      "rgba(163,193,255,0.65)","rgba(255,179,179,0.45)"
    ];
    const COORDINATOR_PALETTE = ['#ef9a9a', '#ffcc80', '#fff59d', '#f48fb1', '#ffab91', '#e6ee9c', '#a5d6a7', '#80cbc4', '#81d4fa', '#c5e1a5', '#80deea', '#90caf9', '#ce93d8', '#b39ddb', '#bcaaa4', '#eeeeee', '#b0bec5', 'initial'];

    // Festivos
    const spanishHolidays = [
      { day:1, month:0 }, { day:6, month:0 }, { day:1, month:4 },
      { day:15, month:7 }, { day:12, month:9 }, { day:1, month:10 },
      { day:6, month:11 }, { day:8, month:11 }, { day:25, month:11 }
    ];

    // Referencias al DOM (paneles principales)
    const splashScreen = document.getElementById('splash'),
          mainApp = document.getElementById('app'),
          authContainer = document.getElementById('auth-container'),
          logoutBtn = document.getElementById('btn-logout');

    // =========================================================================
    // 2. FUNCIONES DE GESTIÓN DE LA INTERFAZ DE USUARIO (UI)
    // =========================================================================

    // Muestra la aplicación principal y oculta el login/splash
    function showMainAppUI() {
        if (appInitialized) return; // Previene re-inicializaciones
        appInitialized = true;

        authContainer.style.display = 'none';
        mainApp.style.display = 'block';
        if (splashScreen) splashScreen.style.display = 'none';

        // Activa el botón de logout
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
            logoutBtn.onclick = () => {
                if (confirm('¿Seguro que quieres cerrar la sesión?')) {
                    firebase.auth().signOut();
                }
            };
        }
    }

    // Muestra la pantalla de login y oculta la app
    function showLoginScreen() {
        appInitialized = false;
        if(splashScreen) splashScreen.style.display = 'none';
        mainApp.style.display = 'none';
        authContainer.style.display = 'flex';
        if(logoutBtn) logoutBtn.style.display = 'none';
    }

    // Inicializa el formulario de autenticación (login/registro)
    function initAuthForm() {
        const emailInput = document.getElementById('auth-email');
        const passwordInput = document.getElementById('auth-password');
        const submitBtn = document.getElementById('auth-submit-btn');
        const toggleLink = document.getElementById('auth-toggle-link');
        const authTitle = document.getElementById('auth-title');
        const errorContainer = document.getElementById('auth-error');

        if (!submitBtn) return;
        let isLoginMode = true;

        // Cambiar entre modo login y registro
        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            authTitle.textContent = isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta';
            submitBtn.textContent = isLoginMode ? 'Acceder' : 'Registrarse';
            toggleLink.previousSibling.textContent = isLoginMode ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? ';
            toggleLink.textContent = isLoginMode ? 'Regístrate' : 'Inicia sesión';
            errorContainer.textContent = '';
        });

        // Enviar el formulario
        submitBtn.addEventListener('click', () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            errorContainer.textContent = '';

            if (!email || !password) {
                errorContainer.textContent = 'Por favor, introduce email y contraseña.';
                return;
            }

            submitBtn.disabled = true; // Prevenir doble click

            if (isLoginMode) {
                firebase.auth().signInWithEmailAndPassword(email, password)
                    .catch(error => { errorContainer.textContent = 'Error: ' + error.message; })
                    .finally(() => { submitBtn.disabled = false; });
            } else {
                firebase.auth().createUserWithEmailAndPassword(email, password)
                    .catch(error => { errorContainer.textContent = 'Error: ' + error.message; })
                    .finally(() => { submitBtn.disabled = false; });
            }
        });
    }

    // =========================================================================
    // 3. MÓDULOS DE FUNCIONALIDADES DE LA APP (CONECTADOS A FIREBASE)
    // =========================================================================

    /**
     * Inicializa el título editable del grupo, sincronizándolo con Firestore.
     * Solo el coordinador puede editarlo.
     */
    function initEditableTitle() {
        const titleElement = document.getElementById('editable-title');
        if (!titleElement) return;

        const groupDocRef = db.collection('groups').doc(AppState.groupId);

        // Hacer editable solo para el coordinador
        titleElement.contentEditable = AppState.isCoordinator;
        titleElement.style.cursor = AppState.isCoordinator ? 'text' : 'default';

        // Sincronización en tiempo real
        groupDocRef.onSnapshot(doc => {
            const defaultText = "Nombre del Grupo";
            if (doc.exists && doc.data().groupName) {
                if (titleElement.textContent !== doc.data().groupName) {
                    titleElement.textContent = doc.data().groupName;
                }
            } else {
                titleElement.textContent = defaultText;
                if (AppState.isCoordinator) {
                    groupDocRef.set({ groupName: defaultText }, { merge: true });
                }
            }
        }, error => {
            console.error("Error al sincronizar título:", error);
            titleElement.textContent = "Error de conexión";
        });

        // Guardar cambios al perder el foco (solo para el coordinador)
        if (AppState.isCoordinator) {
            titleElement.addEventListener('blur', () => {
                const newTitle = titleElement.textContent.trim();
                if (newTitle) {
                    groupDocRef.get().then(doc => {
                        if (!doc.exists || doc.data().groupName !== newTitle) {
                            groupDocRef.set({ groupName: newTitle }, { merge: true });
                        }
                    });
                }
            });
            titleElement.addEventListener('keypress', e => { 
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur(); 
                }
            });
        }
    }

    /**
     * Inicializa el sistema de peticiones, tanto para usuarios como para el coordinador.
     */
    function initPeticiones() {
        const peticionTexto = document.getElementById('peticion-texto');
        const enviarBtn = document.getElementById('enviar-peticion');
        const listaUsuario = document.getElementById('lista-peticiones-usuario');
        const peticionesSection = document.getElementById('ajustes-section');

        if (!peticionesSection) return;

        const peticionesCollection = db.collection('groups').doc(AppState.groupId).collection('peticiones');
        const peticionesControls = document.querySelector('.peticiones-controles');

        // Lógica para el usuario
        if (enviarBtn) {
            enviarBtn.addEventListener('click', () => {
                const texto = peticionTexto.value.trim();
                if (texto) {
                    enviarBtn.disabled = true;
                    peticionesCollection.add({
                        texto: texto,
                        userId: AppState.userId,
                        userName: AppState.userName,
                        estado: 'pendiente',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        peticionTexto.value = '';
                    }).catch(err => {
                        console.error("Error al enviar petición:", err);
                        alert("No se pudo enviar la petición.");
                    }).finally(() => {
                        enviarBtn.disabled = false;
                    });
                }
            });
        }

        // Mostrar peticiones del usuario en tiempo real
        if(listaUsuario) {
            peticionesCollection.where('userId', '==', AppState.userId).orderBy('timestamp', 'desc')
                .onSnapshot(snapshot => {
                    listaUsuario.innerHTML = '';
                    if (snapshot.empty) {
                        listaUsuario.innerHTML = '<li>No tienes peticiones enviadas.</li>';
                        return;
                    }
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const li = document.createElement('li');
                        li.className = `peticion-item estado-${data.estado}`;
                        const date = data.timestamp?.toDate() ? new Date(data.timestamp.toDate()).toLocaleString('es-ES') : 'Enviando...';
                        li.innerHTML = `<span>${date}</span>: ${data.texto} <i title="Estado de la petición">(${data.estado})</i>`;
                        listaUsuario.appendChild(li);
                    });
                }, error => {
                    console.error("Error al cargar peticiones:", error);
                    listaUsuario.innerHTML = '<li>Error al cargar las peticiones.</li>';
                });
        }

        // Lógica de UI para el coordinador (se extiende en initCoordinatorTable)
        if (AppState.isCoordinator && peticionesControls) {
            peticionesSection.classList.add('modo-coordinador');
        }
    }

    /**
     * Inicializa la tabla del coordinador con todas sus funcionalidades.
     */
    function initCoordinatorTable() {
        const tablaContainer = document.getElementById("tabla-coordinador");
        if (!tablaContainer) return;

        // Si no es coordinador, simplemente nos aseguramos de que esté oculta y salimos.
        if (!AppState.isCoordinator) {
            const controles = document.getElementById('tabla-coordinador-controles');
            if(tablaContainer) tablaContainer.style.display = 'none';
            if(controles) controles.style.display = 'none';
            return;
        }
        
        // Limpiamos el contenedor y construimos la estructura base de la tabla
        tablaContainer.innerHTML = ''; 
        const tabla = document.createElement('table');
        const colgroup = document.createElement('colgroup');
        const thead = tabla.createTHead();
        const tbody = tabla.createTBody();
        tabla.appendChild(colgroup);
        tablaContainer.appendChild(tabla);


        const docRef = db.collection('groups').doc(AppState.groupId).collection('appData').doc('coordinatorTable');
        const controls = { 
            addRow: document.getElementById('btn-add-row'), 
            removeRow: document.getElementById('btn-remove-row'), 
            addCol: document.getElementById('btn-add-col'), 
            removeCol: document.getElementById('btn-remove-col'), 
            limpiar: document.getElementById('limpiar-tabla') 
        };
        const DEFAULT_COLS = [{ id: 'th-m1', header: 'M¹' }, { id: 'th-t1', header: 'T¹' }, { id: 'th-m2', header: 'M²' }, { id: 'th-t2', header: 'T²' }, { id: 'th-n', header: 'N' }];
        const NUM_STATIC_COLS_START = 2; // Nº y Nombre
        const NUM_STATIC_COLS_END = 1;   // Observaciones

        const createDefaultCell = () => ({ text: '', color: '' });
        const createDefaultRow = (numTurnCols) => ({ id: `row_${Date.now()}_${Math.random()}`, cells: Array(NUM_STATIC_COLS_START + numTurnCols + NUM_STATIC_COLS_END).fill(null).map(createDefaultCell) });
        const createDefaultTable = () => ({ headers: {}, cols: DEFAULT_COLS, rowData: Array(18).fill(null).map(() => createDefaultRow(DEFAULT_COLS.length)) });

        let tableState = {};
        let selectedRowIndex = -1;
        let localUpdate = false; // Flag para ignorar nuestros propios cambios recibidos desde onSnapshot

        // --- FUNCIONES DE RENDERIZADO ---

        const renderColgroup = () => {
            const numTurnCols = tableState.cols?.length || 0;
            const dynamicWidth = numTurnCols > 0 ? (100 - 9 - 18 - 35) / numTurnCols : 0;
            let html = `<col style="width:9%;"><col style="width:18%;">`;
            for(let i = 0; i < numTurnCols; i++) html += `<col style="width:${dynamicWidth}%;">`;
            html += `<col style="width:35%;">`;
            colgroup.innerHTML = html;
        };

        const renderHeaders = () => {
            thead.innerHTML = '';
            const headerRow1 = thead.insertRow();
            const headerRow2 = thead.insertRow();
            const numTurnCols = tableState.cols?.length || 0;
            
            headerRow1.innerHTML = `<th colspan="2">FUNCIONARIO/A</th><th id="th-ciclo" colspan="${numTurnCols || 1}" class="titulo-ciclo">${tableState.headers?.["th-ciclo"] || "CICLO"}</th><th>OBSERVACIONES</th>`;
            
            let headerRow2HTML = `<th>Nº</th><th>NOMBRE</th>`;
            if (tableState.cols) {
                tableState.cols.forEach(col => {
                    headerRow2HTML += `<th id="${col.id}">${tableState.headers?.[col.id] || col.header}</th>`;
                });
            }
            headerRow2HTML += `<th id="th-cocina">${tableState.headers?.["th-cocina"] || "COCINA"}</th>`;
            headerRow2.innerHTML = headerRow2HTML;

            if (AppState.isCoordinator) {
                thead.querySelectorAll("th[id]").forEach(th => th.contentEditable = true);
            }
        };

        const renderBody = () => {
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
                        handle.title = 'Elegir color';
                        handle.innerHTML = '●';
                        handle.onclick = (ev) => {
                             ev.stopPropagation();
                             openColorPicker(handle, (color) => {
                                const newColor = (color === 'initial' ? '' : color);
                                handle.closest('td').style.backgroundColor = newColor;
                                tableState.rowData[rowIndex].cells[cellIndex].color = newColor;
                                localUpdate = true;
                                docRef.update({ rowData: tableState.rowData }).finally(() => setTimeout(() => localUpdate = false, 100));
                             }, COORDINATOR_PALETTE);
                        };
                        cell.appendChild(handle);
                    }
                }
            });
        };

        // --- UTILIDAD: PALETA DE COLORES ---

        const openColorPicker = (anchorElement, callback, palette) => {
            // Elimina cualquier paleta de colores que ya exista para evitar duplicados
            document.getElementById("coord-color-palette")?.remove();

            const paletteContainer = document.createElement("div");
            paletteContainer.id = "coord-color-palette";
            Object.assign(paletteContainer.style, {
                position: "absolute",
                display: "flex",
                flexWrap: "wrap",
                width: "250px",
                gap: "8px",
                padding: "10px",
                backgroundColor: "var(--panel-bg)",
                borderRadius: "8px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                zIndex: "100"
            });

            palette.forEach(color => {
                const swatch = document.createElement("button");
                swatch.className = "palette-swatch";
                Object.assign(swatch.style, {
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    border: "2px solid var(--bg-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                });
                
                // El color 'initial' es para resetear, le ponemos un icono
                if (color === 'initial') {
                    swatch.innerHTML = "🔄"; // Icono para 'quitar color'
                    swatch.title = "Quitar color";
                    swatch.style.backgroundColor = 'var(--button-bg-color)';
                } else {
                    swatch.style.backgroundColor = color;
                }
                
                swatch.onclick = () => {
                    callback(color);
                    paletteContainer.remove();
                };
                paletteContainer.appendChild(swatch);
            });

            document.body.appendChild(paletteContainer);

            // Posiciona la paleta de forma inteligente debajo del botón que la activó
            const rect = anchorElement.getBoundingClientRect();
            let leftPos = window.scrollX + rect.left;
            // Ajusta la posición si se sale de la pantalla por la derecha
            if (leftPos + 250 > window.innerWidth) {
                leftPos = window.innerWidth - 260; 
            }
            paletteContainer.style.top = `${window.scrollY + rect.bottom + 5}px`;
            paletteContainer.style.left = `${leftPos}px`;

            // Añade un listener para cerrar la paleta si se hace clic fuera de ella
            const closeListener = (event) => {
                if (!paletteContainer.contains(event.target) && event.target !== anchorElement) {
                    paletteContainer.remove();
                    document.removeEventListener("click", closeListener, true);
                }
            };
            // Usamos un timeout para que el mismo click que abre la paleta no la cierre inmediatamente
            setTimeout(() => document.addEventListener("click", closeListener, true), 100);
        };

        // --- GESTIÓN DE EVENTOS DEL COORDINADOR ---

        const bindCoordinatorEvents = () => {
            // Si el usuario no es coordinador, no se asigna ningún evento.
            if (!AppState.isCoordinator) return;

            // Función centralizada para guardar todo el estado de la tabla en Firestore
            function updateFirestore() {
                localUpdate = true; // Activa el flag para ignorar este cambio cuando vuelva de la nube
                docRef.update({ 
                    cols: tableState.cols, 
                    rowData: tableState.rowData, 
                    headers: tableState.headers 
                })
                .catch(err => {
                    console.error("Error al actualizar la tabla:", err);
                    alert("No se pudieron guardar los cambios en la tabla. Comprueba la conexión.");
                })
                .finally(() => setTimeout(() => localUpdate = false, 100)); // Desactiva el flag tras un breve retardo
            }

            // --- ASIGNACIÓN DE EVENTOS A LOS BOTONES DE CONTROL ---

            if (controls.addRow) controls.addRow.onclick = () => {
                const newRow = createDefaultRow(tableState.cols.length);
                // Inserta la fila debajo de la seleccionada, o al final si no hay ninguna seleccionada
                const insertIndex = (selectedRowIndex === -1) ? tableState.rowData.length : selectedRowIndex + 1;
                tableState.rowData.splice(insertIndex, 0, newRow);
                renderBody();
                updateFirestore();
            };

            if (controls.removeRow) controls.removeRow.onclick = () => {
                if (selectedRowIndex === -1) {
                    return alert("Por favor, selecciona una fila para eliminar.");
                }
                if (confirm("¿Seguro que quieres eliminar la fila seleccionada?")) {
                    tableState.rowData.splice(selectedRowIndex, 1);
                    selectedRowIndex = -1; // Deseleccionar para evitar errores
                    renderBody();
                    updateFirestore();
                }
            };

            if (controls.addCol) controls.addCol.onclick = () => {
                const name = prompt("Nombre de la nueva columna de turno:", `T${(tableState.cols?.length || 0) + 1}`);
                if (name && name.trim()) {
                    if (!tableState.cols) tableState.cols = [];
                    tableState.cols.push({ id: `th-c-${Date.now()}`, header: name.trim() });
                    // Añadir una celda vacía a cada fila en la posición correcta
                    tableState.rowData.forEach(row => {
                        row.cells.splice(NUM_STATIC_COLS_START + tableState.cols.length - 1, 0, createDefaultCell());
                    });
                    renderColgroup();
                    renderHeaders();
                    renderBody();
                    updateFirestore();
                }
            };

            if (controls.removeCol) controls.removeCol.onclick = () => {
                if ((tableState.cols?.length || 0) > 0 && confirm("¿Seguro que quieres eliminar la última columna de turno?")) {
                    tableState.cols.pop();
                    // Quitar la celda correspondiente de cada fila
                    tableState.rowData.forEach(row => {
                        row.cells.splice(NUM_STATIC_COLS_START + tableState.cols.length, 1);
                    });
                    renderColgroup();
                    renderHeaders();
                    renderBody();
                    updateFirestore();
                }
            };
            
            if (controls.limpiar) controls.limpiar.onclick = () => {
                if (confirm("¿Estás seguro de que quieres borrar TODOS los textos y colores de la tabla? Esta acción no se puede deshacer.")) {
                    // Mantiene la estructura de filas y columnas, pero resetea el contenido
                    tableState.rowData = tableState.rowData.map(() => createDefaultRow(tableState.cols.length));
                    renderBody();
                    updateFirestore();
                }
            };

            // --- EVENTOS DE EDICIÓN DIRECTA EN LA TABLA ---

            // Guardar cambios en los títulos de las cabeceras (cuando se pierde el foco)
            thead.addEventListener('blur', (e) => {
                const th = e.target.closest('th');
                if (th?.isContentEditable && th.id) {
                    if (!tableState.headers) tableState.headers = {};
                    if(tableState.headers[th.id] !== th.innerText.trim()) {
                        tableState.headers[th.id] = th.innerText.trim();
                        updateFirestore();
                    }
                }
            }, true); // Se usa 'capture' para asegurar que el evento se coge correctamente.

            // Guardar cambios en las celdas de texto (cuando se pierde el foco)
            tbody.addEventListener('blur', (e) => {
                const editor = e.target.closest('.text-editor');
                if (editor?.isContentEditable) {
                    const cell = editor.closest('td');
                    const row = editor.closest('tr');
                    if (cell && row && row.dataset.rowIndex) {
                        if(tableState.rowData[row.dataset.rowIndex].cells[cell.cellIndex].text !== editor.innerText.trim()) {
                            tableState.rowData[row.dataset.rowIndex].cells[cell.cellIndex].text = editor.innerText.trim();
                            updateFirestore();
                        }
                    }
                }
            }, true);

            // --- EVENTO PARA SELECCIONAR UNA FILA ---
            tbody.addEventListener('click', (e) => {
                const fila = e.target.closest("tr");
                if (fila?.parentElement === tbody) {
                    // Deseleccionar la fila anteriormente seleccionada
                    const actualmenteSeleccionada = tbody.querySelector("tr.seleccionada");
                    if (actualmenteSeleccionada) {
                        actualmenteSeleccionada.classList.remove("seleccionada");
                    }
                    // Seleccionar la nueva fila y guardar su índice
                    fila.classList.add("seleccionada");
                    selectedRowIndex = parseInt(fila.dataset.rowIndex, 10);
                }
            });
        };

        // --- CONEXIÓN A FIRESTORE Y ARRANQUE INICIAL ---

        // Se activa el listener de onSnapshot para recibir actualizaciones en tiempo real.
        const unsubscribe = docRef.onSnapshot(doc => {
            // Si el flag 'localUpdate' está activo, es un cambio que hemos hecho nosotros mismos,
            // así que lo ignoramos para evitar un re-renderizado innecesario.
            if (localUpdate) return;

            const data = doc.data();
            // Comprobamos si hay datos válidos en el documento de Firestore.
            if (data && Array.isArray(data.rowData)) {
                tableState = data; // Usamos los datos de la nube
            } else {
                // Si no hay datos, o son inválidos, creamos una tabla por defecto.
                tableState = createDefaultTable();
                // Si somos el coordinador, guardamos esta tabla por defecto en la nube.
                if (AppState.isCoordinator) {
                    docRef.set(tableState).catch(err => {
                        console.error("Error al inicializar la tabla en Firestore:", err);
                    });
                }
            }
            // Con el estado ya definido (de la nube o por defecto), renderizamos todo.
            renderColgroup();
            renderHeaders();
            renderBody();
            
            // Mostramos los controles de la tabla solo si el usuario es coordinador.
            const display = AppState.isCoordinator ? 'inline-block' : 'none';
            Object.values(controls).forEach(btn => { 
                if(btn) btn.style.display = display; 
            });

        }, (error) => {
            // Manejo de errores de Firestore
            console.error("Error crítico al sincronizar la tabla del coordinador:", error);
            tbody.innerHTML = `<tr><td colspan="100%" style="text-align:center; color: red; padding: 20px;">Error al cargar los datos de la tabla. Revisa la consola para más detalles.</td></tr>`;
        });

        // Finalmente, si el usuario es el coordinador, activamos todos los eventos de edición y control.
        if (AppState.isCoordinator) {
            bindCoordinatorEvents();
        }

        // Devolvemos la función para desuscribirse del listener cuando el componente se 'destruya' (si fuera necesario)
        return unsubscribe;
    }

    // =========================================================================
    // 4. MÓDULOS DE PANELES ADICIONALES (LICENCIAS, TABLÓN, DOCS)
    // =========================================================================

    /**
     * Inicializa el panel de gestión de Licencias, sincronizándolo con Firestore.
     */
    function initLicenciasPanel() {
        const licenciasContainer = document.getElementById('licencias-container');
        if (!licenciasContainer) return;

        const items = licenciasContainer.querySelectorAll('.licencia-item');
        const totalCargaEl = document.getElementById('total-carga');
        const totalConsumidosEl = document.getElementById('total-consumidos');
        const totalRestanEl = document.getElementById('total-restan');
        
        let licenciasSaveTimeout = null;

        // --- COPIA LOCAL de la función de paleta de colores para este módulo ---
        const openColorPicker = (anchorElement, callback, palette) => {
            document.getElementById("licencias-color-palette")?.remove();
            const paletteContainer = document.createElement("div");
            paletteContainer.id = "licencias-color-palette";
            Object.assign(paletteContainer.style, {
                position: "absolute", display: "flex", flexWrap: "wrap",
                width: "280px", gap: "8px", padding: "10px",
                backgroundColor: "var(--panel-bg)", borderRadius: "8px",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)", zIndex: "101"
            });

            const removeColorSwatch = document.createElement("button");
            removeColorSwatch.className = "palette-swatch";
            Object.assign(removeColorSwatch.style, {
                width: "30px", height: "30px", borderRadius: "50%",
                cursor: "pointer", border: "2px solid var(--bg-color)",
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: 'var(--button-bg-color)'
            });
            removeColorSwatch.innerHTML = "🔄";
            removeColorSwatch.title = "Quitar color";
            removeColorSwatch.onclick = () => { callback(''); paletteContainer.remove(); };
            paletteContainer.appendChild(removeColorSwatch);
            
            palette.forEach(color => {
                const swatch = document.createElement("button");
                swatch.className = "palette-swatch";
                Object.assign(swatch.style, {
                    width: "30px", height: "30px", borderRadius: "50%",
                    cursor: "pointer", border: "2px solid var(--bg-color)"
                });
                swatch.style.backgroundColor = color;
                swatch.onclick = () => { callback(color); paletteContainer.remove(); };
                paletteContainer.appendChild(swatch);
            });

            document.body.appendChild(paletteContainer);
            const rect = anchorElement.getBoundingClientRect();
            let leftPos = window.scrollX + rect.left;
            if (leftPos + 280 > window.innerWidth) { leftPos = window.innerWidth - 290; }
            paletteContainer.style.top = `${window.scrollY + rect.bottom + 5}px`;
            paletteContainer.style.left = `${leftPos}px`;
            const closeListener = (event) => {
                if (!paletteContainer.contains(event.target) && event.target !== anchorElement) {
                    paletteContainer.remove();
                    document.removeEventListener("click", closeListener, true);
                }
            };
            setTimeout(() => document.addEventListener("click", closeListener, true), 100);
        };

        function updateCalculations() {
            let totalCarga = 0, totalConsumidos = 0;
            items.forEach(item => {
                const carga = parseInt(item.querySelector('.carga').value, 10) || 0;
                const consumidos = parseInt(item.querySelector('.consumidos').value, 10) || 0;
                const restanEl = item.querySelector('.restan');
                if (restanEl) restanEl.value = carga - consumidos;
                totalCarga += carga;
                totalConsumidos += consumidos;
            });
            if(totalCargaEl) totalCargaEl.value = totalCarga;
            if(totalConsumidosEl) totalConsumidosEl.value = totalConsumidos;
            if(totalRestanEl) totalRestanEl.value = totalCarga - totalConsumidos;
        }

        function saveState() {
            if (!AppState.userId) return;
            if (licenciasSaveTimeout) clearTimeout(licenciasSaveTimeout);
            licenciasSaveTimeout = setTimeout(() => {
                const state = {};
                items.forEach(item => {
                    const tipo = item.dataset.tipo;
                    if (tipo) {
                        const colorHandle = item.querySelector('.licencia-color-handle');
                        state[tipo] = {
                            carga: item.querySelector('.carga').value,
                            consumidos: item.querySelector('.consumidos').value,
                            color: colorHandle ? colorHandle.style.backgroundColor : ''
                        };
                    }
                });
                db.collection('userData').doc(AppState.userId).set({ licenciasData: state }, { merge: true })
                    .catch(error => console.error("Error al guardar licencias:", error));
            }, 1500);
        }

        async function loadState() {
            if (!AppState.userId) return;
            try {
                const doc = await db.collection('userData').doc(AppState.userId).get();
                if (doc.exists && doc.data().licenciasData) {
                    const savedState = doc.data().licenciasData;
                    items.forEach(item => {
                        const tipo = item.dataset.tipo;
                        if (tipo && savedState[tipo]) {
                            item.querySelector('.carga').value = savedState[tipo].carga || '0';
                            item.querySelector('.consumidos').value = savedState[tipo].consumidos || '0';
                            const colorHandle = item.querySelector('.licencia-color-handle');
                            if (colorHandle && savedState[tipo].color) {
                               colorHandle.style.backgroundColor = savedState[tipo].color;
                            }
                        }
                    });
                }
            } catch (error) { console.error("Error al cargar licencias:", error); }
        }
        
                items.forEach(item => {
            // Añade listeners a los inputs de 'carga' y 'consumidos'
            item.querySelectorAll('.carga, .consumidos').forEach(input => {
                input.addEventListener('input', () => {
                    updateCalculations(); // Recalcula los totales
                    saveState();          // Activa el guardado automático con retardo
                });
            });

            // Añade listener al botón de selección de color
            const colorHandle = item.querySelector('.licencia-color-handle');
            if (colorHandle) {
                colorHandle.addEventListener('click', (ev) => {
                    ev.stopPropagation(); // Evita que otros eventos se disparen
                    
                    // Llama a la función del picker, pasándole el manejador, el callback y la paleta de colores
                    openColorPicker(colorHandle, (color) => {
                        // El color devuelto por el picker se aplica al fondo del botón
                        colorHandle.style.backgroundColor = color; 
                        saveState(); // Guarda el estado cada vez que se cambia un color
                    }, colorPalette); // Usa la paleta de colores global definida al principio
                });
            }
        });

        // Al iniciar el módulo, primero se cargan los datos desde Firestore...
        loadState().then(() => {
            // ...y una vez cargados, se realizan los cálculos iniciales.
            updateCalculations();
        });
    }

    /**
     * Inicializa el Tablón de Anuncios, con subida y gestión de archivos de imagen.
     */
    function initTablon() {
        const tablonSection = document.getElementById('tablon-section');
        if (!tablonSection) return;

        const btnUpload = document.getElementById('btn-upload-file');
        const fileListContainer = document.getElementById('tablon-lista');
        const tablonPreviewContainer = document.getElementById('tablon-preview-container');
        const tablonPreviewImage = document.getElementById('tablon-preview-image');
        const fileInput = document.getElementById('file-input');
        const imageModal = document.getElementById('image-modal');
        const modalImageContent = document.getElementById('modal-image-content');
        const modalCloseBtn = imageModal?.querySelector('.image-modal-close');

        if (!btnUpload || !fileListContainer || !tablonPreviewContainer || !fileInput || !imageModal || !modalCloseBtn) {
            console.error("Faltan elementos del DOM para el Tablón. Se cancela la inicialización del módulo.");
            return;
        }

        const storage = firebase.storage();
        const filesCollection = db.collection('groups').doc(AppState.groupId).collection('tablonFiles');
        const navBtnDot = document.querySelector('.nav-btn[data-section="tablon"] .notification-dot');

        const handleUpload = (file) => {
            if (!file) return;
            // Restricción a solo imágenes
            if (!file.type.startsWith('image/')) {
                alert('Por favor, sube solo archivos de imagen (JPG, PNG, GIF, etc.).');
                fileInput.value = ''; // Resetea el input
                return;
            }

            // Opcional: restringir tamaño
            if (file.size > 5 * 1024 * 1024) { // 5 MB
                alert('El archivo es demasiado grande. El límite es 5 MB.');
                fileInput.value = '';
                return;
            }

            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = storage.ref(`groups/${AppState.groupId}/tablon/${fileName}`);
            const uploadTask = storageRef.put(file);

            // Muestra un indicador de subida (opcional)
            btnUpload.textContent = 'Subiendo...';
            btnUpload.disabled = true;

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Progreso de subida: ' + progress + '%');
                },
                (error) => {
                    console.error("Error al subir archivo al tablón:", error);
                    alert("No se pudo subir el archivo. Revisa la consola para más detalles.");
                    btnUpload.textContent = 'Subir Archivo';
                    btnUpload.disabled = false;
                },
                () => {
                    // Cuando la subida se completa
                    uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                        // Añadimos la referencia del archivo a nuestra base de datos Firestore
                        filesCollection.add({
                            name: file.name,
                            url: downloadURL,
                            storagePath: storageRef.fullPath,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            uploaderId: AppState.userId,
                            uploaderName: AppState.userName
                        }).then(() => {
                            console.log("Archivo subido y registrado en Firestore.");
                            fileInput.value = ''; // Limpiar el input para poder subir el mismo archivo otra vez
                        });
                    }).catch(console.error).finally(() => {
                        btnUpload.textContent = 'Subir Archivo';
                        btnUpload.disabled = false;
                    });
                }
            );
        };
        // Función principal para renderizar (o re-renderizar) la lista de archivos
        const renderFiles = (snapshot) => {
            fileListContainer.innerHTML = ''; // Limpiamos la lista actual
            if (snapshot.empty) {
                fileListContainer.innerHTML = '<li>No hay archivos en el tablón.</li>';
                tablonPreviewContainer.classList.add('oculto');
                return;
            }

            let firstFile = true;
            snapshot.forEach(doc => {
                const file = doc.data();
                const li = document.createElement('li');
                li.className = 'tablon-item';
                li.dataset.fileId = doc.id;
                li.dataset.fileUrl = file.url;
                li.dataset.storagePath = file.storagePath;

                li.innerHTML = `
                    <span class="file-name">${file.name}</span>
                    <span class="file-meta">Subido por ${file.uploaderName || 'desconocido'}</span>
                    <div class="file-actions">
                        <button class="btn-icon btn-view-file" title="Ver archivo">👁️</button>
                        ${(AppState.isCoordinator || AppState.userId === file.uploaderId) ? 
                        `<button class="btn-icon btn-delete-file" title="Eliminar archivo">🗑️</button>` : ''}
                    </div>
                `;
                fileListContainer.appendChild(li);

                // El primer archivo de la lista (el más reciente) se muestra en la previsualización
                if (firstFile) {
                    tablonPreviewImage.src = file.url;
                    tablonPreviewContainer.classList.remove('oculto');
                    firstFile = false;
                }
            });

            // Lógica para la notificación de "nuevo"
            const lastViewedTimestamp = localStorage.getItem(`lastViewedTablon_${AppState.groupId}`);
            const latestFileTimestamp = snapshot.docs[0].data().createdAt?.toMillis();

            if (navBtnDot && latestFileTimestamp && (!lastViewedTimestamp || latestFileTimestamp > lastViewedTimestamp)) {
                navBtnDot.classList.add('visible');
            } else if (navBtnDot) {
                navBtnDot.classList.remove('visible');
            }
        };

        // --- ASIGNACIÓN DE EVENTOS ---

        // Un solo listener en el contenedor para manejar los clics en los botones de la lista
        fileListContainer.addEventListener('click', async (event) => {
            const target = event.target;
            const li = target.closest('.tablon-item');
            if (!li) return;

            const fileId = li.dataset.fileId;
            const fileUrl = li.dataset.fileUrl;
            const storagePath = li.dataset.storagePath;

            if (target.classList.contains('btn-view-file')) {
                tablonPreviewImage.src = fileUrl; // Actualiza la vista previa
                tablonPreviewContainer.scrollIntoView({ behavior: 'smooth' });
            } 
            else if (target.classList.contains('btn-delete-file')) {
                if (confirm(`¿Seguro que quieres eliminar el archivo "${li.querySelector('.file-name').textContent}"?`)) {
                    try {
                        // Borrar de Firestore y de Storage
                        await filesCollection.doc(fileId).delete();
                        await storage.ref(storagePath).delete();
                        console.log("Archivo eliminado correctamente.");
                    } catch (error) {
                        console.error("Error al eliminar archivo:", error);
                        alert("No se pudo eliminar el archivo.");
                    }
                }
            }
        });

        // Evento para abrir el modal al hacer clic en la imagen de previsualización
        tablonPreviewImage.addEventListener('click', () => {
            if (tablonPreviewImage.src) {
                modalImageContent.src = tablonPreviewImage.src;
                imageModal.classList.remove('oculto');
            }
        });
        
        // Eventos para cerrar el modal
        modalCloseBtn.addEventListener('click', () => imageModal.classList.add('oculto'));
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) imageModal.classList.add('oculto');
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !imageModal.classList.contains('oculto')) {
                imageModal.classList.add('oculto');
            }
        });
        
        // Evento para marcar el tablón como "visto" al hacer clic en su botón de navegación
        document.querySelector('.nav-btn[data-section="tablon"]')?.addEventListener('click', () => {
            localStorage.setItem(`lastViewedTablon_${AppState.groupId}`, Date.now());
            if (navBtnDot) navBtnDot.classList.remove('visible');
        });


        // --- CONEXIÓN A FIRESTORE ---
        // Se activa el listener que llama a renderFiles cada vez que hay un cambio en la colección.
        const unsubscribeTablon = filesCollection.orderBy('createdAt', 'desc')
            .onSnapshot(renderFiles, error => {
                console.error("Error al escuchar cambios en el tablón:", error);
                fileListContainer.innerHTML = '<li>Error al cargar archivos.</li>';
            });
            
        // Podríamos guardar 'unsubscribeTablon' si necesitáramos detener el listener más tarde.
    }

    /**
     * Inicializa el panel de Documentos, con subida de PDFs y gestión por categorías.
     */
    function initDocumentosPanel() {
        const documentosSection = document.getElementById('documentos-section');
        if (!documentosSection) return;

        // Es crucial que la librería pdf.js esté cargada en el HTML.
        if (typeof pdfjsLib === 'undefined') {
            console.error("pdf.js no está cargado. El módulo de documentos no funcionará.");
            return;
        }
        // Le decimos a la librería dónde encontrar su 'worker' para procesar PDFs en segundo plano.
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

        const pdfInput = document.getElementById('pdf-input');
        const pdfModal = document.getElementById('pdf-modal');
        const modalPdfContent = document.getElementById('modal-pdf-content');
        const modalCloseBtn = pdfModal?.querySelector('.image-modal-close');
        
        if (!pdfInput || !pdfModal || !modalCloseBtn) {
            console.error("Faltan elementos del DOM para el panel de Documentos. Se cancela la inicialización.");
            return;
        }

        const CATEGORIES = ['mes', 'ciclos', 'vacaciones', 'rotacion'];
        let currentUploadCategory = null;

        const storage = firebase.storage();
        const docsCollection = db.collection('groups').doc(AppState.groupId).collection('documentos');

        /**
         * Genera una miniatura a partir de la primera página de un archivo PDF.
         * @param {File} file - El archivo PDF del que se extraerá la miniatura.
         * @returns {Promise<string|null>} Una promesa que resuelve a la URL de la miniatura en formato base64, o null si falla.
         */
        const generatePdfThumbnail = async (file) => {
            const fileReader = new FileReader();
            
            return new Promise((resolve, reject) => {
                fileReader.onload = async function() {
                    const typedarray = new Uint8Array(this.result);
                    try {
                        const pdf = await pdfjsLib.getDocument(typedarray).promise;
                        const page = await pdf.getPage(1);
                        const viewport = page.getViewport({ scale: 0.3 }); // Escala pequeña para la miniatura
                        
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        await page.render({ canvasContext: context, viewport: viewport }).promise;
                        
                        // Devuelve la imagen del canvas como una URL de datos (base64)
                        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Calidad del 80%
                    } catch (error) {
                        console.error('Error al generar la miniatura del PDF:', error);
                        reject(null);
                    }
                };
                fileReader.onerror = () => {
                    console.error("Error al leer el archivo PDF.");
                    reject(null);
                }
                fileReader.readAsArrayBuffer(file);
            });
        };
        /**
         * Renderiza los documentos en sus respectivas categorías en la interfaz.
         * Se ejecuta cada vez que hay cambios en la base de datos de documentos.
         * @param {firebase.firestore.QuerySnapshot} snapshot - El resultado de la consulta de Firestore.
         */
        const renderDocs = (snapshot) => {
            // Primero, vaciamos todos los contenedores de categorías para evitar duplicados.
            CATEGORIES.forEach(category => {
                const container = document.getElementById(`doc-container-${category}`);
                if (container) container.innerHTML = '';
            });

            if (snapshot.empty) {
                // Si no hay documentos, se puede añadir un mensaje en cada categoría.
                CATEGORIES.forEach(category => {
                    const container = document.getElementById(`doc-container-${category}`);
                    if(container) container.innerHTML = '<p class="empty-category-msg">No hay documentos en esta sección.</p>';
                });
                return;
            }

            // Iteramos sobre cada documento recibido de Firestore.
            snapshot.forEach(doc => {
                const data = doc.data();
                const category = data.category;
                const container = document.getElementById(`doc-container-${category}`);

                // Si el documento pertenece a una categoría válida y encontramos su contenedor...
                if (category && container) {
                    const docElement = document.createElement('div');
                    docElement.className = 'doc-item';
                    docElement.dataset.docId = doc.id;
                    docElement.dataset.docUrl = data.url;
                    docElement.dataset.storagePath = data.storagePath;

                    // El contenido HTML de cada elemento de documento.
                    docElement.innerHTML = `
                        <div class="doc-thumbnail-wrapper">
                            <img src="${data.thumbnailUrl || './assets/pdf_placeholder.png'}" alt="Miniatura de ${data.name}" class="doc-thumbnail">
                        </div>
                        <div class="doc-info">
                            <p class="doc-name" title="${data.name}">${data.name}</p>
                            <span class="doc-meta">Subido: ${data.createdAt?.toDate().toLocaleDateString('es-ES') || 'N/A'}</span>
                        </div>
                        <div class="doc-actions">
                            <button class="btn-icon btn-view-pdf" title="Ver PDF">👁️</button>
                            ${(AppState.isCoordinator || AppState.userId === data.uploaderId) ? 
                            `<button class="btn-icon btn-delete-pdf" title="Eliminar PDF">🗑️</button>` : ''}
                        </div>
                    `;
                    // Añadimos el nuevo elemento al contenedor de su categoría.
                    container.appendChild(docElement);
                }
            });
        };

        /**
         * Gestiona la subida de un archivo PDF a una categoría específica.
         * @param {File} file - El archivo a subir.
         * @param {string} category - La categoría a la que pertenece ('mes', 'ciclos', etc.).
         */
        const handleUpload = async (file, category) => {
            if (!file || !category) return;

            const uploadBtn = document.querySelector(`.btn-upload-pdf[data-category="${category}"]`);
            if (uploadBtn) {
                uploadBtn.textContent = 'Subiendo...';
                uploadBtn.disabled = true;
            }

            try {
                // 1. Generar miniatura
                const thumbnailUrl = await generatePdfThumbnail(file);

                // 2. Subir el archivo PDF original
                const pdfFileName = `${Date.now()}_${file.name}`;
                const pdfStorageRef = storage.ref(`groups/${AppState.groupId}/documentos/${category}/${pdfFileName}`);
                const pdfUploadTask = await pdfStorageRef.put(file);
                const pdfUrl = await pdfUploadTask.ref.getDownloadURL();

                // 3. Guardar todo en Firestore
                await docsCollection.add({
                    name: file.name,
                    url: pdfUrl,
                    storagePath: pdfStorageRef.fullPath,
                    thumbnailUrl: thumbnailUrl, // Guardamos la miniatura en base64 directamente
                    category: category,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    uploaderId: AppState.userId,
                    uploaderName: AppState.userName
                });
                console.log(`Documento '${file.name}' subido a '${category}'.`);

            } catch (error) {
                console.error('Fallo completo en el proceso de subida de documento:', error);
                alert('No se pudo subir el documento. Revisa la consola para más detalles.');
            } finally {
                // Restablecer el botón
                if (uploadBtn) {
                    uploadBtn.innerHTML = '➕ Subir';
                    uploadBtn.disabled = false;
                }
                pdfInput.value = ''; // Limpiar el input
            }
        };

        // --- GESTIÓN DE EVENTOS ---
        
        // Un solo listener para toda la sección de documentos
        documentosSection.addEventListener('click', async (event) => {
            const target = event.target;
            const docItem = target.closest('.doc-item');

            // --- Clic en los botones de "Subir" ---
            if (target.classList.contains('btn-upload-pdf')) {
                currentUploadCategory = target.dataset.category;
                if (currentUploadCategory) {
                    pdfInput.click(); // Abre el selector de archivos
                }
            }
            // --- Clic en un documento (para ver o borrar) ---
            else if (docItem) {
                const docId = docItem.dataset.docId;
                const docUrl = docItem.dataset.docUrl;
                const storagePath = docItem.dataset.storagePath;

                // --- Clic en "Ver PDF" ---
                if (target.classList.contains('btn-view-pdf')) {
                    modalPdfContent.innerHTML = `<iframe src="${docUrl}" frameborder="0" style="width:100%; height:100%;"></iframe>`;
                    pdfModal.classList.remove('oculto');
                }
                // --- Clic en "Borrar PDF" ---
                else if (target.classList.contains('btn-delete-pdf')) {
                    if (confirm(`¿Seguro que quieres eliminar el documento "${docItem.querySelector('.doc-name').textContent}"?`)) {
                        try {
                            await docsCollection.doc(docId).delete();
                            await storage.ref(storagePath).delete();
                            console.log("Documento eliminado completamente.");
                        } catch (error) {
                            console.error("Error al eliminar documento:", error);
                            alert("No se pudo eliminar el documento.");
                        }
                    }
                }
            }
        });
        
        // Listener para cuando se selecciona un archivo en el input
        pdfInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && currentUploadCategory) {
                handleUpload(file, currentUploadCategory);
            }
        });

        // Listeners para cerrar el modal del PDF
        modalCloseBtn.addEventListener('click', () => pdfModal.classList.add('oculto'));
        pdfModal.addEventListener('click', (e) => {
            if (e.target === pdfModal) pdfModal.classList.add('oculto');
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !pdfModal.classList.contains('oculto')) {
                pdfModal.classList.add('oculto');
            }
        });
        
        // --- CONEXIÓN FINAL A FIRESTORE ---
        docsCollection.orderBy('createdAt', 'desc').onSnapshot(renderDocs, error => {
            console.error("Error al escuchar cambios en Documentos:", error);
            // Podríamos añadir un mensaje de error en la UI aquí si quisiéramos.
        });
    }

    // =========================================================================
    // 5. MÓDULOS FINALES Y ARRANQUE
    // =========================================================================

    /**
     * Inicializa los listeners de navegación principal de la aplicación.
     * Gestiona el cambio entre las secciones: Calendario, Tablón, Documentos, etc.
     */
    function initApp() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('main > section');
        const mainContent = document.querySelector('main');

        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetSectionId = button.dataset.section;

                // Ocultar todas las secciones
                sections.forEach(section => {
                    section.classList.add('oculto');
                });

                // Mostrar la sección objetivo
                const targetSection = document.getElementById(`${targetSectionId}-section`);
                if (targetSection) {
                    targetSection.classList.remove('oculto');
                    mainContent.scrollTop = 0; // Scroll al inicio del contenido de la sección
                }

                // Actualizar estado 'active' de los botones de navegación
                navButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Lógica de visibilidad para los controles de la tabla del coordinador.
                // Estos solo deben ser visibles si estamos en la sección de 'Ajustes' Y el usuario es coordinador.
                const tablaControles = document.getElementById('tabla-coordinador-controles');
                if (tablaControles) {
                    const isVisible = (targetSectionId === 'ajustes' && AppState.isCoordinator);
                    tablaControles.style.display = isVisible ? 'flex' : 'none';
                }
            });
        });

        // Simula un clic en el botón del calendario para que sea la sección inicial por defecto.
        document.querySelector('.nav-btn[data-section="calendario"]')?.click();
    }

    /**
     * Inicializa el interruptor de tema (claro/oscuro).
     * Guarda la preferencia del usuario en localStorage y en Firestore.
     */
    async function initThemeSwitcher() {
        const themeSwitcher = document.getElementById('theme-switcher');
        if (!themeSwitcher) return;

        const applyTheme = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme); // Guardado local rápido
            // Guardado en la nube para persistencia entre dispositivos
            if (AppState.userId) {
                db.collection('userData').doc(AppState.userId).set({ theme: theme }, { merge: true });
            }
        };

        themeSwitcher.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
        });

        // Carga el tema guardado al iniciar la aplicación.
        let savedTheme = localStorage.getItem('theme'); // Intenta cargar desde local primero
        if (AppState.userId) {
            try {
                // Sobrescribe con el de la nube si existe, ya que es la fuente de verdad.
                const userDoc = await db.collection('userData').doc(AppState.userId).get();
                if (userDoc.exists && userDoc.data().theme) {
                    savedTheme = userDoc.data().theme;
                }
            } catch (e) { console.error("Error al cargar el tema desde Firestore:", e); }
        }
        applyTheme(savedTheme || 'light'); // Aplica el tema guardado o 'light' por defecto.
    }

    /**
     * Inicializa el modal de la cadencia de turnos.
     */
    function initCadenceModal() {
        const modal = document.getElementById('cadence-modal');
        const openBtn = document.getElementById('btn-cadencia');
        const closeBtn = modal.querySelector('.modal-close');
        const applyBtn = document.getElementById('apply-cadence');
        
        if (!modal || !openBtn || !closeBtn || !applyBtn) return;

        openBtn.onclick = () => modal.style.display = 'block';
        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target == modal) modal.style.display = 'none';
        }
        applyBtn.onclick = applyCadence;
    }

    /**
     * Aplica la secuencia de turnos (cadencia) al calendario.
     */
    function applyCadence() {
        const sequenceInput = document.getElementById('cadence-sequence');
        const startDateInput = document.getElementById('cadence-start-date');
        const sequence = sequenceInput.value.toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
        const startDate = new Date(startDateInput.value);

        if (sequence.length === 0 || isNaN(startDate.getTime())) {
            alert('Por favor, define una secuencia de turnos y una fecha de inicio válidas.');
            return;
        }

        const timeZoneOffset = startDate.getTimezoneOffset() * 60000;
        const startDateUTC = new Date(startDate.getTime() + timeZoneOffset);
        
        const cadenceData = {
            sequence: sequence,
            startDate: startDateInput.value
        };
        
        // Primero, guardamos la cadencia para poder recargarla en el futuro.
        saveCadence(cadenceData);

        // Limpiamos SOLO las celdas que no han sido editadas manualmente.
        Object.keys(AppState.calendarState).forEach(dateKey => {
            const cellState = AppState.calendarState[dateKey];
            if (!cellState.manual) {
                delete AppState.calendarState[dateKey];
            }
        });

        // Aplicamos la nueva cadencia
        for (let i = 0; i < 365 * 2; i++) { // Aplicar para 2 años
            const currentDate = new Date(startDateUTC);
            currentDate.setDate(startDateUTC.getDate() + i);
            const dateKey = currentDate.toISOString().split('T')[0];
            
            // Solo aplicamos si la celda no ha sido editada manualmente
            if (!AppState.calendarState[dateKey] || !AppState.calendarState[dateKey].manual) {
                AppState.calendarState[dateKey] = {
                    text: sequence[i % sequence.length],
                    color: '',
                    manual: false // Marcamos que este cambio es por cadencia
                };
            }
        }
        
        // Guardamos todos los cambios del calendario en Firestore.
        saveManualEdit(null, null); // Pasamos null para forzar un guardado completo del estado.
        renderCalendar(currentMonth, currentYear);
        document.getElementById('cadence-modal').style.display = 'none'; // Cierra el modal
    }

    /**
     * Guarda la configuración de la cadencia en Firestore para el usuario actual.
     * @param {object} cadenceData - El objeto con la secuencia y la fecha de inicio.
     */
    function saveCadence(cadenceData) {
        if (!AppState.userId) return;
        db.collection('userData').doc(AppState.userId).set({ cadence: cadenceData }, { merge: true })
            .catch(error => console.error("Error al guardar la cadencia:", error));
    }

    /**
     * Carga la configuración de la cadencia del usuario desde Firestore y la aplica en los inputs del modal.
     */
    async function loadCadence() {
        if (!AppState.userId) return;
        try {
            const doc = await db.collection('userData').doc(AppState.userId).get();
            if (doc.exists && doc.data().cadence) {
                const { sequence, startDate } = doc.data().cadence;
                document.getElementById('cadence-sequence').value = sequence.join(', ');
                document.getElementById('cadence-start-date').value = startDate;
            }
        } catch (error) {
            console.error("Error al cargar la cadencia:", error);
        }
    }
