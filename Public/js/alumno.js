// ===============================
// VALIDACIONES EN VIVO
// ===============================

// TELEFONO: solo números y máximo 10
const tel = document.getElementById("telefono");
if (tel) {
  tel.addEventListener("input", () => {
    tel.value = tel.value.replace(/\D/g, "").slice(0, 10);
  });
}

// MATRICULA: 1 letra + 8 números
const matriculaInput = document.getElementById("matricula");
if (matriculaInput) {
  matriculaInput.addEventListener("input", () => {
    let val = matriculaInput.value.toUpperCase();

    if (val.length > 0) {
      val = val[0].replace(/[^A-Z]/g, "") + val.slice(1);
    }

    if (val.length > 1) {
      val = val[0] + val.slice(1).replace(/\D/g, "");
    }

    matriculaInput.value = val.slice(0, 9);
  });
}

// ===============================
// SUBMIT FORMULARIO
// ===============================
const form = document.getElementById("formAlumno");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre1 = document.getElementById("nombre1").value.trim();
    const nombre2 = document.getElementById("nombre2").value.trim();
    const nombres = `${nombre1} ${nombre2}`.trim();

    const apellido_paterno = document.getElementById("apP").value.trim();
    const apellido_materno = document.getElementById("apM").value.trim();
    const matricula = document.getElementById("matricula").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const telefono = document.getElementById("telefono").value.trim();

    // VALIDACIÓN FINAL
    const telRegex = /^[0-9]{10}$/;
    const matriculaRegex = /^[A-Za-z][0-9]{8}$/;

    if (telefono && !telRegex.test(telefono)) {
      alert("El teléfono debe tener 10 dígitos");
      return;
    }

    if (!matriculaRegex.test(matricula)) {
      alert("La matrícula debe tener 1 letra y 8 números");
      return;
    }

    try {
      const res = await fetch("/api/alumnos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombres,
          apellido_paterno,
          apellido_materno,
          matricula,
          correo,
          telefono,
        }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Error");

      alert("Alumno registrado correctamente");
      window.location.href = "/index";

    } catch (err) {
      alert(err.message);
    }
  });
}