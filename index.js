const express = require("express");
const path = require("path");
const session = require("express-session");
// const db = require("./DB/db"); // opcional: si solo lo quieres por el log de conexión

const app = express();
const port = 3000;

// ==========================
// MIDDLEWARES
// ==========================
app.use(express.static(path.join(__dirname, "Public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ==========================
// CONFIGURACIÓN DE SESIÓN
// ==========================
app.use(session({
  secret: "secreto_escolar_seguro_123", // Cambia esto por algo secreto
  resave: false,
  saveUninitialized: false,
}));

// Middleware para verificar sesión
const requireAuth = (req, res, next) => {
  if (req.session && req.session.usuario) {
    return next();
  }
  res.redirect("/");
};

// Controllers
const turnosController = require("./controllers/turnosController");

// ==========================
// RUTAS DE VISTAS (GET)
// ==========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/index.html"));
});

// ✅ Ruta “canónica”
app.get("/Bienvenidos", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/Bienvenidos.html"));
});
// ✅ Alias (por si quedó en mayúsculas en algún link)
app.get("/Bienvenidos", requireAuth, (req, res) => res.redirect("/bienvenidos"));

app.get("/Bienvenidos_inscripcion", requireAuth, (req, res) => {
  res.sendFile(
    path.join(__dirname, "Public/pages/Bienvenidos_inscripcion.html"),
  );
});

app.get("/recuperar_contrasena", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/recuperar_contrasena.html"));
});

app.get("/form_tramites", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/form_tramites.html"));
});

app.get("/panel_personal", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/visualizar_personal.html"));
});

app.get("/panel_admin", requireAuth, (req, res) => {
  res.send("Panel Admin (pendiente)");
});

// ✅ TURNO: crea turno si viene ?tipo= y no viene folio
app.get("/turno", requireAuth, (req, res) => {
  const tipo = (req.query.tipo || "").trim();
  const folio = (req.query.folio || "").trim();

  if (folio) {
    return res.sendFile(path.join(__dirname, "Public/pages/turno.html"));
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
          `/turno?tipo=${encodeURIComponent(tipo)}&folio=${encodeURIComponent(obj.folio)}`,
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

const turnosRoutes = require("./routes/turnos");
app.use("/turnos", turnosRoutes);

// ==========================
// INICIAR SERVIDOR
// ==========================
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
