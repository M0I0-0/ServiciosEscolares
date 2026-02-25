const path = require("path");
const crypto = require("crypto");
const db = require("../DB/db");

db.run(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correo TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER DEFAULT 0
  )
`);

exports.forgotPassword = (req, res) => {
  const correo = (req.body.correo || "").trim().toLowerCase();
  const mensaje = "Si el correo existe, te enviamos un enlace de recuperación.";

  if (!correo) return res.send(mensaje);

  const queries = [
    "SELECT correo FROM administradores WHERE correo = ? LIMIT 1",
    "SELECT correo FROM personal WHERE correo = ? LIMIT 1",
    "SELECT correo FROM alumnos WHERE correo = ? LIMIT 1",
  ];

  const buscar = (i) => {
    if (i >= queries.length) return res.send(mensaje);

    db.get(queries[i], [correo], (err, row) => {
      if (err) {
        console.error("DB error:", err);
        return res.send(mensaje);
      }
      if (row) return generarToken();
      return buscar(i + 1);
    });
  };

  const generarToken = () => {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min

    db.run(
      `INSERT INTO password_resets (correo, token_hash, expires_at, used)
       VALUES (?, ?, ?, 0)`,
      [correo, tokenHash, expiresAt],
      (insErr) => {
        if (insErr) console.error("Insert error:", insErr);

        const link = `http://localhost:3000/auth/reset-password?token=${token}`;
        console.log("🔐 LINK DE PRUEBA:", link);

        // Por ahora, para probar, respondemos algo simple:
        return res.send("Revisa la consola del servidor para ver el link.");
      },
    );
  };

  buscar(0);
};

exports.showResetForm = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "Public", "pages", "reset_password.html"),
  );
};

exports.resetPassword = (req, res) => {
  res.send("Reset password funcionando");
};
