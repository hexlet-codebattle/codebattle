import {
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Loader,
  Menu,
  Modal,
  NumberInput,
  Paper,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Slider,
  Splitter,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBolt,
  IconClock,
  IconDots,
  IconFlag,
  IconPlayerPlay,
  IconSearch,
  IconSettings,
  IconSwords,
  IconTrophy,
  IconUsers,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { ColorSchemeToggle } from '@/layout/ColorSchemeToggle';
import { UserAvatar } from '@/shared/UserAvatar';
import { grades, type Grade } from '@/theme/colors';

import classes from './Showcase.module.css';

const PALETTES = ['dark', 'slate', 'green', 'red', 'orange', 'blue', 'violet', 'yellow'] as const;

const TOKENS = [
  ['--cb-success', 'success'],
  ['--cb-danger', 'danger'],
  ['--cb-panel', 'panel'],
  ['--cb-panel-gradient', 'panel gradient'],
  ['--cb-sunken', 'sunken'],
  ['--cb-border', 'border'],
  ['--cb-tab', 'tab'],
] as const;

const BUTTON_COLORS = ['slate', 'green', 'red', 'orange', 'blue'] as const;

const LEADERS = [
  { name: 'vtm', lang: 'ruby', score: 1840, grade: 'grand_slam' as Grade },
  { name: 'mokevnin', lang: 'elixir', score: 1712, grade: 'masters' as Grade },
  { name: 'ReDBrother', lang: 'js', score: 1650, grade: 'elite' as Grade },
  { name: 'solar05', lang: 'python', score: 1433, grade: 'pro' as Grade },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm" component="section">
      <Title order={4}>{title}</Title>
      {children}
    </Stack>
  );
}

function Swatch({ value, label, text }: { value: string; label: string; text?: string }) {
  return (
    <Stack gap={4} align="center">
      <div className={classes.swatch} style={{ background: value, color: text }}>
        {text && 'Aa'}
      </div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Stack>
  );
}

function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <Badge variant="outline" style={{ color: `var(--cb-grade-${grade})`, borderColor: `var(--cb-grade-${grade})` }}>
      {grade.replace('_', ' ')}
    </Badge>
  );
}

function PlayerPanel({ name, result, progress }: { name: string; result: 'ok' | 'fail'; progress: number }) {
  return (
    <Paper p="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Avatar size="sm" color="slate">
            {name[0].toUpperCase()}
          </Avatar>
          <Text fw={600} c="bright">
            {name}
          </Text>
          <Badge size="xs" color="slate" variant="filled">
            ruby
          </Badge>
        </Group>
        <Badge color={result === 'ok' ? 'green' : 'red'}>{result === 'ok' ? 'passed' : '3/7 asserts'}</Badge>
      </Group>
      <Progress mt="xs" size="sm" value={progress} color={result === 'ok' ? 'green' : 'red'} />
    </Paper>
  );
}

function GameRoomPreview() {
  return (
    <Paper p={0} className={classes.gameRoom}>
      <Group justify="space-between" px="md" py="xs" className={classes.gameRoomBar}>
        <Group gap="xs">
          <IconSwords size={18} />
          <Text ff="monospace" fw={600} c="bright">
            Sum of digits
          </Text>
          <Badge color="orange">medium</Badge>
        </Group>
        <Group gap="xs">
          <IconClock size={16} />
          <Text ff="monospace" fw={600} c="bright">
            04:37
          </Text>
        </Group>
      </Group>
      <Splitter h={320}>
        <Splitter.Pane defaultSize="50%" min="20%">
          <Stack p="sm" gap="sm" h="100%">
            <PlayerPanel name="vtm" result="ok" progress={100} />
            <div className={classes.editor} />
          </Stack>
        </Splitter.Pane>
        <Splitter.Pane defaultSize="50%" min="20%">
          <Stack p="sm" gap="sm" h="100%">
            <PlayerPanel name="mokevnin" result="fail" progress={43} />
            <div className={classes.editor} />
          </Stack>
        </Splitter.Pane>
      </Splitter>
      <Group justify="flex-end" gap="xs" px="md" py="xs" className={classes.gameRoomBar}>
        <Button variant="outline" color="red" leftSection={<IconFlag size={16} />}>
          Give up
        </Button>
        <Button color="green" leftSection={<IconPlayerPlay size={16} />}>
          Run
        </Button>
      </Group>
    </Paper>
  );
}

export function Showcase() {
  const [modalOpened, modal] = useDisclosure(false);

  return (
    <Container size="lg" py="xl">
      <Stack gap={40}>
        <Group justify="space-between">
          <Title order={1} ff="var(--cb-font-display)">
            codebattle theme
          </Title>
          <Group gap="sm">
            <Text c="dimmed" size="sm">
              Mantine + tokens from the legacy SCSS
            </Text>
            <ColorSchemeToggle />
          </Group>
        </Group>

        <Section title="Tokens">
          <Group gap="lg">
            {TOKENS.map(([name, label]) => (
              <Swatch
                key={name}
                value={`var(${name})`}
                label={label}
                text={label === 'success' || label === 'danger' ? 'var(--mantine-color-white)' : undefined}
              />
            ))}
          </Group>
          <Group gap="lg">
            {Object.keys(grades).map((grade) => (
              <Swatch key={grade} value={`var(--cb-grade-${grade})`} label={grade} />
            ))}
          </Group>
        </Section>

        <Section title="Palettes">
          <Stack gap={6}>
            {PALETTES.map((palette) => (
              <Group key={palette} gap={4} wrap="nowrap">
                <Text size="xs" c="dimmed" w={56}>
                  {palette}
                </Text>
                {Array.from({ length: 10 }, (_, shade) => (
                  <Tooltip key={shade} label={`${palette}.${shade}`}>
                    <div className={classes.shade} style={{ background: `var(--mantine-color-${palette}-${shade})` }} />
                  </Tooltip>
                ))}
              </Group>
            ))}
          </Stack>
        </Section>

        <Section title="Default avatars">
          {[64, 44, 26, 22].map((size) => (
            <Group key={size} gap="sm">
              {[0, 1, 2, 3, 4, 5].map((id) => (
                <UserAvatar key={id} user={{ id, avatar_url: null }} size={size} />
              ))}
              <Text size="xs" c="dimmed">
                {size}px
              </Text>
            </Group>
          ))}
        </Section>

        <Section title="Typography">
          <Title order={1}>Heading one</Title>
          <Title order={2}>Heading two</Title>
          <Title order={3}>Heading three</Title>
          <Text>
            Body copy. Solve the task faster than your opponent; <Anchor href="#">links</Anchor> are white in dark,
            slate in light, and turn danger-red on hover.
          </Text>
          <Text c="dimmed" size="sm">
            Dimmed secondary text for metadata, timestamps and hints.
          </Text>
          <Text ff="monospace">def solution(n) = n.digits.sum</Text>
          <Text size="sm" c="var(--cb-success)">
            Joined channel: Chat:lobby
          </Text>
          <Text size="sm" c="var(--cb-danger)">
            Clean banned
          </Text>
        </Section>

        <Section title="Buttons">
          {(['filled', 'light', 'outline', 'subtle'] as const).map((variant) => (
            <Group key={variant} gap="xs">
              {BUTTON_COLORS.map((color) => (
                <Button key={color} variant={variant} color={color}>
                  {color}
                </Button>
              ))}
              <Text size="xs" c="dimmed">
                {variant}
              </Text>
            </Group>
          ))}
          <Group gap="xs">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button>md</Button>
            <Button disabled>disabled</Button>
            <Button loading>loading</Button>
            <Button color="green" leftSection={<IconBolt size={16} />}>
              Create game
            </Button>
            <ActionIcon aria-label="settings">
              <IconSettings size={18} />
            </ActionIcon>
            <ActionIcon variant="filled" color="slate" aria-label="more">
              <IconDots size={18} />
            </ActionIcon>
          </Group>
        </Section>

        <Section title="Inputs">
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput label="Search" placeholder="Task name" leftSection={<IconSearch size={16} />} />
            <Select label="Language" placeholder="Pick one" data={['ruby', 'elixir', 'python', 'js']} />
            <NumberInput label="Timeout, min" defaultValue={15} min={1} max={60} />
            <TextInput label="With error" defaultValue="??" error="Invalid name" />
            <TextInput label="Disabled" disabled defaultValue="read only" />
            <Stack gap="xs" justify="flex-end">
              <Switch label="Ranked" defaultChecked />
              <Checkbox label="Only my games" />
            </Stack>
          </SimpleGrid>
          <SegmentedControl data={['easy', 'medium', 'hard', 'elementary']} />
          <Slider defaultValue={40} color="red" marks={[{ value: 20 }, { value: 50 }, { value: 80 }]} />
        </Section>

        <Section title="Panels">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Card>
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconTrophy size={18} />
                    <Text fw={600} c="bright">
                      Weekly Swiss
                    </Text>
                  </Group>
                  <Badge color="green">live</Badge>
                </Group>
              </Card.Section>
              <Stack gap={4} mt="sm">
                <Group gap="xs">
                  <IconUsers size={14} />
                  <Text size="sm" c="dimmed">
                    128 players · round 3 of 7
                  </Text>
                </Group>
                <GradeBadge grade="elite" />
              </Stack>
            </Card>
            <Paper p="md" bg="var(--cb-sunken)">
              <Text size="sm" c="dimmed">
                Sunken panel for nested content (output, chat, task text).
              </Text>
            </Paper>
          </SimpleGrid>
          <Group gap="xs">
            {(Object.keys(grades) as Grade[]).map((grade) => (
              <GradeBadge key={grade} grade={grade} />
            ))}
          </Group>
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="active">
            <Tabs.List>
              <Tabs.Tab value="active">Active games</Tabs.Tab>
              <Tabs.Tab value="tournaments">Tournaments</Tabs.Tab>
              <Tabs.Tab value="completed">Completed</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="active" pt="sm">
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>#</Table.Th>
                    <Table.Th>Player</Table.Th>
                    <Table.Th>Lang</Table.Th>
                    <Table.Th>Grade</Table.Th>
                    <Table.Th ta="right">Score</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {LEADERS.map((leader, index) => (
                    <Table.Tr key={leader.name}>
                      <Table.Td>{index + 1}</Table.Td>
                      <Table.Td c="bright">{leader.name}</Table.Td>
                      <Table.Td>{leader.lang}</Table.Td>
                      <Table.Td>
                        <GradeBadge grade={leader.grade} />
                      </Table.Td>
                      <Table.Td ta="right" ff="monospace">
                        {leader.score}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Tabs.Panel>
            <Tabs.Panel value="tournaments" pt="sm">
              <Text c="dimmed">No tournaments yet.</Text>
            </Tabs.Panel>
            <Tabs.Panel value="completed" pt="sm">
              <Text c="dimmed">No games yet.</Text>
            </Tabs.Panel>
          </Tabs>
        </Section>

        <Section title="Feedback">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Alert color="green" title="Solution accepted">
              All 12 asserts passed in 84 ms.
            </Alert>
            <Alert color="red" title="Check failed">
              Expected 6, got 5.
            </Alert>
          </SimpleGrid>
          <Group>
            <Loader size="sm" color="green" />
            <Progress value={66} w={200} color="green" />
            <Badge color="blue">info</Badge>
            <Badge color="violet">new</Badge>
            <Badge color="yellow">bonus</Badge>
          </Group>
          <Stack gap={6}>
            <Skeleton h={12} w="60%" />
            <Skeleton h={12} w="40%" />
          </Stack>
        </Section>

        <Section title="Overlays">
          <Group>
            <Button onClick={modal.open}>Open modal</Button>
            <Menu>
              <Menu.Target>
                <Button variant="outline">Menu</Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Game</Menu.Label>
                <Menu.Item leftSection={<IconSwords size={14} />}>Rematch</Menu.Item>
                <Menu.Item leftSection={<IconFlag size={14} />} color="red">
                  Give up
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Tooltip label="Tooltip on panel colours">
              <Button variant="subtle">Hover me</Button>
            </Tooltip>
          </Group>
          <Modal opened={modalOpened} onClose={modal.close} title="Rematch?">
            <Text size="sm" c="dimmed">
              mokevnin offers a rematch on the same task.
            </Text>
            <Group justify="flex-end" mt="md" gap="xs">
              <Button variant="outline" color="red" onClick={modal.close}>
                Decline
              </Button>
              <Button color="green" onClick={modal.close}>
                Accept
              </Button>
            </Group>
          </Modal>
        </Section>

        <Section title="Game room (layout sketch)">
          <GameRoomPreview />
        </Section>
      </Stack>
    </Container>
  );
}
