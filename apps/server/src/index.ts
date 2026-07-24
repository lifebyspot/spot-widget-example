import cors from "cors";
import express from "express";
import { config } from "./config.js";

const app = express();
app.use(cors({ origin: config.frontendOrigins }));
app.use(express.json());

app.listen(config.port, () => {
  console.log(`Spot example backend listening on http://localhost:${config.port}`);
});
