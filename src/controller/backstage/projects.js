const models = require("../../models");

const actorFromRequest = (req) =>
  req.user?.fullname || req.user?.username || req.user?.email || "system";

const listBackstageProjectsController = async (req, res) => {
  try {
    const result = await models.listBackstageProjects(req.query);
    return res.status(200).json({ success: true, message: "Projects loaded successfully", ...result });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to load projects" });
  }
};

const getBackstageProjectDetailController = async (req, res) => {
  try {
    const data = await models.getBackstageProjectDetail(req.params.projectId);
    return res.status(200).json({ success: true, message: "Project detail loaded successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to load project detail" });
  }
};

const createBackstageProjectController = async (req, res) => {
  try {
    const data = await models.createBackstageProject({ ...req.body, actor: actorFromRequest(req) });
    return res.status(201).json({ success: true, message: "Project created successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to create project" });
  }
};

const updateBackstageProjectController = async (req, res) => {
  try {
    const data = await models.updateBackstageProject({
      projectId: req.params.projectId,
      ...req.body,
      actor: actorFromRequest(req),
    });
    return res.status(200).json({ success: true, message: "Project updated successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to update project" });
  }
};

const deleteBackstageProjectController = async (req, res) => {
  try {
    const data = await models.deleteBackstageProject(req.params.projectId);
    return res.status(200).json({ success: true, message: "Project deleted successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to delete project" });
  }
};

module.exports = {
  listBackstageProjectsController,
  getBackstageProjectDetailController,
  createBackstageProjectController,
  updateBackstageProjectController,
  deleteBackstageProjectController,
};
