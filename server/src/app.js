const cors = require("cors");
const express = require("express");

const env = require("./config/env");
const authRouter = require("./routes/auth.routes");
const healthRouter = require("./routes/health.routes");
const karigarRouter = require("./routes/karigar.routes");
const goldIssueRouter = require("./routes/gold-issue.routes");
const goldReturnRouter = require("./routes/gold-return.routes");
const karigarLedgerRouter = require("./routes/karigar-ledger.routes");
const stockStatementRouter = require("./routes/stock-statement.routes");
const wastageRouter = require("./routes/wastage.routes");
const returnReviewRouter = require("./routes/return-review.routes");
const imageExtractionRouter = require("./routes/image-extraction.routes");

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
app.use("/api/gold-issues", goldIssueRouter);
app.use("/api/gold-returns", goldReturnRouter);
app.use("/api/karigars", karigarLedgerRouter);
app.use("/api/stock-statement", stockStatementRouter);
app.use("/api/wastage-alerts", wastageRouter);
app.use("/api/finance-reviews", returnReviewRouter);
app.use("/api/image-extractions", imageExtractionRouter);

module.exports = app;
