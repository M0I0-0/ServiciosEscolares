document.addEventListener("DOMContentLoaded", () => {
  const boton = document.querySelector(".btn");
  const usuarioInput = document.getElementById("usuario");
  const passwordInput = document.getElementById("password");

  if (!boton || !usuarioInput || !passwordInput) {
    console.error("Faltan elementos del login (btn/usuario/password)");
    return;
  }

  boton.addEventListener("click", async () => {
    const correo = (usuarioInput.value || "").trim().toLowerCase();
    const password = (passwordInput.value || "").trim();

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });

      const data = await res.json();

      if (data.ok) {
        if (data.rol === "alumno") {
          window.location.href = "/bienvenidos";
          return;
        }

        if (data.rol === "personal") {
          window.location.href = "/panel_personal";
          return;
        }

        if (data.rol === "admin") {
          window.location.href = "/panel_admin";
          return;
        }

        // fallback por si llega algo raro
        window.location.href = "/";
        return;
      }

      alert(data.error || "Credenciales incorrectas");
    } catch (err) {
      console.error("Error:", err);
      alert("Error conectando al servidor");
    }
  });
});
