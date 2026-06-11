const express = require("express");
const Joi = require("joi");
const auth = require("../middleware/auth");
const { authorize } = require("../middleware/authorize");
const validator = require("express-joi-validation").createValidator({});
const {
  BACKSTAGE_PROJECT_STATUSES,
  BACKSTAGE_TASK_STATUSES,
  BACKSTAGE_TASK_PRIORITIES,
  BACKSTAGE_ASSIGNEE_ROLES,
} = require("../constants/backstage");
const {
  listBackstageProjectsController,
  getBackstageProjectDetailController,
  createBackstageProjectController,
  updateBackstageProjectController,
  deleteBackstageProjectController,
  listBackstageTasksController,
  getBackstageTaskDetailController,
  createBackstageTaskController,
  updateBackstageTaskController,
  deleteBackstageTaskController,
  createBackstageTaskUpdateController,
  getBackstageDashboardSummaryController,
  getGithubOverviewController,
  listGithubDirectoryController,
  getGithubContentController,
} = require("../controller");

const router = express.Router();
const uuidParamSchema = Joi.object({
  projectId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }),
  taskId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }),
});

const projectQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(150).default(50),
  search: Joi.string().allow("").optional(),
  status: Joi.string().valid("", ...BACKSTAGE_PROJECT_STATUSES).optional(),
});

const projectPayloadSchema = Joi.object({
  code: Joi.string().trim().max(50).required(),
  name: Joi.string().trim().max(200).required(),
  description: Joi.string().allow("").default(""),
  owner_name: Joi.string().trim().max(150).allow("").default(""),
  status: Joi.string().valid(...BACKSTAGE_PROJECT_STATUSES).required(),
  repo_url: Joi.string().trim().uri({ allowRelative: false }).allow("").default(""),
  default_branch: Joi.string().trim().max(150).allow("").default(""),
  target_release_date: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow("")).optional(),
});

const taskQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(150).default(50),
  search: Joi.string().allow("").optional(),
  status: Joi.string().valid("", ...BACKSTAGE_TASK_STATUSES).optional(),
  priority: Joi.string().valid("", ...BACKSTAGE_TASK_PRIORITIES).optional(),
  assignee_role: Joi.string().valid("", ...BACKSTAGE_ASSIGNEE_ROLES).optional(),
  project_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow("").optional(),
});

const taskPayloadSchema = Joi.object({
  project_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required(),
  title: Joi.string().trim().max(255).required(),
  description: Joi.string().allow("").default(""),
  acceptance_criteria: Joi.string().allow("").default(""),
  status: Joi.string().valid(...BACKSTAGE_TASK_STATUSES).required(),
  priority: Joi.string().valid(...BACKSTAGE_TASK_PRIORITIES).required(),
  assignee_name: Joi.string().trim().max(150).allow("").default(""),
  assignee_role: Joi.string().valid(...BACKSTAGE_ASSIGNEE_ROLES).required(),
  reporter_name: Joi.string().trim().max(150).allow("").default(""),
  sprint_name: Joi.string().trim().max(100).allow("").default(""),
  story_points: Joi.number().integer().min(0).default(0),
  effort_hours: Joi.number().min(0).default(0),
  start_date: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow("")).optional(),
  due_date: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow("")).optional(),
  result_summary: Joi.string().allow("").default(""),
});

const taskUpdatePayloadSchema = Joi.object({
  summary: Joi.string().trim().min(3).required(),
  result_snapshot: Joi.string().allow("").default(""),
  repo_url: Joi.string().trim().uri({ allowRelative: false }).allow("").default(""),
  branch_name: Joi.string().trim().max(150).allow("").default(""),
  commit_url: Joi.string().trim().uri({ allowRelative: false }).allow("").default(""),
  pull_request_url: Joi.string().trim().uri({ allowRelative: false }).allow("").default(""),
  effort_hours: Joi.number().min(0).default(0),
});

const githubQuerySchema = Joi.object({
  branch: Joi.string().trim().max(255).allow("").optional(),
  path: Joi.string().trim().max(500).allow("").optional(),
});

router.get(
  "/dashboard/summary",
  auth,
  authorize({ anyOf: ["plink-back-stage.board.read"] }),
  getBackstageDashboardSummaryController
);
router.get(
  "/projects",
  auth,
  authorize({ anyOf: ["plink-back-stage.projects.read"] }),
  validator.query(projectQuerySchema),
  listBackstageProjectsController
);
router.get(
  "/projects/:projectId",
  auth,
  authorize({ anyOf: ["plink-back-stage.projects.read"] }),
  validator.params(uuidParamSchema.fork(["projectId"], (schema) => schema.required())),
  getBackstageProjectDetailController
);
router.post(
  "/projects",
  auth,
  authorize({ anyOf: ["plink-back-stage.projects.create"] }),
  validator.body(projectPayloadSchema),
  createBackstageProjectController
);
router.put(
  "/projects/:projectId",
  auth,
  authorize({ anyOf: ["plink-back-stage.projects.update"] }),
  validator.params(uuidParamSchema.fork(["projectId"], (schema) => schema.required())),
  validator.body(projectPayloadSchema),
  updateBackstageProjectController
);
router.delete(
  "/projects/:projectId",
  auth,
  authorize({ anyOf: ["plink-back-stage.projects.delete"] }),
  validator.params(uuidParamSchema.fork(["projectId"], (schema) => schema.required())),
  deleteBackstageProjectController
);
router.get(
  "/tasks",
  auth,
  authorize({ anyOf: ["plink-back-stage.tasks.read"] }),
  validator.query(taskQuerySchema),
  listBackstageTasksController
);
router.get(
  "/tasks/:taskId",
  auth,
  authorize({ anyOf: ["plink-back-stage.tasks.read", "plink-back-stage.task-updates.read"] }),
  validator.params(uuidParamSchema.fork(["taskId"], (schema) => schema.required())),
  getBackstageTaskDetailController
);
router.post(
  "/tasks",
  auth,
  authorize({ anyOf: ["plink-back-stage.tasks.create"] }),
  validator.body(taskPayloadSchema),
  createBackstageTaskController
);
router.put(
  "/tasks/:taskId",
  auth,
  authorize({ anyOf: ["plink-back-stage.tasks.update"] }),
  validator.params(uuidParamSchema.fork(["taskId"], (schema) => schema.required())),
  validator.body(taskPayloadSchema),
  updateBackstageTaskController
);
router.delete(
  "/tasks/:taskId",
  auth,
  authorize({ anyOf: ["plink-back-stage.tasks.delete"] }),
  validator.params(uuidParamSchema.fork(["taskId"], (schema) => schema.required())),
  deleteBackstageTaskController
);
router.post(
  "/tasks/:taskId/updates",
  auth,
  authorize({ anyOf: ["plink-back-stage.task-updates.create"] }),
  validator.params(uuidParamSchema.fork(["taskId"], (schema) => schema.required())),
  validator.body(taskUpdatePayloadSchema),
  createBackstageTaskUpdateController
);

router.get(
  "/github/overview",
  auth,
  authorize({ anyOf: ["plink-back-stage.board.read", "plink-back-stage.github.read"] }),
  getGithubOverviewController
);
router.get(
  "/github/tree",
  auth,
  authorize({ anyOf: ["plink-back-stage.github.read"] }),
  validator.query(githubQuerySchema),
  listGithubDirectoryController
);
router.get(
  "/github/content",
  auth,
  authorize({ anyOf: ["plink-back-stage.github.read"] }),
  validator.query(
    githubQuerySchema.keys({
      path: Joi.string().trim().max(500).required(),
    })
  ),
  getGithubContentController
);

module.exports = router;
