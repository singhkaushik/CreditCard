import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import custumerRoute from "./router/custumerRoute.js";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(cookieParser());

app.use("/api/auth/", custumerRoute);
app.use("/", (req, res) => {
  res.status(200).json({ data: "Server is Ready" });
});

export default app;
