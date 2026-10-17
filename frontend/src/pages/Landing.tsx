import { Anchor, Avatar, Badge, Button, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck, IconSwords, IconTrophy } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { DevSignIn } from '@/features/auth/AuthForms';
import classes from '@/features/landing/Landing.module.css';
import { AppLayout } from '@/layout/AppLayout';
import { LangIcon } from '@/shared/LangIcon';
import { useSharedProps } from '@/shared/useSharedProps';

interface LeaderboardRow {
  place: number;
  user_id: number;
  user_name: string;
  avatar_url: string | null;
  user_lang: string | null;
  total_points: number;
}

interface LandingProps {
  season: { name: string; year: number } | null;
  leaderboard: LeaderboardRow[];
  dev_sign_in: boolean;
  version: string;
}

const LANGUAGES = ['clojure', 'cpp', 'c-sharp', 'dart', 'elixir', 'go', 'java', 'js', 'kotlin', 'php', 'python', 'ruby', 'rust', 'swift', 'ts', 'dlang', 'zig'];

const YEAR = new Date().getFullYear();

function TryBattle({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const { t } = useTranslation();
  return (
    <Button component="a" href="/onboarding" size={size} color="green" leftSection={<IconSwords size={18} />}>
      {t('Play your first battle')}
    </Button>
  );
}

function Section({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className={classes.section}>
      <Stack gap={6} align="center" ta="center" mb="lg">
        <Text className={classes.eyebrow}>{eyebrow}</Text>
        <Title order={2}>{title}</Title>
        {lead && (
          <Text c="dimmed" maw={680}>
            {lead}
          </Text>
        )}
      </Stack>
      {children}
    </section>
  );
}

function Feature({ title, text, tags }: { title: string; text: string; tags: string[] }) {
  return (
    <Card className={classes.feature}>
      <Title order={4} mb={6}>
        {title}
      </Title>
      <Text size="sm" c="dimmed" mb="sm">
        {text}
      </Text>
      <Group gap={6}>
        {tags.map((tag) => (
          <Badge key={tag} variant="light" color="gray">
            {tag}
          </Badge>
        ))}
      </Group>
    </Card>
  );
}

function BattlePreview() {
  const { t } = useTranslation();
  return (
    <Card className={classes.battlePreview} padding="lg" aria-label={t('How a coding battle works')}>
      <Group justify="space-between" mb="lg">
        <Text fw={700}>{t('One task. Two editors.')}</Text>
        <Badge variant="light" color="gray">{t('Example battle')}</Badge>
      </Group>
      <div className={classes.exampleTask}>
        <Text size="sm" fw={600}>{t('Return the sum of two numbers.')}</Text>
        <Text ff="monospace" size="sm" mt={8}>solution(2, 3) → 5</Text>
      </div>
      <SimpleGrid cols={2} spacing="xs" mt="sm">
        {[t('You'), t('Your opponent')].map((name) => (
          <div key={name} className={classes.exampleEditor}>
            <Text size="xs" fw={700} mb="md">{name}</Text>
            <Text ff="monospace" size="xs" c="dimmed">solution(a, b)</Text>
            <div className={classes.codeLine} />
            <div className={classes.codeLine} data-short />
          </div>
        ))}
      </SimpleGrid>
      <Group gap={8} mt="lg" wrap="nowrap">
        <ThemeIcon variant="light" color="green" radius="xl"><IconCheck size={16} /></ThemeIcon>
        <Text size="sm">{t('The first correct solution wins. Watch each other code live.')}</Text>
      </Group>
    </Card>
  );
}

/** `/` for guests: what Codebattle is, the current season's top five, and a way in. */
export default function Landing() {
  const { t } = useTranslation();
  const { season, leaderboard, dev_sign_in: devSignIn, version } = useSharedProps<LandingProps>();

  return (
    <AppLayout wide>
      <Container size="lg">
        <section className={classes.hero}>
          <Stack gap="md" className={classes.heroText}>
            <Text className={classes.eyebrow}>{t('Code. Compete. Learn together.')}</Text>
            <Title className={classes.heroTitle}>{t('A coding challenge. Two players. One winner.')}</Title>
            <Text size="lg" c="dimmed">
              {t('Solve the same task in your favorite language. See your opponent’s code live and race to pass the tests.')}
            </Text>
            <Group gap="sm">
              <TryBattle />
            </Group>
            <Text size="sm" c="dimmed">
              {t('Start with a practice bot. No signup. No rating changes.')}
            </Text>
            <Group gap={6}>
              {[t('Choose your language'), t('Preview the task'), t('Practice bot')].map((pill) => (
                <Badge key={pill} variant="light" color="green">
                  {pill}
                </Badge>
              ))}
            </Group>
            <Anchor href="/session/new" size="sm">{t('Already play here? Sign in')}</Anchor>
            {devSignIn && <DevSignIn />}
          </Stack>

          <BattlePreview />
        </section>

        <Section eyebrow={t('How it works')} title={t('Your first battle, step by step')} lead={t('Choose a language, preview the task, and start when you’re ready.')}>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {[
              [t('Choose your language'), t('Preview an approachable task before starting. Your practice opponent is a bot.')],
              [t('Write it. Run it.'), t('Fill in the solution and run the tests. Use the results to improve your code.')],
              [t('Play again or meet a rival'), t('Try another task, then create an account to challenge real players.')],
            ].map(([title, text], index) => (
              <Card key={title} className={classes.feature}>
                <ThemeIcon variant="light" color="green" size="lg" radius="md" mb="sm">
                  <Text fw={800} ff="monospace">
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </ThemeIcon>
                <Title order={4} mb={4}>
                  {title}
                </Title>
                <Text size="sm" c="dimmed">
                  {text}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Section>

        <Section eyebrow={t('Seasons and formats')} title={t('Current Season Leaderboard')}>
          <Card className={classes.leaderboard} maw={640} mx="auto">
            <Group justify="space-between" mb="sm">
              <Group gap={6}><IconTrophy size={18} /><Text fw={700}>{t('Top 5 players • current season')}</Text></Group>
              <Badge variant="light">{season ? `${season.name} ${season.year}` : t('Upcoming')}</Badge>
            </Group>
            {leaderboard.length === 0 ? <Text c="dimmed" size="sm">{t('Season standings will appear here soon.')}</Text> : (
              <Stack gap={6}>
                {leaderboard.map((row) => (
                  <Group key={row.user_id} gap="sm" wrap="nowrap" className={classes.leaderRow}>
                    <span className={classes.place}>{row.place}</span>
                    <Avatar src={row.avatar_url} size={32} radius="xl" />
                    <LangIcon lang={row.user_lang} />
                    <Text fw={700} c="bright" truncate flex={1}>{row.user_name}</Text>
                    <Text ff="monospace" fw={700}>{row.total_points} {t('pts')}</Text>
                  </Group>
                ))}
              </Stack>
            )}
            <Anchor href="/seasons" size="sm" mt="md">{t('Explore seasons and tournaments')}</Anchor>
          </Card>
        </Section>

        <Section
          eyebrow={t('Private tournaments')}
          title={t('Build your own tournaments for friends or teams')}
          lead={t('Host custom events for meetups, work team-building, or just fun sessions. We’ve run tournaments for 1,000+ players.')}
        >
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Feature title={t('Friends & communities')} text={t('Create private rooms, invite friends, and enjoy real-time battles together.')} tags={[t('Invite links'), t('Live standings'), t('Instant rematch')]} />
            <Feature title={t('Team-building')} text={t('Run company tournaments and energize your team with friendly competition.')} tags={[t('Team brackets'), t('Flexible schedule'), t('Highlights')]} />
            <Feature title={t('Large-scale events')} text={t('Trusted for tournaments at scale with thousands of players.')} tags={[t('1,000+ players'), t('Stable rounds'), t('Fast judge')]} />
          </SimpleGrid>
        </Section>

        <Section eyebrow={t('Languages')} title={t('Battle in your language')} lead={t('Pick your stack and jump into any tournament format.')}>
          <div className={classes.languages}>
            {LANGUAGES.map((lang) => (
              <img key={lang} src={`/assets/images/landing/languages/${lang}.svg`} alt={lang} width={64} height={64} loading="lazy" decoding="async" />
            ))}
          </div>
        </Section>

        <section className={classes.cta}>
          <Title order={2}>{t('Ready to enter the arena?')}</Title>
          <Text c="dimmed">{t('Choose a language, preview the task, and start when you’re ready.')}</Text>
          <TryBattle />
        </section>

        <Group justify="center" gap="lg" py="xl" c="dimmed" fz="sm">
          <span>© Hexlet ltd, {YEAR}</span>
          <Anchor href="https://t.me/hexletcommunity/5" target="_blank" c="dimmed" size="sm">
            {t('Support')}: Tg#codebattle
          </Anchor>
          <Anchor href="/privacy" c="dimmed" size="sm">
            {t('Privacy Policy')}
          </Anchor>
          <span>
            {t('Version')}: {version}
          </span>
        </Group>
      </Container>
    </AppLayout>
  );
}
