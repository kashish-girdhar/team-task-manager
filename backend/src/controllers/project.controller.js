const mongoose = require("mongoose");
const Project = require("../models/project.model");
const User = require("../models/user.model");

const userPopulateFields = "name email role";

const populateProject = (query) => {
  return query
    .populate("owner", userPopulateFields)
    .populate("members", userPopulateFields);
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const isProjectMember = (project, userId) => {
  const currentUserId = userId.toString();

  return (
    project.owner.toString() === currentUserId ||
    project.members.some((memberId) => memberId.toString() === currentUserId)
  );
};

const findAccessibleProject = async (projectId, userId) => {
  if (!isValidObjectId(projectId)) {
    return { status: 400, message: "Invalid project id" };
  }

  const project = await Project.findById(projectId);

  if (!project) {
    return { status: 404, message: "Project not found" };
  }

  if (!isProjectMember(project, userId)) {
    return {
      status: 403,
      message: "You do not have permission to access this project",
    };
  }

  return { project };
};

const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Project name is required",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      owner: req.user._id,
      members: [req.user._id],
    });

    const populatedProject = await populateProject(Project.findById(project._id));

    return res.status(201).json({
      message: "Project created successfully",
      project: populatedProject,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    return res.status(500).json({
      message: "Unable to create project",
    });
  }
};

const getMyProjects = async (req, res) => {
  try {
    const projects = await populateProject(
      Project.find({
        $or: [{ owner: req.user._id }, { members: req.user._id }],
      }).sort({ updatedAt: -1 })
    );

    return res.status(200).json({
      projects,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch projects",
    });
  }
};

const getProjectById = async (req, res) => {
  try {
    const result = await findAccessibleProject(req.params.id, req.user._id);

    if (result.status) {
      return res.status(result.status).json({
        message: result.message,
      });
    }

    const project = await populateProject(Project.findById(result.project._id));

    return res.status(200).json({
      project,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to fetch project",
    });
  }
};

const addMember = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        message: "Member email is required",
      });
    }

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid project id",
      });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the project owner can add members",
      });
    }

    const member = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!member) {
      return res.status(404).json({
        message: "User with this email was not found",
      });
    }

    const isAlreadyMember = project.members.some(
      (memberId) => memberId.toString() === member._id.toString()
    );

    if (isAlreadyMember) {
      return res.status(409).json({
        message: "User is already a project member",
      });
    }

    project.members.push(member._id);
    await project.save();

    const populatedProject = await populateProject(Project.findById(project._id));

    return res.status(200).json({
      message: "Member added successfully",
      project: populatedProject,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to add member",
    });
  }
};

module.exports = {
  createProject,
  getMyProjects,
  getProjectById,
  addMember,
};
