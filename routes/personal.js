const express = require("express");
const router = express.Router();
const db = require("../DB/db");

router.get("/", (req, res) => {

  const query = `
    SELECT id, correo, 'Administrador' as cargo FROM administradores
    UNION
    SELECT id, correo, 'Personal' as cargo FROM personal
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: "Error en la base de datos" });
    }

    res.json(rows);
  });

});

module.exports = router;