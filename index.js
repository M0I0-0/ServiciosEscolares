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

app.get("/bienvenidos", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/Bienvenidos.html"));
});


app.get("/recuperar_contrasena", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/recuperar_contrasena.html"));
});

app.get("/turno", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/turno.html"));
});

app.get("/form_tramites", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/form_tramites.html"));
});

// ==========================
// RUTAS DEL SISTEMA
// ==========================

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

const alumnosRoutes = require("./routes/alumnos");
app.use("/api/alumnos", alumnosRoutes);

// ==========================
// INICIAR SERVIDOR
// ==========================

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});