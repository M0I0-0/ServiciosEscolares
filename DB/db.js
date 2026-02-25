const sqlite3 = require("sqlite3").verbose();

// si no existe, SQLite crea el archivo automáticamente
const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) {
    console.error("Error conectando a la base:", err.message);
  } else {
    console.log("✅ Conectado a SQLite");
  }
});

module.exports = db;