const express = require("express");
const path = require("path");
const db = require("./DB/db"); // conexión SQLite

const app = express();
const port = 3000;

// ==========================
// MIDDLEWARES
// ==========================
app.use(express.static(path.join(__dirname, "Public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ==========================
// RUTAS DE VISTAS (GET)
// ==========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/index.html"));
});

app.get("/Bienvenidos", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/Bienvenidos.html"));
});

app.get("/Bienvenidos_inscripcion", (req, res) => {
  res.sendFile(
    path.join(__dirname, "Public/pages/Bienvenidos_inscripcion.html"),
  );
});

app.get("/recuperar_contrasena", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/recuperar_contrasena.html"));
});

app.get("/form_tramites", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/form_tramites.html"));
});

app.get("/panel_personal", (req, res) => {
  res.send("Panel Personal (pendiente)");
});

app.get("/panel_admin", (req, res) => {
  res.send("Panel Admin (pendiente)");
});

// ✅ TURNO: si viene sin folio pero con tipo => crea turno y redirige con folio
const turnosController = require("./controllers/turnosController");

app.get("/turno", (req, res) => {
  const tipo = (req.query.tipo || "").trim();
  const folio = (req.query.folio || "").trim();

  // Si ya trae folio, solo mostrar la página
  if (folio) {
    return res.sendFile(path.join(__dirname, "Public/pages/turno.html"));
  }

  // Si no hay tipo, mandarlo a seleccionar trámite
  if (!tipo) {
    return res.redirect("/form_tramites");
  }

  // Crear turno y redirigir con folio
  const fakeReq = { body: { tramite: tipo } };
  const fakeRes = {
    status: (code) => ({
      json: (obj) => res.status(code).send(obj),
    }),
    json: (obj) => {
      if (obj && obj.ok && obj.folio) {
        return res.redirect(
          `/turno?tipo=${encodeURIComponent(tipo)}&folio=${encodeURIComponent(
            obj.folio,
          )}`,
        );
      }
      return res.redirect("/form_tramites");
    },
  };

  return turnosController.crearTurno(fakeReq, fakeRes);
});

// ==========================
// RUTAS DEL SISTEMA
// ==========================
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

const alumnosRoutes = require("./routes/alumnos");
app.use("/api/alumnos", alumnosRoutes);

// TURNOS (API)
const turnosRoutes = require("./routes/turnos");
app.use("/turnos", turnosRoutes);

// ==========================
// INICIAR SERVIDOR
// ==========================
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
