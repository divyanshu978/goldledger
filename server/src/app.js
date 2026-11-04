const cors = require("cors");
const express = require("express");

const env = require("./config/env");
const authRouter = require("./routes/auth.routes");
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
app.use("/api/auth", authRouter);

module.exports = app;
