const express = require("express");
const router = express.Router();
const turnosController = require("../controllers/turnosController");

router.post("/crear", turnosController.crearTurno);
router.get("/estado", turnosController.estadoTurno);
router.post("/cancelar", turnosController.cancelarTurno);
router.post("/tick", turnosController.tick);

// ✅ NUEVO: panel personal
router.get("/personal/cola", turnosController.colaPersonal);
router.post("/personal/accion", turnosController.accionPersonal);

module.exports = router;
