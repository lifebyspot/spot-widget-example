import cors from "cors";
import express from "express";
import { config } from "./config.js";

const app = express();
app.use(cors({ origin: config.frontendOrigins }));
app.use(express.json());

// The Spot integration routes (/accept, /decline, /webhooks) are added step by
// step in the Quickstart guide. The baseline backend is just an empty shell.

app.listen(config.port, () => {
  console.log(`Spot example backend listening on http://localhost:${config.port}`);
});
