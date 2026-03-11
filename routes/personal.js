const express = require("express");
const router = express.Router();
const db = require("../DB/db");

// OBTENER PERSONAL Y ADMINISTRADORES
router.get("/", (req, res) => {
  const query = `
    SELECT id, correo, contrasena, 'administradores' AS tabla, 'Administrador' AS cargo FROM administradores
    UNION
    SELECT id, correo, contrasena, 'personal' AS tabla, 'Personal' AS cargo FROM personal
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("ERROR SQL:", err.message);
      return res.status(500).json({ error: "Error en la base de datos" });
    }
    res.json(rows);
  });
});

// BORRAR USUARIO
router.delete("/:tabla/:id", (req, res) => {
  const { tabla, id } = req.params;

  db.run(`DELETE FROM ${tabla} WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("ERROR DELETE:", err.message);
      return res.status(500).json({ error: "Error al eliminar usuario" });
    }

    res.json({ mensaje: "Usuario eliminado correctamente" });
  });
});

// ACTUALIZAR USUARIO
router.put("/:tabla/:id", (req, res) => {
  const { tabla, id } = req.params;
  const { correo, contrasena } = req.body;

  db.run(
    `UPDATE ${tabla} SET correo = ?, contrasena = ? WHERE id = ?`,
    [correo, contrasena, id],
    function (err) {
      if (err) {
        console.error("ERROR UPDATE:", err.message);
        return res.status(500).json({ error: "Error al actualizar usuario" });
      }

      res.json({ mensaje: "Usuario actualizado correctamente" });
    }
  );
});

module.exports = router;