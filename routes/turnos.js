const express = require("express");
const router = express.Router();
const turnosController = require("../controllers/turnosController");

router.post("/crear", turnosController.crearTurno);
router.get("/estado", turnosController.estadoTurno);
router.post("/cancelar", turnosController.cancelarTurno);
router.post("/tick", turnosController.tick);
router.get("/mio-activo", turnosController.miTurnoActivo);

router.get("/personal/mi-ventanilla", (req, res) => {
  const usuario = req.session?.usuario;

  if (!usuario) {
    return res.status(401).json({
      ok: false,
      error: "No autenticado",
    });
  }

  return res.json({
    ok: true,
    ventanilla: usuario.ventanilla || null,
    correo: usuario.correo || null,
  });
});

router.get("/personal/cola", turnosController.colaPersonal);
router.post("/personal/accion", turnosController.accionPersonal);

module.exports = router;
