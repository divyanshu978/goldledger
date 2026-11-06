const express = require("express");

const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const controller = require("../controller/return-review.controller");

const router = express.Router();
router.use(requireAuth, requireRole("FINANCE_HEAD"));
router.get("/", controller.list);
router.patch("/:transactionId", controller.decide);

module.exports = router;
