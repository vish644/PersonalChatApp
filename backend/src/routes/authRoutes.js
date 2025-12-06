import express from "express";
import {
  register,
  login,
  refreshToken,
  generateQRToken,
  validateQRToken,
  logout,
  getDebugInfo,
} from "../controllers/authController.js";
import { authenticate } from "../middlewares/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.get("/qr-token", authenticate, generateQRToken);
router.post("/qr-validate", validateQRToken);
router.post("/logout", authenticate, logout);
router.get("/debug", authenticate, getDebugInfo);

export default router;
