const dbPool = require("../../config/db");
const ensureBackstageTables = require("./ensure-backstage-tables");

const getBackstageDashboardSummary = async () => {
  const client = await dbPool.connect();

  try {
    await ensureBackstageTables(client);

    const [projectSummary, taskSummary, statusBreakdown, recentUpdates, upcomingTasks] =
      await Promise.all([
        client.query(`
          SELECT
            COUNT(*)::int AS total_projects,
            COUNT(*) FILTER (WHERE status = 'active')::int AS active_projects,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_projects
          FROM backstage_projects
        `),
        client.query(`
          SELECT
            COUNT(*)::int AS total_tasks,
            COUNT(*) FILTER (WHERE status = 'done')::int AS done_tasks,
            COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked_tasks,
            COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE AND status <> 'done')::int AS overdue_tasks,
            COALESCE(SUM(effort_hours), 0) AS total_effort_hours
          FROM backstage_tasks
        `),
        client.query(`
          SELECT
            status,
            COUNT(*)::int AS total
          FROM backstage_tasks
          GROUP BY status
          ORDER BY status
        `),
        client.query(`
          SELECT
            btu.id,
            btu.task_id,
            btu.summary,
            btu.result_snapshot,
            btu.repo_url,
            btu.branch_name,
            btu.commit_url,
            btu.pull_request_url,
            btu.effort_hours,
            btu.created_by,
            btu.created_at,
            bt.task_no,
            bt.title AS task_title,
            bp.name AS project_name
          FROM backstage_task_updates btu
          INNER JOIN backstage_tasks bt ON bt.id = btu.task_id
          INNER JOIN backstage_projects bp ON bp.id = bt.project_id
          ORDER BY btu.created_at DESC
          LIMIT 6
        `),
        client.query(`
          SELECT
            bt.id,
            bt.task_no,
            bt.title,
            bt.status,
            bt.priority,
            bt.assignee_name,
            bt.assignee_role,
            bt.due_date,
            bp.name AS project_name
          FROM backstage_tasks bt
          INNER JOIN backstage_projects bp ON bp.id = bt.project_id
          WHERE bt.status <> 'done'
          ORDER BY
            CASE WHEN bt.due_date IS NULL THEN 1 ELSE 0 END,
            bt.due_date ASC,
            bt.updated_at DESC
          LIMIT 8
        `),
      ]);

    return {
      projects: {
        total_projects: Number(projectSummary.rows[0]?.total_projects || 0),
        active_projects: Number(projectSummary.rows[0]?.active_projects || 0),
        completed_projects: Number(projectSummary.rows[0]?.completed_projects || 0),
      },
      tasks: {
        total_tasks: Number(taskSummary.rows[0]?.total_tasks || 0),
        done_tasks: Number(taskSummary.rows[0]?.done_tasks || 0),
        blocked_tasks: Number(taskSummary.rows[0]?.blocked_tasks || 0),
        overdue_tasks: Number(taskSummary.rows[0]?.overdue_tasks || 0),
        total_effort_hours: Number(taskSummary.rows[0]?.total_effort_hours || 0),
      },
      status_breakdown: statusBreakdown.rows.map((row) => ({
        status: row.status,
        total: Number(row.total || 0),
      })),
      recent_updates: recentUpdates.rows.map((row) => ({
        ...row,
        effort_hours: Number(row.effort_hours || 0),
        task_code: row.task_no ? `PBS-${String(row.task_no).padStart(4, "0")}` : "",
      })),
      upcoming_tasks: upcomingTasks.rows.map((row) => ({
        ...row,
        task_code: row.task_no ? `PBS-${String(row.task_no).padStart(4, "0")}` : "",
      })),
    };
  } finally {
    client.release();
  }
};

module.exports = getBackstageDashboardSummary;
