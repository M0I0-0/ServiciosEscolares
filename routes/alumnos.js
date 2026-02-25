const express = require("express");
const router = express.Router();
const db = require("../DB/db");

router.post("/", (req, res) => {

  const {
    nombres,
    apellido_paterno,
    apellido_materno,
    matricula,
    correo,
    telefono,
    password
  } = req.body;

  // VALIDACIONES BÁSICAS BACKEND
  if (!nombres || !apellido_paterno || !apellido_materno || !matricula || !correo || !password) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const matriculaRegex = /^[A-Za-z][0-9]{8}$/;
  const telRegex = /^[0-9]{10}$/;

  if (!matriculaRegex.test(matricula)) {
    return res.status(400).json({ error: "Matrícula inválida" });
  }

  if (telefono && !telRegex.test(telefono)) {
    return res.status(400).json({ error: "Teléfono inválido" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener mínimo 8 caracteres" });
  }

  // IMPORTANTE: password → contrasena (nombre BD)
  const sql = `
    INSERT INTO alumnos
    (nombres, apellido_paterno, apellido_materno, matricula, correo, contrasena, telefono)
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
      password,   // ← aquí va contrasena
      telefono || null
    ],
    function(err){

      if (err) {
        console.error(err.message);

        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Correo o matrícula ya registrados" });
        }

        return res.status(500).json({ error: "Error al registrar alumno" });
      }

      res.status(201).json({
        message: "Alumno creado correctamente",
        id: this.lastID
      });
    }
  );

});

module.exports = router;