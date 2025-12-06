import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { encrypt } from "../shared/utils/encryption";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/ping", (req, res) => res.json({ message: "Backend running" }));

app.listen(process.env.PORT || 5000, () =>
  console.log("Backend server running...")
);
