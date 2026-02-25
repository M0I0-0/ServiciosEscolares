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
    const password = document.getElementById("password").value;
    const password2 = document.getElementById("password2").value;

    const telRegex = /^[0-9]{10}$/;
    const matriculaRegex = /^[A-Za-z][0-9]{8}$/;

    // VALIDACIONES
    if (!nombre1) return alert("Ingresa tu primer nombre");
    if (!apellido_paterno) return alert("Ingresa apellido paterno");
    if (!apellido_materno) return alert("Ingresa apellido materno");

    if (!matriculaRegex.test(matricula))
      return alert("Matrícula inválida (Ej: A12345678)");

    if (telefono && !telRegex.test(telefono))
      return alert("Teléfono inválido");

    if (password.length < 8)
      return alert("La contraseña debe tener mínimo 8 caracteres");

    if (password !== password2)
      return alert("Las contraseñas no coinciden");

    // ENVIO
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
          password   // 👈 AHORA SI SE ENVÍA
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