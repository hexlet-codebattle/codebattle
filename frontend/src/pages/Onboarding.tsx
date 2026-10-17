import { Head } from '@inertiajs/react';
import { Alert, Anchor, Badge, Button, Card, Container, Grid, Group, Select, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight, IconRobot } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppLayout } from '@/layout/AppLayout';
import { langName } from '@/shared/LangIcon';
import { Markdown } from '@/shared/Markdown';
import { useSharedProps } from '@/shared/useSharedProps';

interface OnboardingProps {
  practice_langs: { slug: string; name: string }[];
  practice_lang: string | null;
  practice_task: { name: string; description_en: string | null; description_ru: string | null; examples: string | null } | null;
}

export default function Onboarding() {
  const { t } = useTranslation();
  const { practice_langs: langs, practice_lang: preferred, practice_task: task, locale } = useSharedProps<OnboardingProps>();
  const [lang, setLang] = useState<string | null>(preferred);
  const [starting, setStarting] = useState(false);
  const description = task && ((locale === 'ru' ? task.description_ru : task.description_en) || task.description_en || task.description_ru);

  return (
    <AppLayout>
      <Head title={t('Your first coding battle')} />
      <Container size="md" py="lg">
        <Stack gap="xl">
          <Stack gap="xs">
            <Anchor href="/" size="sm">← {t('Back')}</Anchor>
            <Title>{t('Your first coding battle')}</Title>
            <Text c="dimmed">{t('Choose a language, preview the task, and start when you’re ready.')}</Text>
          </Stack>
          <Grid gap="lg">
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <Card padding="lg">
                <form method="post" action="/games/training" onSubmit={(event) => { if (starting) event.preventDefault(); else setStarting(true); }}>
                  <input type="hidden" name="_csrf_token" value={document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ''} />
                  <input type="hidden" name="lang" value={lang ?? ''} />
                  <Stack gap="lg">
                    <Select
                      label={t('Which language do you want to use?')}
                      searchable
                      required
                      allowDeselect={false}
                      data={langs.map((item) => ({ value: item.slug, label: langName(item.slug) || item.name })).sort((a, b) => a.label.localeCompare(b.label))}
                      value={lang}
                      onChange={setLang}
                    />
                    <Group gap={6}><Badge color="green" variant="light">{t('Unrated')}</Badge><Badge variant="light" leftSection={<IconRobot size={12} />}>{t('Practice bot')}</Badge></Group>
                    <Text size="sm" c="dimmed">{t('Write your solution on the left. Watch the bot on the right. Run tests as often as you like.')}</Text>
                    <Text size="sm" c="dimmed">{t('The first correct solution wins. You can keep solving after the bot finishes.')}</Text>
                    <Button type="submit" color="green" size="md" fullWidth rightSection={<IconArrowRight size={16} />} loading={starting} disabled={!task || !lang}>
                      {t('Start practice battle')}
                    </Button>
                    <Text size="xs" c="dimmed">{t('No signup required. Your rating stays unchanged.')}</Text>
                  </Stack>
                </form>
              </Card>
              <Anchor href="/session/new" size="sm" mt="md" display="block">{t('Already play here? Sign in')}</Anchor>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 7 }}>
              <Card padding="lg">
                <Title order={2} size="h3" mb="md">{t('Your practice task')}</Title>
                {task ? (
                  <Stack gap="sm">
                    <Text size="xs" c="dimmed" ff="monospace">{task.name}</Text>
                    <Markdown>{description ?? ''}</Markdown>
                    {task.examples && <Markdown>{task.examples.includes('```') ? task.examples : `\`\`\`\n${task.examples}\n\`\`\``}</Markdown>}
                  </Stack>
                ) : <Alert color="yellow">{t('Practice is unavailable right now. Please try again later.')}</Alert>}
              </Card>
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </AppLayout>
  );
}
