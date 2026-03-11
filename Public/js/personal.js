let usuarioSeleccionado = null;

// botones del HTML
const btnDatos = document.querySelector(".btn-datos");
const btnBorrar = document.querySelector(".btn-borrar");
const btnAjustar = document.querySelector(".btn-ajustar");

async function cargarPersonal() {

  const response = await fetch("/api/personal");
  const personal = await response.json();

  const tableBody = document.querySelector(".table-body");
  tableBody.innerHTML = "";

  personal.forEach(p => {

    const row = document.createElement("div");
    row.classList.add("row");

    row.innerHTML = `
      <div>${p.correo}</div>
      <div>${p.cargo}</div>
    `;

    // seleccionar usuario
    row.addEventListener("click", () => {

      document.querySelectorAll(".row").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");

      usuarioSeleccionado = p;

    });

    tableBody.appendChild(row);

  });

}

cargarPersonal();


// BOTÓN DATOS
btnDatos.addEventListener("click", () => {

  if (!usuarioSeleccionado) {
    alert("Selecciona un usuario primero");
    return;
  }

  alert(
`Correo: ${usuarioSeleccionado.correo}
Contraseña: ${usuarioSeleccionado.contrasena}`
  );

});


// BOTÓN BORRAR
btnBorrar.addEventListener("click", async () => {

  if (!usuarioSeleccionado) {
    alert("Selecciona un usuario primero");
    return;
  }

  if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

  await fetch(`/api/personal/${usuarioSeleccionado.tabla}/${usuarioSeleccionado.id}`, {
    method: "DELETE"
  });

  usuarioSeleccionado = null;
  cargarPersonal();

});


// BOTÓN AJUSTAR
btnAjustar.addEventListener("click", async () => {

  if (!usuarioSeleccionado) {
    alert("Selecciona un usuario primero");
    return;
  }

  const nuevoCorreo = prompt("Nuevo correo:", usuarioSeleccionado.correo);
  const nuevaContrasena = prompt("Nueva contraseña:", usuarioSeleccionado.contrasena);

  await fetch(`/api/personal/${usuarioSeleccionado.tabla}/${usuarioSeleccionado.id}`, {

    method: "PUT",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      correo: nuevoCorreo,
      contrasena: nuevaContrasena
    })

  });

  usuarioSeleccionado = null;
  cargarPersonal();

});