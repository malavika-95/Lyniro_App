/**
 * Task Service
 * Handles all task-related operations.
 */

import sql from '@/app/api/utils/sql';
import { logActivity } from '@/app/api/utils/activity-log';

/**
 * Updates a task within a plan.
 * If the task doesn't exist in the tasks table, creates it first from the template.
 */
export async function updateTask(planId, taskId, updates) {
  try {
    // Validate plan exists
    const plan = await sql`SELECT id FROM onboarding_plans WHERE id = ${planId}`;
    if (plan.length === 0) {
      const error = new Error('Plan not found');
      error.statusCode = 404;
      throw error;
    }

    // taskId could be either:
    // 1. tasks.id (primary key) if task already exists in tasks table
    // 2. template_tasks.id if it's a template task not yet instantiated
    
    // First, check if it exists as a primary key
    let task = await sql`SELECT id, status, title, blocked_reason FROM tasks WHERE id = ${taskId} AND plan_id = ${planId}`;
    let actualTaskId = taskId;

    // If not found by primary key, try to find it by template task_id
    if (task.length === 0) {
      console.log('[updateTask] Task not found by primary key, checking by template task_id...');
      
      const existingByTemplateId = await sql`SELECT id, status, title, blocked_reason FROM tasks WHERE task_id = ${taskId} AND plan_id = ${planId}`;
      
      if (existingByTemplateId.length > 0) {
        // Task exists, use its primary key
        task = existingByTemplateId;
        actualTaskId = existingByTemplateId[0].id;
        console.log('[updateTask] Found existing task by template_id:', actualTaskId);
      } else {
        // Task doesn't exist, try to create it from template
        console.log('[updateTask] Task not found, checking template...');
        
        const templateTask = await sql`
          SELECT t.id, t.stage_id, t.name as title, t.description, t.assigned_to
          FROM template_tasks t
          INNER JOIN template_stages ts ON t.stage_id = ts.id
          INNER JOIN onboarding_plans op ON ts.template_id = op.template_id
          WHERE t.id = ${taskId} AND op.id = ${planId}
        `;

        if (templateTask.length === 0) {
          const error = new Error('Task not found or does not belong to this plan');
          error.statusCode = 404;
          throw error;
        }

        // Create task instance from template
        const newTask = await sql`
          INSERT INTO tasks (plan_id, title, description, assigned_to, status, task_id, stage_id, custom_task, created_at)
          VALUES (${planId}, ${templateTask[0].title}, ${templateTask[0].description}, ${templateTask[0].assigned_to}, 'pending', ${taskId}, ${templateTask[0].stage_id}, false, CURRENT_TIMESTAMP)
          RETURNING id, status, title, blocked_reason
        `;

        if (newTask.length === 0) {
          throw new Error('Failed to create task instance');
        }

        task = newTask;
        actualTaskId = newTask[0].id;
      }
    }

    // Update task status using the actual task ID
    let updatedTask;

    if (updates.status === 'blocked' && updates.blocked_reason) {
      updatedTask = await sql`
        UPDATE tasks SET status = 'blocked', blocked_reason = ${updates.blocked_reason}
        WHERE id = ${actualTaskId} AND plan_id = ${planId}
        RETURNING *
      `;
    } else if (updates.status === 'completed') {
      updatedTask = await sql`
        UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, blocked_reason = NULL
        WHERE id = ${actualTaskId} AND plan_id = ${planId}
        RETURNING *
      `;
    } else if (updates.status) {
      updatedTask = await sql`
        UPDATE tasks SET status = ${updates.status}, blocked_reason = NULL
        WHERE id = ${actualTaskId} AND plan_id = ${planId}
        RETURNING *
      `;
    } else {
      updatedTask = task;
    }

    if (!Array.isArray(updatedTask) || updatedTask.length === 0) {
      throw new Error('Failed to update task');
    }

    // Log activity
    try {
      await logActivity(planId, actualTaskId, 'task_updated', { status: updates.status, blockedReason: updates.blocked_reason });
    } catch (e) {
      console.error('Activity log failed:', e.message);
    }

    return updatedTask[0];
  } catch (error) {
    if (error.statusCode) throw error;
    console.error('[updateTask] Error:', error.message);
    const err = new Error(`Failed to update task: ${error.message}`);
    err.statusCode = error.statusCode || 500;
    throw err;
  }
}

/**
 * Get task completion stats for a plan
 */
export async function getTaskCompletionStats(planId) {
  try {
    const stats = await sql`
      SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM tasks WHERE plan_id = ${planId}
    `;

    if (stats.length === 0) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    const { total, completed } = stats[0];
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total: parseInt(total, 10), completed: parseInt(completed, 10), percentage };
  } catch (error) {
    console.error('getTaskCompletionStats error:', error.message);
    const err = new Error('Failed to retrieve task statistics');
    err.statusCode = 500;
    throw err;
  }
}

/**
 * Create a custom task
 */
export async function createCustomTask(planId, stageId, data) {
  try {
    const plan = await sql`SELECT id FROM onboarding_plans WHERE id = ${planId}`;
    if (plan.length === 0) {
      const error = new Error('Plan not found');
      error.statusCode = 404;
      throw error;
    }

    if (!data.taskName || typeof data.taskName !== 'string') {
      const error = new Error('taskName is required');
      error.statusCode = 400;
      throw error;
    }

    const newTask = await sql`
      INSERT INTO tasks (plan_id, stage_id, title, description, assigned_to, status, custom_task, created_at)
      VALUES (${planId}, ${stageId || null}, ${data.taskName}, ${data.description || null}, ${data.assignedTo || null}, 'pending', true, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    if (newTask.length === 0) {
      throw new Error('Failed to create task');
    }

    try {
      await logActivity(planId, newTask[0].id, 'custom_task_created', { taskName: data.taskName, description: data.description });
    } catch (e) {
      console.error('Activity log failed:', e.message);
    }

    return newTask[0];
  } catch (error) {
    if (error.statusCode) throw error;
    console.error('createCustomTask error:', error.message);
    const err = new Error('Failed to create task');
    err.statusCode = 500;
    throw err;
  }
}
