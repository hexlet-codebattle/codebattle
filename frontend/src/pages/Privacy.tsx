import { Anchor, Card, Code, List, Stack, Table, Text, Title } from '@mantine/core';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FeedbackModal } from '@/features/feedback/FeedbackModal';
import { AppLayout } from '@/layout/AppLayout';
import { PageHeader } from '@/shared/PageHeader';
import { useSharedProps } from '@/shared/useSharedProps';

interface PrivacyProps {
  updated_on: string;
  session_days: number;
  stale_session_days: number;
  error_tracking: boolean;
  firebase_auth: boolean;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="xs" component="section">
      <Title order={3}>{title}</Title>
      {children}
    </Stack>
  );
}

/**
 * /privacy (PrivacyController; bump its @updated_on when this text changes). One policy for everyone, written to the strictest common
 * denominator (GDPR/UK GDPR, CCPA/CPRA, LGPD, PIPEDA, 152-FZ…) so it needs no per-country logic.
 * Keep it in sync with what the app stores: Codebattle.User.DataExport lists the records.
 */
export default function Privacy() {
  const { t } = useTranslation();
  const props = useSharedProps<PrivacyProps>();
  const isGuest = props.current_user.is_guest;
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <AppLayout>
      {!isGuest && <FeedbackModal opened={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}
      <Card maw={820} mx="auto" padding="xl">
        <PageHeader
          title={t('Privacy Policy')}
          subtitle={t('Last updated: %{date}', { date: props.updated_on })}
        />

        <Stack gap="xl">
          <Text>
            {t(
              'This policy explains what personal data we collect when you use Codebattle, why, and what control you have over it. It applies to everyone, wherever you live: every user gets the same rights, whether or not local law requires them.',
            )}
          </Text>

          <Section title={t('Who is responsible')}>
            <Text>
              {t('The controller (operator) of your personal data is %{operator}.', { operator: 'Codebattle' })}
            </Text>
            <Text>
              {t('For any privacy question or request, use the "Send feedback" form in the user menu (choose "Question").')}{' '}
              {!isGuest && (
                <Anchor component="button" onClick={() => setFeedbackOpen(true)} inherit>
                  {t('Send feedback')}
                </Anchor>
              )}
            </Text>
            <Text size="sm" c="dimmed">
              {t(
                'Codebattle is open-source software. If you use an instance run by someone else, that operator is responsible for your data there.',
              )}
            </Text>
          </Section>

          <Section title={t('What we collect')}>
            <List spacing="xs">
              <List.Item>
                <b>{t('Account')}:</b>{' '}
                {t(
                  'name, email and password (stored only as a hash), or, if you sign in with GitHub, Discord or a partner platform, your ID, username and avatar there.',
                )}
              </List.Item>
              <List.Item>
                <b>{t('Profile and settings')}:</b>{' '}
                {t('programming language, clan, editor and sound preferences, interface language, time zone.')}
              </List.Item>
              <List.Item>
                <b>{t('Activity')}:</b>{' '}
                {t('games, the code you write and submit, results, ratings, tournaments, achievements and chat messages.')}
              </List.Item>
              <List.Item>
                <b>{t('Fair-play data')}:</b>{' '}
                {t(
                  'during games we record summaries of editor activity (such as typing pace and pastes) and analyze submitted code to detect bots and cheating.',
                )}
              </List.Item>
              <List.Item>
                <b>{t('Technical data')}:</b>{' '}
                {t('the IP address and browser (user agent) of each signed-in session, server logs and error reports.')}
              </List.Item>
              <List.Item>
                <b>{t('Guests')}:</b> {t('a random guest ID in the session cookie. We reuse it to count landing visits, practice setup, test runs, solved practice tasks, another practice and sign-in. These onboarding records stay on our servers for up to 90 days and contain no IP address, browser details, account ID or submitted code.')}
              </List.Item>
            </List>
            <Text>
              {t(
                'We do not collect sensitive data (health, beliefs, biometrics and the like), we do not buy data about you, and we do not build advertising profiles.',
              )}
            </Text>
          </Section>

          <Section title={t('Why we use it')}>
            <List spacing="xs">
              <List.Item>
                <b>{t('To provide the service')}</b> ({t('performance of our agreement with you')}):{' '}
                {t('accounts, games, ratings, tournaments and events.')}
              </List.Item>
              <List.Item>
                <b>{t('To keep it secure and fair')}</b> ({t('legitimate interests')}):{' '}
                {t('sign-in sessions, abuse and rate limiting, cheating and bot detection.')}
              </List.Item>
              <List.Item>
                <b>{t('To fix bugs')}</b> ({t('legitimate interests')}): {t('error reports.')}
              </List.Item>
              <List.Item>
                <b>{t('To improve onboarding')}</b>: {t('first-party counts of the steps from landing to practice. We skip this measurement when your browser sends Do Not Track or Global Privacy Control.')}
              </List.Item>
              <List.Item>
                <b>{t('To meet legal obligations')}</b>, {t('when the law requires us to keep or disclose data.')}
              </List.Item>
            </List>
            <Text>
              {t(
                'We never sell your personal data, never share it for cross-context behavioral advertising, and never use it for targeted ads. If fair-play checks flag one of your results and you think that is wrong, contact us and a person will review it.',
              )}
            </Text>
          </Section>

          <Section title={t('What other users can see')}>
            <Text>
              {t(
                'Your name, avatar, rating, clan, achievements and games, including the code written in them and game chat messages, are visible to other users. Your email, sessions and settings are not.',
              )}
            </Text>
          </Section>

          <Section title={t('Cookies and local storage')}>
            <Table withTableBorder verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('Name')}</Table.Th>
                  <Table.Th>{t('Purpose')}</Table.Th>
                  <Table.Th>{t('Lifetime')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>
                    <Code>_codebattle_key</Code>
                  </Table.Td>
                  <Table.Td>
                    {t('Signed, HTTP-only session cookie: keeps you signed in, holds your guest ID and language.')}
                  </Table.Td>
                  <Table.Td>{t('%{count} days', { count: props.session_days })}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>{t('Local storage')}</Table.Td>
                  <Table.Td>
                    {t('Preferences you choose (theme, editor, sound, layouts) and that this notice was dismissed. Never sent to us.')}
                  </Table.Td>
                  <Table.Td>{t('Until you clear it')}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
            <Text>
              {t(
                'We use no additional analytics cookies, advertising cookies or third-party trackers. First-party onboarding counts reuse the existing guest session and honor Do Not Track and Global Privacy Control. Fonts are served from our own servers. Profile pictures of users who signed in with GitHub, Discord or a partner platform load from those services, which see your IP address. You can delete cookies and local storage in your browser at any time; you will be signed out.',
              )}
            </Text>
          </Section>

          <Section title={t('Service providers')}>
            <Text>{t('We share data only with providers that help run the service, under contracts that limit its use to our instructions:')}</Text>
            <List spacing="xs">
              <List.Item>{t('our hosting provider, which stores the database and runs the servers;')}</List.Item>
              {props.firebase_auth && (
                <List.Item>{t('Google Firebase Authentication, for email and password sign-in and verification emails;')}</List.Item>
              )}
              {props.error_tracking && <List.Item>{t('Sentry, for error reports;')}</List.Item>}
              <List.Item>{t('GitHub and Discord, only if you choose to sign in with them;')}</List.Item>
              <List.Item>{t('partner learning platforms, only for events you join through them.')}</List.Item>
            </List>
            <Text>
              {t(
                'Some providers process data outside your country. Where the law requires it, such transfers rely on appropriate safeguards, such as the EU Standard Contractual Clauses. We may also disclose data when required by law.',
              )}
            </Text>
          </Section>

          <Section title={t('How long we keep it')}>
            <List spacing="xs">
              <List.Item>{t('Account and activity data: until you delete your account.')}</List.Item>
              <List.Item>
                {t(
                  'After deletion: your name is anonymized; email, avatar, linked accounts and session IP addresses are erased. Games and tournament results stay without your name, because other players’ results and ratings depend on them.',
                )}
              </List.Item>
              <List.Item>
                {t(
                  'Sign-in sessions: up to %{days} days; ended sessions, with their IP address and browser, are deleted %{stale} days later.',
                  { days: props.session_days, stale: props.stale_session_days },
                )}
              </List.Item>
              <List.Item>{t('Error reports and backups: a limited period, after which they are overwritten.')}</List.Item>
            </List>
          </Section>

          <Section title={t('Your rights')}>
            <Text>{t('Wherever you live, you can:')}</Text>
            <List spacing="xs">
              <List.Item>
                {t('get a copy of your data in a portable format: ask us through the feedback form;')}
              </List.Item>
              <List.Item>{t('correct it: Settings → Profile;')}</List.Item>
              <List.Item>{t('delete it: Settings → Danger zone → Archive account;')}</List.Item>
              <List.Item>{t('object to or restrict processing, and withdraw any consent you gave;')}</List.Item>
              <List.Item>{t('complain to your data protection authority.')}</List.Item>
            </List>
            <Text>
              {t(
                'For anything you cannot do in Settings, contact us. We answer within 30 days, free of charge, and you will never be treated differently for using these rights.',
              )}
            </Text>
          </Section>

          <Section title={t('Children')}>
            <Text>
              {t(
                'Codebattle is not directed at children under 13. If you are under the age at which you can consent to data processing in your country (between 13 and 16 in most places), ask a parent or guardian before signing up. Parents can contact us to have a child’s account deleted.',
              )}
            </Text>
          </Section>

          <Section title={t('Security')}>
            <Text>
              {t(
                'Connections are encrypted (HTTPS), passwords and session tokens are stored only as hashes, and session cookies are signed and unreadable by scripts. No system is perfectly secure; if a breach affects your data, we will notify you and the authorities as the law requires.',
              )}
            </Text>
          </Section>

          <Section title={t('Changes')}>
            <Text>
              {t(
                'When this policy changes, we update the date at the top. Significant changes are announced on the site before they take effect.',
              )}
            </Text>
          </Section>
        </Stack>
      </Card>
    </AppLayout>
  );
}
