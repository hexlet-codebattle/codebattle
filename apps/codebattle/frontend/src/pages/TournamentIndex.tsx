import { Head } from '@inertiajs/react';
import { Button, Group, Stack, Tabs, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBook2,
  IconCalendarEvent,
  IconHistory,
  IconListDetails,
  IconPlus,
  IconUser,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { LEAGUE_GRADES, RulesModal } from '@/features/lobby/components/LeagueBanner';
import { gradeLabel } from '@/features/lobby/format';
import { Calendar } from '@/features/schedule/Calendar';
import { History } from '@/features/schedule/History';
import classes from '@/features/schedule/Schedule.module.css';
import { CreatedTournaments } from '@/features/tournaments/CreatedTournaments';
import { CreateTournament } from '@/features/tournaments/TournamentForm';
import type { LastTournament } from '@/features/tournaments/options';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

// Props from TournamentController.index.
interface TournamentIndexProps {
  last_tournament: LastTournament | null;
  task_pack_names: string[];
}

// Tabs keep the legacy schedule hashes (#contest, #list, #my, #all); /schedule redirects here.
type Tab = 'contest' | 'list' | 'my' | 'all' | 'create';

const TABS: Tab[] = ['contest', 'list', 'my', 'all', 'create'];

function tabFromHash(isAdmin: boolean): Tab {
  const hash = window.location.hash.slice(1) as Tab;
  if (!TABS.includes(hash) || (hash === 'all' && !isAdmin)) return 'contest';
  return hash;
}

export default function TournamentIndex() {
  const { t } = useTranslation();
  const { current_user: me, last_tournament: lastTournament, task_pack_names: taskPackNames = [] } =
    useSharedProps<TournamentIndexProps>();
  const isAdmin = Boolean(me.is_admin);
  const [tab, setTab] = useState<Tab>(() => tabFromHash(isAdmin));
  const [rulesOpened, rules] = useDisclosure(false);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash(isAdmin));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [isAdmin]);

  const select = (value: string | null) => {
    if (!value) return;
    history.replaceState(null, '', `#${value}`);
    setTab(value as Tab);
  };

  return (
    <AppLayout wide>
      <Head title={t('Tournaments')} />
      <PageHeader
        title={t('Tournaments')}
        subtitle={t('Codebattle League tournaments, your own tournaments and past results.')}
        actions={
          <Button size="compact-sm" variant="subtle" leftSection={<IconBook2 size={14} />} onClick={rules.open}>
            {t('League rules')}
          </Button>
        }
      />

      <Tabs value={tab} onChange={select} keepMounted={false}>
        <Stack gap="md">
          <Group justify="space-between" gap="md">
            <Tabs.List>
              <Tabs.Tab value="contest" leftSection={<IconCalendarEvent size={16} />}>
                {t('Calendar')}
              </Tabs.Tab>
              <Tabs.Tab value="list" leftSection={<IconHistory size={16} />}>
                {t('History')}
              </Tabs.Tab>
              <Tabs.Tab value="my" leftSection={<IconUser size={16} />}>
                {t('My Tournaments')}
              </Tabs.Tab>
              {isAdmin && (
                <Tabs.Tab value="all" leftSection={<IconListDetails size={16} />}>
                  {t('All Tournaments')}
                </Tabs.Tab>
              )}
              <Tabs.Tab value="create" leftSection={<IconPlus size={16} />}>
                {t('Create tournament')}
              </Tabs.Tab>
            </Tabs.List>
            {tab !== 'create' && (
              <div className={classes.legend}>
                {LEAGUE_GRADES.map(({ grade }) => (
                  <Group key={grade} gap={5} wrap="nowrap">
                    <GradeIcon grade={grade} size={16} />
                    <Text size="xs" fw={600} style={{ color: `var(--cb-grade-${grade})` }}>
                      {gradeLabel(grade)}
                    </Text>
                  </Group>
                ))}
              </div>
            )}
          </Group>

          <Tabs.Panel value="contest">
            <Calendar scope="contest" />
          </Tabs.Panel>
          <Tabs.Panel value="list">
            <History />
          </Tabs.Panel>
          <Tabs.Panel value="my">
            <Stack gap="md">
              <Calendar scope="my" />
              <CreatedTournaments onCreate={() => select('create')} />
            </Stack>
          </Tabs.Panel>
          {isAdmin && (
            <Tabs.Panel value="all">
              <Calendar scope="all" />
            </Tabs.Panel>
          )}
          <Tabs.Panel value="create">
            <CreateTournament lastTournament={lastTournament} taskPackNames={taskPackNames} />
          </Tabs.Panel>
        </Stack>
      </Tabs>

      <RulesModal opened={rulesOpened} onClose={rules.close} />
    </AppLayout>
  );
}
