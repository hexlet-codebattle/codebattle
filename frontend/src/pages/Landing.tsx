import { Anchor, Badge, Button, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconBriefcase, IconBuildingStadium, IconCheck, IconSwords, IconUsersGroup } from '@tabler/icons-react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import logo from '@/assets/logo.svg?raw';
import classes from '@/features/landing/Landing.module.css';
import { League, type LeaderboardRow, type LeagueTournament } from '@/features/landing/League';
import { AppLayout } from '@/layout/AppLayout';
import { LangIcon } from '@/shared/LangIcon';
import { useSharedProps } from '@/shared/useSharedProps';

interface LandingProps {
  season: { name: string; year: number } | null;
  leaderboard: LeaderboardRow[];
  league_tournaments: LeagueTournament[];
  version: string;
}

// LangIcon keys: one monochrome glyph set, so every logo gets the same grey.
const LANGUAGES = ['clojure', 'cpp', 'csharp', 'dart', 'elixir', 'golang', 'java', 'js', 'kotlin', 'php', 'python', 'ruby', 'rust', 'swift', 'ts', 'dlang', 'zig'];

const YEAR = new Date().getFullYear();

/** "A. B. C." → ["A.", "B.", "C."], so a translated headline can put each sentence on its own line. */
function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [text];
}

function TryBattle({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const { t } = useTranslation();
  return (
    <Button component="a" href="/onboarding" size={size} variant="filled" color="brand" leftSection={<IconSwords size={18} />} className={classes.primaryCta}>
      {t('Play your first battle')}
    </Button>
  );
}

function Section({ eyebrow, title, lead, children }: { eyebrow: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className={classes.section}>
      <Stack gap={8} align="center" ta="center" mb="xl">
        <Text className={classes.eyebrow}>{eyebrow}</Text>
        <Title order={2} className={classes.sectionTitle}>
          {title}
        </Title>
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

/** Cards are tinted gold / silver / bronze in order (`medal` 1–3), like the league podium. */
function Feature({ medal, icon, title, text, tags }: { medal: 1 | 2 | 3; icon: ReactNode; title: string; text: string; tags: string[] }) {
  return (
    <Card className={classes.feature} padding="lg" style={{ '--medal': `var(--cb-medal-${medal})` } as CSSProperties}>
      <span className={classes.featureIcon}>{icon}</span>
      <Title order={4} mb={6}>
        {title}
      </Title>
      <Text size="sm" c="dimmed" mb="md">
        {text}
      </Text>
      <Stack gap={6} mt="auto">
        {tags.map((tag) => (
          <Group key={tag} gap={8} wrap="nowrap">
            <IconCheck size={14} className={classes.check} />
            <Text size="sm">{tag}</Text>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

/** One line of code that "types" itself in; `at` is the start delay in seconds. */
function Typed({ at, children, length }: { at: number; length: number; children: ReactNode }) {
  return (
    <span className={classes.typed} style={{ '--len': length, '--at': `${at}s` } as CSSProperties}>
      {children}
    </span>
  );
}

function EditorPane({ name, lang, passed, winner, children }: { name: string; lang: string; passed: number; winner?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={classes.editor} data-winner={winner || undefined}>
      <Group justify="space-between" gap={6} wrap="nowrap" mb="sm">
        <Group gap={6} wrap="nowrap" miw={0}>
          <LangIcon lang={lang} withTooltip={false} />
          <Text size="xs" fw={700} c="bright" truncate>
            {name}
          </Text>
        </Group>
        {winner && (
          <Badge size="xs" variant="filled" className={classes.winner} style={{ '--badge-bg': 'var(--cb-medal-1)', '--badge-color': 'var(--cb-medal-text)' } as CSSProperties}>
            {t('Winner')}
          </Badge>
        )}
      </Group>
      <pre className={classes.code}>{children}</pre>
      <Group gap={6} mt="sm" wrap="nowrap">
        <Text fz={10} c="dimmed" tt="uppercase" fw={700} lts="0.06em">
          {t('Tests')}
        </Text>
        <div className={classes.tests}>
          {[0, 1, 2].map((i) => (
            <span key={i} data-pass={i < passed || undefined} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>
        <Text fz={11} ff="monospace" fw={700} c={passed === 3 ? 'green' : 'dimmed'}>
          {passed}/3
        </Text>
      </Group>
    </div>
  );
}

function BattlePreview() {
  const { t } = useTranslation();
  return (
    <Card className={classes.battlePreview} padding="lg" aria-label={t('How a coding battle works')}>
      <Group justify="space-between" mb="md">
        <Text fw={700} c="bright">
          {t('One task. Two editors.')}
        </Text>
        <Group gap={6} className={classes.live}>
          <span className={classes.liveDot} />
          <Text size="xs" fw={700} tt="uppercase" lts="0.08em">
            {t('Live')}
          </Text>
        </Group>
      </Group>
      <div className={classes.exampleTask}>
        <Text size="sm" fw={600} c="bright">
          {t('Count the unique letters in a word.')}
        </Text>
        <Text ff="monospace" size="sm" mt={6} c="dimmed">
          solution("banana") → <span className={classes.num}>3</span>
        </Text>
      </div>
      <div className={classes.arena}>
        <EditorPane name={t('You')} lang="js" passed={3} winner>
          <Typed at={0.4} length={21}>
            <span className={classes.kw}>const</span> <span className={classes.fn}>solution</span> = s <span className={classes.kw}>=&gt;</span>
          </Typed>
          <Typed at={1.4} length={18}>
            {'  '}<span className={classes.kw}>new</span> Set(s).size;
          </Typed>
        </EditorPane>
        <span className={classes.vs} aria-hidden>
          VS
        </span>
        <EditorPane name={t('Your opponent')} lang="python" passed={1}>
          <Typed at={0.8} length={16}>
            <span className={classes.kw}>def</span> <span className={classes.fn}>solution</span>(s):
          </Typed>
          <Typed at={2} length={17}>
            {'    '}
            <span className={classes.kw}>return</span> len(s)
          </Typed>
        </EditorPane>
      </div>
      <Group gap={8} mt="md" wrap="nowrap">
        <ThemeIcon variant="light" color="green" radius="xl" size="sm">
          <IconCheck size={14} />
        </ThemeIcon>
        <Text size="sm">{t('The first correct solution wins. Watch each other code live.')}</Text>
      </Group>
    </Card>
  );
}

function Stats() {
  const { t } = useTranslation();
  const stats: [string, string][] = [
    [String(LANGUAGES.length), t('languages to battle in')],
    ['1v1', t('real-time duels')],
    ['1,000+', t('players in a single tournament')],
    ['0', t('ads or third-party trackers')],
  ];

  return (
    <div className={classes.stats}>
      {stats.map(([value, label]) => (
        <div key={label} className={classes.stat}>
          <span className={classes.statValue}>{value}</span>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
        </div>
      ))}
    </div>
  );
}

/** `/` for guests: what Codebattle is, the current season's top five, and a way in. */
export default function Landing() {
  const { t } = useTranslation();
  const { season, leaderboard, league_tournaments: leagueTournaments = [], version } = useSharedProps<LandingProps>();
  const headline = splitSentences(t('A coding challenge. Two players. One winner.'));

  return (
    <AppLayout wide>
      <Container size="lg">
        <section className={classes.hero}>
          <Stack gap="lg" className={classes.heroText}>
            <div className={classes.brand}>
              <span className={classes.brandLogo} dangerouslySetInnerHTML={{ __html: logo }} aria-hidden />
              <div>
                <div className={classes.wordmark}>
                  <span>Code</span>battle
                </div>
                <Text className={classes.eyebrow}>{t('Code. Compete. Learn together.')}</Text>
              </div>
            </div>
            <Title className={classes.heroTitle}>
              {headline.map((sentence, index) => (
                <span key={sentence} className={classes.heroLine} style={{ '--i': index } as CSSProperties} data-last={index === headline.length - 1 || undefined}>
                  {sentence}
                  {index === headline.length - 1 && <span className={classes.caret} aria-hidden />}
                </span>
              ))}
            </Title>
            <Text size="lg" c="dimmed" maw={560}>
              {t('Solve the same task in your favorite language. See your opponent’s code live and race to pass the tests.')}
            </Text>
            <Group gap="md">
              <TryBattle />
              <Anchor href="/session/new" size="sm">
                {t('Already play here? Sign in')}
              </Anchor>
            </Group>
            <Group gap={8} wrap="nowrap">
              <IconCheck size={16} className={classes.check} />
              <Text size="sm" c="dimmed">
                {t('Start with a practice bot. No signup. No rating changes.')}
              </Text>
            </Group>
          </Stack>

          <BattlePreview />
        </section>

        <League tournaments={leagueTournaments} season={season} leaderboard={leaderboard} />

        <Section eyebrow={t('How it works')} title={t('Your first battle, step by step')} lead={t('Choose a language, preview the task, and start when you’re ready.')}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            {[
              [t('Choose your language'), t('Preview an approachable task before starting. Your practice opponent is a bot.')],
              [t('Write it. Run it.'), t('Fill in the solution and run the tests. Use the results to improve your code.')],
              [t('Play again or meet a rival'), t('Try another task, then create an account to challenge real players.')],
            ].map(([title, text], index) => (
              <Card key={title} className={classes.step} padding="lg" style={{ '--medal': `var(--cb-medal-${index + 1})` } as CSSProperties}>
                <span className={classes.stepNumber}>{String(index + 1).padStart(2, '0')}</span>
                <Title order={4} mb={6}>
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
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            <Feature
              medal={1}
              icon={<IconUsersGroup size={24} />}
              title={t('Friends & communities')}
              text={t('Create private rooms, invite friends, and enjoy real-time battles together.')}
              tags={[t('Invite links'), t('Live standings'), t('Instant rematch')]}
            />
            <Feature
              medal={2}
              icon={<IconBriefcase size={24} />}
              title={t('Team-building')}
              text={t('Run company tournaments and energize your team with friendly competition.')}
              tags={[t('Team brackets'), t('Flexible schedule'), t('Highlights')]}
            />
            <Feature
              medal={3}
              icon={<IconBuildingStadium size={24} />}
              title={t('Large-scale events')}
              text={t('Trusted for tournaments at scale with thousands of players.')}
              tags={[t('1,000+ players'), t('Stable rounds'), t('Fast judge')]}
            />
          </SimpleGrid>
        </Section>

        <Section eyebrow={t('Languages')} title={t('Battle in your language')} lead={t('Pick your stack and jump into any tournament format.')}>
          <div className={classes.languages}>
            {LANGUAGES.map((lang) => (
              <span key={lang} className={classes.langTile}>
                <LangIcon lang={lang} size={36} />
              </span>
            ))}
          </div>
        </Section>

        <Stats />

        <section className={classes.cta}>
          <Text className={classes.eyebrow}>{t('Code. Compete. Learn together.')}</Text>
          <Title order={2} className={classes.ctaTitle}>
            {t('Ready to enter the arena?')}
          </Title>
          <Text c="dimmed">{t('Choose a language, preview the task, and start when you’re ready.')}</Text>
          <TryBattle />
          <Anchor href="/session/new" size="sm">
            {t('Already play here? Sign in')}
          </Anchor>
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
