// ===================================================
//             LÓGICA DE AUTENTICACIÓN
// ===================================================

/**
 * Define y gestiona todo el flujo de autenticación.
 * @returns {Promise<void>} Una promesa que se resuelve cuando el login es exitoso.
 */
function handleAuthentication() {
    return new Promise((resolve) => {
        // Si el usuario ya está recordado, resuelve la promesa inmediatamente.
        if (localStorage.getItem('turnapp_remembered_user') === 'true') {
            const authContainer = document.getElementById('auth-container');
            if(authContainer) authContainer.remove();
            resolve();
            return;
        }

        // Elementos del DOM
        const authContainer = document.getElementById('auth-container');
        const loginForm = document.getElementById('login-form');
        const loginError = document.getElementById('login-error');
        const rememberMe = document.getElementById('remember-me');

        // Muestra el contenedor del login
        if (authContainer) authContainer.classList.add('visible');

        if (!loginForm) {
            console.error("El formulario de login no se encuentra en el DOM.");
            return; // No se puede continuar
        }
        
        // Listener para el envío del formulario
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (loginError) loginError.style.display = 'none';

            // --- Credenciales (reemplazar en el futuro con una llamada a servidor) ---
            const VALID_USER = "admin";
            const VALID_PASS = "1234";
            // ---------------------------------------------------------------------

            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value.trim();

            if (user === VALID_USER && pass === VALID_PASS) {
                // Si el login es correcto
                if (rememberMe.checked) {
                    localStorage.setItem('turnapp_remembered_user', 'true');
                }
                if (authContainer) authContainer.remove(); // Elimina el HTML del login del DOM
                resolve(); // Resuelve la promesa para que la app principal pueda arrancar
            } else {
                // Si el login falla
                if (loginError) {
                    loginError.textContent = 'Usuario o contraseña incorrectos.';
                    loginError.style.display = 'block';
                }
            }
        });
    });
}
