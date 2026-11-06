const express = require("express");

const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controller/stock-statement.controller");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRole("FINANCE_HEAD"),
  controller.get,
);

module.exports = router;
