const cors = require("cors");
const express = require("express");

const env = require("./config/env");
const healthRouter = require("./routes/health.routes");

const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/health", healthRouter);

module.exports = app;
