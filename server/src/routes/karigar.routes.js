const express = require("express");

const { requireAuth } = require("../middleware/auth.middleware");
const controller = require("../controller/karigar.controller");

const router = express.Router();

router.use(requireAuth);
router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.get);
router.patch("/:id", controller.update);
router.patch("/:id/status", controller.updateStatus);

module.exports = router;
