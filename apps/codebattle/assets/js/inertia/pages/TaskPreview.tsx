import React from 'react';

import { Head } from '@inertiajs/react';

import { TaskPreviewPage } from '../../widgets/App';

type TaskPreviewPageProps = React.ComponentProps<typeof TaskPreviewPage>;

interface TaskPreviewProps {
  page_title: string;
  task: TaskPreviewPageProps['task'];
  task_stats: TaskPreviewPageProps['taskStats'];
  can_edit_task?: TaskPreviewPageProps['canEditTask'];
}

export default function TaskPreview({
  page_title,
  task,
  task_stats,
  can_edit_task,
}: TaskPreviewProps) {
  return (
    <div className="w-100">
      <Head title={page_title} />
      <TaskPreviewPage task={task} taskStats={task_stats} canEditTask={can_edit_task} />
      <div id="modal-root" style={{ left: 0, position: 'absolute', top: 0 }} />
    </div>
  );
}
