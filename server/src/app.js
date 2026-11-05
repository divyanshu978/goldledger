const cors = require("cors");
const express = require("express");

const env = require("./config/env");
const authRouter = require("./routes/auth.routes");
const healthRouter = require("./routes/health.routes");
const karigarRouter = require("./routes/karigar.routes");

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
app.use("/api/karigars", karigarRouter);

module.exports = app;
