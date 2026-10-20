import { Head } from '@inertiajs/react';
import { Anchor, Badge, Breadcrumbs, Grid, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type Task, type TaskMeta, type TaskStats, patchTask } from '@/features/taskPage/api';
import {
  AssertsCards,
  DescriptionCard,
  LeaderboardCard,
  SignatureCard,
  StatsCard,
} from '@/features/taskPage/components/MainColumn';
import { AdminCard, DetailsCard, PlayCard } from '@/features/taskPage/components/Sidebar';
import { LevelBadge, StateBadge } from '@/features/tasks/shared';
import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';
import { descriptionField } from '@/shared/taskDescription';

// Props from TaskController.show (render_inertia("TaskPreview", ...)).
interface TaskPreviewProps {
  task: Task;
  task_stats: TaskStats;
  can_edit_task: boolean;
  /** New-frontend extras: timestamps/creator (not in the task JSON) and delete permission. */
  task_meta?: TaskMeta;
  can_delete_task?: boolean;
}

export default function TaskPreview() {
  const { t } = useTranslation();
  const props = useSharedProps<TaskPreviewProps>();
  const [task, setTask] = useState(props.task);
  const [saving, setSaving] = useState(false);
  const canEdit = props.can_edit_task;

  // Each edit saves immediately (legacy behaviour); failures are shown, not swallowed.
  const save = async (fields: Partial<Task>) => {
    setSaving(true);
    try {
      setTask(await patchTask(task.id, fields));
    } catch (error) {
      notifications.show({ color: 'red', message: t("Couldn't save the task. Try again.") });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <Head title={task.name} />
      <Stack gap="lg">
        <Stack gap={6}>
          <Breadcrumbs separator="/">
            <Anchor href="/tasks" size="sm">
              {t('Tasks')}
            </Anchor>
            <Text size="sm" c="dimmed">
              #{task.id}
            </Text>
          </Breadcrumbs>
          <Group gap="sm" align="center">
            <Title order={2}>{task.name}</Title>
            {saving && (
              <Group gap={6}>
                <Loader size={14} />
                <Text size="xs" c="dimmed">
                  {t('Saving...')}
                </Text>
              </Group>
            )}
          </Group>
          <Group gap={6}>
            <LevelBadge level={task.level} />
            <StateBadge state={task.state} />
            <Badge size="sm" variant="default">
              {t(task.visibility)}
            </Badge>
            {task.origin && (
              <Badge size="sm" variant="default" tt="none">
                {task.origin}
              </Badge>
            )}
            {task.tags.map((tag) => (
              <Badge key={tag} size="sm" variant="light" color="gray" tt="none">
                {tag}
              </Badge>
            ))}
          </Group>
        </Stack>

        <Grid gap="lg">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Stack gap="lg">
              <DescriptionCard
                task={task}
                canEdit={canEdit}
                onSave={(lang, text) => save({ [descriptionField(lang)]: text })}
              />
              <SignatureCard task={task} />
              <AssertsCards task={task} />
              <StatsCard stats={props.task_stats} />
              <LeaderboardCard stats={props.task_stats} />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="lg">
              <PlayCard task={task} />
              <DetailsCard task={task} meta={props.task_meta} canEdit={canEdit} onSave={save} />
              <AdminCard task={task} canDelete={Boolean(props.can_delete_task)} />
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </AppLayout>
  );
}
