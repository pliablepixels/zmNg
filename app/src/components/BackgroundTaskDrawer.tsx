/**
 * BackgroundTaskDrawer Component
 *
 * Global drawer that shows progress of background tasks (downloads, uploads, etc.).
 * Auto-shows when tasks are active, minimizes to badge when complete.
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, X, Download, Upload, RefreshCw, FileDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useBackgroundTasks, type BackgroundTask, type TaskType } from '../stores/backgroundTasks';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const TASK_ICONS: Record<TaskType, React.ElementType> = {
  download: Download,
  upload: Upload,
  sync: RefreshCw,
  export: FileDown,
};

interface TaskItemProps {
  task: BackgroundTask;
}

function TaskItem({ task }: TaskItemProps) {
  const { t } = useTranslation();
  const { cancelTask, removeTask } = useBackgroundTasks();
  const Icon = TASK_ICONS[task.type] || Download;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'cancelled':
        return 'text-gray-500';
      default:
        return 'text-blue-500';
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Icon className={cn('h-4 w-4', getStatusColor())} />;
    }
  };

  return (
    <div className="flex flex-col gap-2 py-3 px-4 border-b border-border last:border-b-0" data-testid={`task-item-${task.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="task-title">
              {task.metadata.title}
            </p>
            {task.metadata.description && (
              <p className="text-xs text-muted-foreground truncate">
                {task.metadata.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {task.status === 'in_progress' && task.cancelFn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelTask(task.id)}
              className="h-6 w-6 p-0"
              data-testid="task-cancel-button"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {(task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeTask(task.id)}
              className="h-6 w-6 p-0"
              data-testid="task-remove-button"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar for active tasks */}
      {(task.status === 'pending' || task.status === 'in_progress') && (
        <div className="space-y-1" role="progressbar" aria-valuenow={task.progress} aria-valuemin={0} aria-valuemax={100}>
          <Progress value={task.progress} className="h-1.5" data-testid="task-progress-bar" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span aria-live="polite" data-testid="task-progress-text">{task.progress}%</span>
            {task.metadata.fileSize && task.metadata.bytesProcessed !== undefined && (
              <span data-testid="task-size-text">
                {formatBytes(task.metadata.bytesProcessed)} / {formatBytes(task.metadata.fileSize)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {task.status === 'failed' && task.error && (
        <p className="text-xs text-red-500" role="alert" aria-live="assertive" data-testid="task-error-message">
          {task.error.message}
        </p>
      )}

      {/* Completed status */}
      {task.status === 'completed' && (
        <p className="text-xs text-green-500" role="status" aria-live="polite" data-testid="task-completed-text">
          {t('backgroundTasks.completed')}
        </p>
      )}
    </div>
  );
}

export function BackgroundTaskDrawer() {
  const { t } = useTranslation();
  const { tasks, drawerState, setDrawerState, clearCompleted, activeTasks, completedTasks } = useBackgroundTasks();

  const active = activeTasks();
  const completed = completedTasks();

  // Auto-hide when no tasks
  React.useEffect(() => {
    if (tasks.length === 0 && drawerState !== 'hidden') {
      setDrawerState('hidden');
    }
  }, [tasks.length, drawerState, setDrawerState]);

  if (drawerState === 'hidden') {
    return null;
  }

  // Badge state - floating badge showing completed count
  if (drawerState === 'badge') {
    return (
      <button
        onClick={() => setDrawerState('expanded')}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg hover:bg-primary/90 transition-all"
        data-testid="background-tasks-badge"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">
          {completed.length} {t('backgroundTasks.completed')}
        </span>
      </button>
    );
  }

  // Collapsed state - minimal bar showing active task
  if (drawerState === 'collapsed') {
    const firstActiveTask = active[0];
    if (!firstActiveTask) {
      return null;
    }

    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg"
        data-testid="background-tasks-collapsed"
      >
        <button
          onClick={() => setDrawerState('expanded')}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
          data-testid="expand-collapsed-button"
        >
          <ChevronUp className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-medium truncate">
                {active.length} {active.length === 1 ? t('backgroundTasks.task_in_progress') : t('backgroundTasks.tasks_in_progress')}
              </span>
              <span className="text-xs text-muted-foreground">{firstActiveTask.progress}%</span>
            </div>
            <Progress value={firstActiveTask.progress} className="h-1" />
          </div>
        </button>
      </div>
    );
  }

  // Expanded state - full drawer
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg max-h-[60vh] flex flex-col animate-in slide-in-from-bottom duration-300"
      data-testid="background-tasks-drawer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" data-testid="background-tasks-title">
            {t('backgroundTasks.title')}
          </h3>
          {active.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {active.length} {t('backgroundTasks.active')}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {completed.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="h-7 text-xs"
              data-testid="clear-completed-button"
            >
              {t('backgroundTasks.clear_completed')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDrawerState(active.length > 0 ? 'collapsed' : 'badge')}
            className="h-7 w-7 p-0"
            data-testid="collapse-drawer-button"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto" data-testid="background-tasks-list">
        {active.length > 0 && (
          <div>
            {active.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
        {completed.length > 0 && (
          <div>
            {completed.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
