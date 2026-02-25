const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("../DB/db");

// =====================================
// CONFIGURACIÓN GMAIL (APP PASSWORD)
// =====================================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "servicios.escolares.peto@gmail.com",
    pass: "shildntabctyxyeu",
  },
  tls: {
    rejectUnauthorized: false,
  },
  logger: true,
  debug: true,
});

// Verifica conexión SMTP al iniciar
transporter.verify((err) => {
  if (err) {
    console.error("❌ SMTP verify error:", err);
  } else {
    console.log("✅ SMTP listo para enviar correos");
  }
});

const BASE_URL = "http://localhost:3000";

// =====================================
// CREAR TABLA PASSWORD_RESETS
// =====================================
db.run(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correo TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER DEFAULT 0
  )
`);
// =====================================
// LOGIN
// =====================================
exports.login = (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.json({ ok: false, error: "Faltan datos" });
  }

  const queries = [
    "SELECT correo, contrasena FROM administradores WHERE correo = ? LIMIT 1",
    "SELECT correo, contrasena FROM personal WHERE correo = ? LIMIT 1",
    "SELECT correo, contrasena FROM alumnos WHERE correo = ? LIMIT 1",
  ];

  const buscar = (i) => {
    if (i >= queries.length) {
      return res.json({ ok: false, error: "Credenciales incorrectas" });
    }

    db.get(queries[i], [correo], (err, row) => {
      if (err) {
        console.error("DB error:", err);
        return res.json({ ok: false, error: "Error del servidor" });
      }

      if (row && row.contrasena === password) {
        return res.json({ ok: true });
      }

      buscar(i + 1);
    });
  };

  buscar(0);
};

// =====================================
// FORGOT PASSWORD
// =====================================
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

      buscar(i + 1);
    });
  };

  const generarToken = () => {
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = Date.now() + 15 * 60 * 1000;

    db.run(
      `INSERT INTO password_resets (correo, token_hash, expires_at, used)
       VALUES (?, ?, ?, 0)`,
      [correo, tokenHash, expiresAt],
      async (err) => {
        if (err) {
          console.error("Insert error:", err);
          return res.send(mensaje);
        }

        const link = `${BASE_URL}/auth/reset-password?token=${token}`;

        console.log("📧 Intentando enviar correo a:", correo);

        try {
          await transporter.sendMail({
            from: '"Servicios Escolares" <servicios.escolares.peto@gmail.com>',
            to: correo,
            subject: "Recuperación de contraseña",
            html: `
              <h2>Recuperación de contraseña</h2>
              <p>Solicitaste restablecer tu contraseña.</p>
              <p>
                <a href="${link}" 
                   style="background:#0b3d91;color:white;padding:10px 15px;text-decoration:none;border-radius:6px;">
                   Restablecer contraseña
                </a>
              </p>
              <p>Este enlace expira en 15 minutos.</p>
            `,
          });

          console.log("✅ Correo enviado correctamente");
          return res.send(mensaje);
        } catch (error) {
          console.error("❌ Error enviando correo:", error);
          return res.send("Error enviando correo. Revisa consola.");
        }
      },
    );
  };

  buscar(0);
};

// =====================================
// MOSTRAR FORM RESET
// =====================================
exports.showResetForm = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "Public", "pages", "reset_password.html"),
  );
};

// =====================================
// RESET PASSWORD
// =====================================
exports.resetPassword = (req, res) => {
  const token = (req.body.token || "").trim();
  const password = (req.body.password || "").trim();

  if (!token || !password) {
    return res.status(400).send("Solicitud inválida.");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  db.get(
    `SELECT id, correo, expires_at
     FROM password_resets
     WHERE token_hash = ? AND used = 0
     ORDER BY id DESC
     LIMIT 1`,
    [tokenHash],
    (err, row) => {
      if (err) {
        console.error("DB error:", err);
        return res.status(500).send("Error interno.");
      }

      if (!row) {
        return res.status(400).send("Token inválido o ya usado.");
      }

      if (Date.now() > row.expires_at) {
        db.run("UPDATE password_resets SET used = 1 WHERE id = ?", [row.id]);
        return res.status(400).send("Token expirado.");
      }

      const correo = row.correo;

      const updates = [
        "UPDATE administradores SET contrasena = ? WHERE correo = ?",
        "UPDATE personal SET contrasena = ? WHERE correo = ?",
        "UPDATE alumnos SET contrasena = ? WHERE correo = ?",
      ];

      const actualizar = (i) => {
        if (i >= updates.length) {
          return res.status(400).send("No se encontró el usuario.");
        }

        db.run(updates[i], [password, correo], function (err) {
          if (err) {
            console.error("Update error:", err);
            return res.status(500).send("Error actualizando contraseña.");
          }

          if (this.changes > 0) {
            db.run("UPDATE password_resets SET used = 1 WHERE id = ?", [
              row.id,
            ]);
            return res.send(
              "Contraseña actualizada. Ya puedes iniciar sesión.",
            );
          }

          actualizar(i + 1);
        });
      };

      actualizar(0);
    },
  );
};
