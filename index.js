const express = require('express');
const path = require('path');
const db = require('./DB/db');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'Public')));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Public/pages/index.html');
});

app.get('/bienvenidos', (req, res) => {
  res.sendFile(__dirname + '/Public/pages/Bienvenidos.html');
});

app.post('/login', (req, res) => {

  const { correo, password } = req.body;

  db.get("SELECT * FROM administradores WHERE correo = ?", [correo], (err, admin) => {
    if (admin && admin.contrasena === password)
      return res.json({ ok: true, rol: "admin" });

    db.get("SELECT * FROM personal WHERE correo = ?", [correo], (err, personal) => {
      if (personal && personal.contrasena === password)
        return res.json({ ok: true, rol: "personal" });

      db.get("SELECT * FROM alumnos WHERE correo = ?", [correo], (err, alumno) => {
        if (alumno && alumno.contrasena === password)
          return res.json({ ok: true, rol: "alumno" });

        return res.json({ ok: false, error: "Usuario o contraseña incorrectos" });
      });
    });
  });

});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});