const express = require("express");

const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controller/image-extraction.controller");

const router = express.Router();
router.post(
  "/",
  requireAuth,
  requireRole("ISSUE_CLERK", "FINANCE_HEAD"),
  controller.uploadImage,
  controller.extract,
);

module.exports = router;
