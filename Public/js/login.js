document.addEventListener("DOMContentLoaded", () => {

  const boton = document.querySelector(".btn");

  if (!boton) {
    console.error("No se encontró el botón");
    return;
  }

  boton.addEventListener("click", async () => {
    console.log("click detectado");

    const correo = document.getElementById("usuario").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password })
      });

      const data = await res.json();

      if (data.ok) {
        alert("Login correcto");
        window.location.href = "/bienvenidos";
      } else {
        alert(data.error || "Credenciales incorrectas");
      }

    } catch (err) {
      console.error("Error:", err);
      alert("Error conectando al servidor");
    }
  });

});