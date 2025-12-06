import express from "express";
import {
  sendMessage,
  getMessages,
  exportBackup,
  importBackup,
} from "../controllers/messageController.js";
import { authenticate } from "../middlewares/auth.js";

const router = express.Router();

router.use(authenticate); // All message routes require authentication

router.post("/send", sendMessage);
router.get("/", getMessages);
router.get("/export", exportBackup);
router.post("/import", importBackup);

export default router;

