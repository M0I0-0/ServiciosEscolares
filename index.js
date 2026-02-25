const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'Public')));

// Esta es tu primera "ruta"
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Public/pages/index.html');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

