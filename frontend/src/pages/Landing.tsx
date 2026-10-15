import { Anchor, Avatar, Badge, Button, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconSwords, IconTrophy } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { DevSignIn } from '@/features/auth/AuthForms';
import classes from '@/features/landing/Landing.module.css';
import { AppLayout } from '@/layout/AppLayout';
import { LangIcon } from '@/shared/LangIcon';
import { MethodButton } from '@/shared/MethodButton';
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
    <MethodButton action="/games/training" method="post" size={size} color="green" leftSection={<IconSwords size={18} />}>
      {t('Try simple battle')}
    </MethodButton>
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

/** `/` for guests: what Codebattle is, the current season's top five, and a way in. */
export default function Landing() {
  const { t } = useTranslation();
  const { season, leaderboard, dev_sign_in: devSignIn, version } = useSharedProps<LandingProps>();

  return (
    <AppLayout wide>
      <Container size="lg">
        <section className={classes.hero}>
          <Stack gap="md" className={classes.heroText}>
            <Text className={classes.eyebrow}>{t('Tournaments. Seasons. Code-first competition.')}</Text>
            <Title className={classes.heroTitle}>{t('Play in the best coding arena')}</Title>
            <Text size="lg" c="dimmed">
              {t('Codebattle powers head-to-head battles, team brackets, and seasonal leaderboards. Set formats, invite players, and watch the rankings move in real time.')}
            </Text>
            <Group gap="sm">
              <TryBattle />
              <Button component="a" href="/users/new" size="lg" variant="default">
                {t('Sign up')}
              </Button>
            </Group>
            <Text size="sm" c="dimmed">
              {t('No registration required')}
            </Text>
            <Group gap={6}>
              {[t('Live ladders'), t('Team seasons'), t('Bots + training')].map((pill) => (
                <Badge key={pill} variant="light" color="green">
                  {pill}
                </Badge>
              ))}
            </Group>
            {devSignIn && <DevSignIn />}
          </Stack>

          <Card className={classes.leaderboard}>
            <Group justify="space-between" mb="sm">
              <Group gap={6}>
                <IconTrophy size={18} />
                <Text fw={700}>{t('Current Season Leaderboard')}</Text>
              </Group>
              <Badge variant="light">{season ? `${season.name} ${season.year}` : t('Upcoming')}</Badge>
            </Group>
            {leaderboard.length === 0 ? (
              <Text c="dimmed" size="sm">
                {t('Season standings will appear here soon.')}
              </Text>
            ) : (
              <Stack gap={6}>
                {leaderboard.map((row) => (
                  <Group key={row.user_id} gap="sm" wrap="nowrap" className={classes.leaderRow}>
                    <span className={classes.place}>{row.place}</span>
                    <Avatar src={row.avatar_url} size={32} radius="xl" />
                    <LangIcon lang={row.user_lang} />
                    <Text fw={700} c="bright" truncate flex={1}>
                      {row.user_name}
                    </Text>
                    <Text ff="monospace" fw={700}>
                      {row.total_points} {t('pts')}
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}
            <Text size="xs" c="dimmed" mt="sm">
              {t('Top 5 players • current season')}
            </Text>
          </Card>
        </section>

        <Section
          eyebrow={t('Seasons and formats')}
          title={t('Four seasons a year. One Grand Slam to crown the best.')}
          lead={t('Join a competitive ladder that resets each season so every coder gets a fresh climb. Swiss rounds keep every match fair, while lifetime Elo tracks your true skill across seasons. Top finishers earn prizes and exclusive merch.')}
        >
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Feature title={t('Season ladder')} text={t('Earn season points, climb the live leaderboard, and lock your place in the finale.')} tags={[t('Season points'), t('Finals on 21st'), t('Hall of Fame')]} />
            <Feature title={t('Swiss tournaments')} text={t('Face opponents with similar scores, solve the same task, and rise with every win.')} tags={[t('Swiss pairing'), t('Live standings'), t('No repeat pairs')]} />
            <Feature title={t('Grades & schedule')} text={t('Start at rookie, fight up the grades, and aim for the Grand Slam spotlight.')} tags={[t('Rookie → Grand Slam'), t('Grand Slam finale'), t('Points by place')]} />
          </SimpleGrid>
        </Section>

        <Section eyebrow={t('How it works')} title={t('Join, battle, climb, repeat')} lead={t('A clear loop that keeps the competition fair and the season exciting.')}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            {[
              [t('Join a season'), t('Seasons reset points so everyone gets a fresh shot at the top.')],
              [t('Battle in Swiss rounds'), t('Face opponents with similar scores on the same task each round.')],
              [t('Earn season points'), t('Climb the live leaderboard and secure your place in the finale.')],
              [t('Win the Grand Slam'), t('Champions take the spotlight, prizes, and exclusive merch.')],
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
          <Text c="dimmed">{t('Spin up a quick match or start planning your next season.')}</Text>
          <TryBattle />
        </section>

        <Group justify="center" gap="lg" py="xl" c="dimmed" fz="sm">
          <span>© Hexlet ltd, {YEAR}</span>
          <Anchor href="https://t.me/hexletcommunity/5" target="_blank" c="dimmed" size="sm">
            {t('Support')}: Tg#codebattle
          </Anchor>
          <span>
            {t('Version')}: {version}
          </span>
        </Group>
      </Container>
    </AppLayout>
  );
}
