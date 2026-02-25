const express = require("express");
const router = express.Router();
const db = require("../DB/db");

// REGISTRAR ALUMNO
router.post("/", (req, res) => {
  const {
    nombres,
    apellido_paterno,
    apellido_materno,
    matricula,
    correo,
    telefono
  } = req.body;

  // ===== VALIDACIONES =====
  if (!nombres || !apellido_paterno || !apellido_materno || !matricula || !correo) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  // matrícula: 1 letra + 8 números
  const matriculaRegex = /^[A-Za-z][0-9]{8}$/;
  if (!matriculaRegex.test(matricula)) {
    return res.status(400).json({ error: "Formato de matrícula inválido" });
  }

  // contraseña temporal (luego pondremos bcrypt)
  const contrasena = "temp123";

  const sql = `
    INSERT INTO alumnos
    (nombres, apellido_paterno, apellido_materno, matricula, correo, telefono, contrasena)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      nombres,
      apellido_paterno,
      apellido_materno,
      matricula,
      correo,
      telefono || null,
      contrasena
    ],
    function (err) {

      if (err) {
        console.error("Error SQLite:", err.message);

        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({
            error: "Correo o matrícula ya registrados"
          });
        }

        return res.status(500).json({
          error: "Error al guardar alumno"
        });
      }

      res.status(201).json({
        message: "Alumno registrado correctamente",
        id: this.lastID
      });
    }
  );
});

module.exports = router;