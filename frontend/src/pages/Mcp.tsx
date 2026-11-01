import { Head } from '@inertiajs/react';
import { Anchor, Badge, Button, CopyButton, Group, Stack, Text, Title } from '@mantine/core';
import {
  IconArrowDown, IconArrowRight, IconCheck, IconCopy, IconPlugConnected,
  IconShieldCheck, IconSwords, IconTournament, IconActivity,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';

import classes from './Mcp.module.css';

interface McpProps {
  server_url: string;
  tool_count: number;
}

export default function Mcp() {
  const { t } = useTranslation();
  const { server_url: serverUrl, tool_count: toolCount } = useSharedProps<McpProps>();
  const features = [
    { Icon: IconSwords, title: 'Find your next battle', text: 'Discover tasks, create a game with a bot, or invite a friend. Just ask your assistant.' },
    { Icon: IconTournament, title: 'Bring everyone together', text: 'Create a private tournament, invite players, and manage it from your conversation.' },
    { Icon: IconActivity, title: 'Stay in the game', text: 'Check your active game, upcoming tournaments, invitations, and rankings without switching tabs.' },
  ];
  const steps = [
    { title: 'Add the server', text: 'In your MCP client, add a remote server with the URL below. Choose Streamable HTTP and OAuth if prompted.' },
    { title: 'Sign in to Codebattle', text: 'Your client opens Codebattle in the browser. Sign in with your existing account.' },
    { title: 'Choose what to allow', text: 'Review the requested permissions and approve access. Your assistant is ready to use Codebattle.' },
  ];

  return (
    <AppLayout>
      <Head title={t('Codebattle MCP')} />
      <div className={classes.page}>
        <section className={classes.hero} aria-labelledby="mcp-title">
          <div className={classes.heroCopy}>
            <Group gap="xs">
              <Badge variant="light" color="teal" leftSection={<IconPlugConnected size={12} />}>MCP</Badge>
              <Text size="xs" c="dimmed">{t('%{count} tools. One connection.', { count: toolCount })}</Text>
            </Group>
            <Title id="mcp-title" order={1} className={classes.title}>
              {t('Your next battle starts with a prompt.')}
            </Title>
            <Text className={classes.subtitle}>
              {t('Connect your AI assistant to Codebattle. Find challenges, start games, and run tournaments right from your conversation.')}
            </Text>
            <Group gap="sm" mt="lg">
              <Button component="a" href="#connect" size="md" rightSection={<IconArrowDown size={17} />}>
                {t('Connect your assistant')}
              </Button>
              <Anchor href="/public_api/docs" size="sm" c="dimmed">{t('Explore the API')}</Anchor>
            </Group>
          </div>
          <div className={classes.conversation} aria-label={t('Example conversation')}>
            <div className={classes.conversationHeader}>
              <span className={classes.statusDot} />
              <Text size="xs" fw={600}>{t('Example conversation')}</Text>
              <IconPlugConnected size={16} />
            </div>
            <div className={classes.chatBody}>
              <Text className={classes.speaker}>{t('You')}</Text>
              <Text className={classes.prompt}>{t('Find an easy task and start a game with a bot.')}</Text>
              <div className={classes.toolCall}>
                <IconCheck size={14} />
                <code>list_tasks</code><IconArrowRight size={12} /><code>create_game</code>
              </div>
              <Text className={classes.speaker}>{t('Your assistant')}</Text>
              <div className={classes.gamePreview}>
                <IconSwords size={26} stroke={1.5} />
                <div>
                  <Text fw={700}>{t('Your game is ready.')}</Text>
                  <Text size="xs" c="dimmed">{t('Easy task · Bot opponent · 10 minutes')}</Text>
                </div>
                <IconArrowRight size={18} />
              </div>
              <Text size="xs" c="dimmed">{t('Less setup. More time to code.')}</Text>
            </div>
          </div>
        </section>

        <div className={classes.features}>
          {features.map(({ Icon, title, text }) => (
            <section key={title} className={classes.feature}>
              <Icon size={24} stroke={1.5} className={classes.featureIcon} />
              <Title order={3} size="h4">{t(title)}</Title>
              <Text size="sm" c="dimmed">{t(text)}</Text>
            </section>
          ))}
        </div>

        <section id="connect" className={classes.connect} aria-labelledby="connect-title">
          <Stack gap={6}>
            <Text className={classes.eyebrow}>{t('FROM PROMPT TO PLAY')}</Text>
            <Title id="connect-title" order={2}>{t('One URL. Three steps. You’re in.')}</Title>
            <Text c="dimmed" size="sm">{t('Use a client that supports remote MCP servers and OAuth. No API token to copy.')}</Text>
          </Stack>
          <div className={classes.serverUrl}>
            <div className={classes.urlContent}>
              <Text size="xs" c="dimmed">{t('MCP server URL')}</Text>
              <code>{serverUrl}</code>
            </div>
            <CopyButton value={serverUrl}>
              {({ copied, copy }) => (
                <Button onClick={copy} variant={copied ? 'light' : 'filled'} leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}>
                  {copied ? t('Copied') : t('Copy URL')}
                </Button>
              )}
            </CopyButton>
          </div>
          <ol className={classes.steps}>
            {steps.map(({ title, text }, index) => (
              <li key={title} className={classes.step}>
                <span className={classes.stepNumber} aria-hidden>{index + 1}</span>
                <div>
                  <Text fw={700} mb={4}>{t(title)}</Text>
                  <Text size="sm" c="dimmed">{t(text)}</Text>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={classes.permissions} aria-labelledby="permissions-title">
          <IconShieldCheck size={30} stroke={1.5} />
          <div>
            <Title id="permissions-title" order={2} size="h4">{t('Your account. Your permissions.')}</Title>
            <Text size="sm" c="dimmed" mt={6}>
              {t('Start with read-only access. Approve extra permissions for games or tournament management when you need them. Disconnect any application in Settings, at any time.')}
            </Text>
          </div>
          <Button component="a" href="/settings#connected-applications" variant="default" rightSection={<IconArrowRight size={15} />}>
            {t('Connected applications')}
          </Button>
        </section>
      </div>
    </AppLayout>
  );
}
