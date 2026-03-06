const express = require("express");
const path = require("path");
const requireAuth = require("../middleware/requireAuth");
const turnosController = require("../controllers/turnosController");

const router = express.Router();

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/index.html"));
});

router.get("/bienvenidos", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/Bienvenidos.html"));
});

router.get("/bienvenidos_inscripcion", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/Bienvenidos_inscripcion.html"));
});

router.get("/recuperar_contrasena", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/recuperar_contrasena.html"));
});

router.get("/registro", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/Nuevo_Usuario.html"));
});

router.get("/form_tramites", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/form_tramites.html"));
});

router.get("/visualizar_personal", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/visualizar_personal.html"));
});

router.get("/panel_administrador", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/vista_admin.html"));
});

router.get("/vista_admin", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/vista_admin.html"));
});

router.get("/metricas", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/metricas.html"));
});

router.get("/panel_personal", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "Public/pages/panel_personal.html"));
});

router.get("/turno", (req, res) => {

  const tipo = (req.query.tipo || "").trim();
  const folio = (req.query.folio || "").trim();

  if (folio) {
    return res.sendFile(path.join(__dirname, "..", "Public/pages/turno.html"));
  }

  if (!tipo) {
    return res.redirect("/form_tramites");
  }

  const fakeReq = { body: { tramite: tipo } };

  const fakeRes = {
    status: (code) => ({
      json: (obj) => res.status(code).send(obj),
    }),
    json: (obj) => {

      if (obj && obj.ok && obj.folio) {
        return res.redirect(
          `/turno?tipo=${encodeURIComponent(tipo)}&folio=${encodeURIComponent(obj.folio)}`
        );
      }

      return res.redirect("/form_tramites");
    },
  };

  return turnosController.crearTurno(fakeReq, fakeRes);
});

module.exports = router;