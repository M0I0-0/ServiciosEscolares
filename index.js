const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "Public")));

// Esta es tu primera "ruta"
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/Public/pages/index.html");
});

app.get("/bienvenida", (req, res) => {
  res.sendFile(__dirname + "/Public/pages/bienvenida.html");
});

app.get("/recuperar_contrasena", (req, res) => {
  res.sendFile(__dirname + "/Public/pages/recuperar_contrasena.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/Public/pages/index.html");
});

app.get("/Bienvenidos", (req, res) => {
  res.sendFile(__dirname + "/Public/pages/Bienvenidos.html");
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
