const express = require("express");
const {
  addMember,
  createProject,
  getMyProjects,
  getProjectById,
} = require("../controllers/project.controller");

const { protect, authorize } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, authorize("admin"), createProject);
router.get("/", protect, getMyProjects);
router.get("/:id", protect, getProjectById);
router.post("/:id/members", protect, authorize("admin"), addMember);

module.exports = router;