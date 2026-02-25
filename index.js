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

app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/index.html"));
});

app.get("/recuperar_contrasena", (req, res) => {
  res.sendFile(path.join(__dirname, "Public/pages/recuperar_contrasena.html"));
});

// ==========================
// RUTAS DEL SISTEMA
// ==========================

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

// ==========================
// INICIAR SERVIDOR
// ==========================

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});