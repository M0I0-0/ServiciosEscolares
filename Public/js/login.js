document.addEventListener("DOMContentLoaded", () => {
  const boton = document.querySelector(".btn");
  const usuarioInput = document.getElementById("usuario");
  const passwordInput = document.getElementById("password");
  const msg = document.getElementById("mensaje");

  if (!boton || !usuarioInput || !passwordInput) {
    console.error("Faltan elementos del login (btn/usuario/password)");
    return;
  }

  const mostrarMensaje = (texto, tipo = "error") => {
    if (!msg) return;
    msg.textContent = texto;
    msg.classList.remove("ok", "error");
    msg.classList.add(tipo);
  };

  const limpiarMensaje = () => {
    if (!msg) return;
    msg.textContent = "";
    msg.classList.remove("ok", "error");
  };

  boton.addEventListener("click", async () => {
    const correo = (usuarioInput.value || "").trim().toLowerCase();
    const password = (passwordInput.value || "").trim();

    if (!correo || !password) {
      mostrarMensaje("Escribe tu usuario y tu contraseña.", "error");
      return;
    }

    // UI: loading
    limpiarMensaje();
    boton.disabled = true;
    const txtOriginal = boton.textContent;
    boton.textContent = "Ingresando...";

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });

      const data = await res.json();

      if (data.ok) {
        // Alumno
        if (data.rol === "alumno") {
          window.location.href = "/Bienvenidos";
          return;
        }

        // Personal
        if (data.rol === "personal") {
          window.location.href = "/panel_personal";
          return;
        }

        // Admin
        if (data.rol === "admin") {
          window.location.href = "/panel_admin";
          return;
        }

        // fallback por si llega algo raro
        window.location.href = "/";
        return;
      }

      mostrarMensaje(data.error || "Credenciales incorrectas", "error");
    } catch (err) {
      console.error("Error:", err);
      mostrarMensaje("Error conectando al servidor", "error");
    } finally {
      // Restaurar UI si NO redirigió
      boton.disabled = false;
      boton.textContent = txtOriginal;
    }
  });
});
