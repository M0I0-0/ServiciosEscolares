const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Recuperar contraseña
router.post("/forgot-password", authController.forgotPassword);
router.get("/reset-password", authController.showResetForm);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
