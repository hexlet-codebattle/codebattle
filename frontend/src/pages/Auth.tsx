import { Anchor, Card, Center, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { DevSignIn, OrDivider, ResetPasswordForm, SignInForm, SignUpForm, SocialButtons, withNext } from '@/features/auth/AuthForms';
import { AppLayout } from '@/layout/AppLayout';
import { useSharedProps } from '@/shared/useSharedProps';

type Mode = 'sign_in' | 'sign_up' | 'reset_password' | 'token_only';

interface AuthProps {
  mode: Mode;
  /** Where to go after signing in (a local path). */
  next: string;
  dev_sign_in: boolean;
}

/** /session/new, /users/new, /remind_password (CodebattleWeb.AuthPage). */
export default function Auth() {
  const { t } = useTranslation();
  const { mode, next, dev_sign_in: devSignIn } = useSharedProps<AuthProps>();
  const verificationSent = new URLSearchParams(window.location.search).get('verification') === 'sent';

  const titles: Record<Mode, string> = {
    sign_in: t('Sign In'),
    sign_up: t('Sign Up'),
    reset_password: t('Reset password'),
    token_only: t('Sign In'),
  };

  return (
    <AppLayout>
      <Center py={{ base: 'md', sm: 48 }}>
        <Card w={420} maw="100%" padding="xl">
          <Stack gap="md">
            <Title order={2} ta="center">
              {titles[mode]}
            </Title>

            {mode === 'token_only' && (
              <Text ta="center" c="dimmed">
                {t('Contact support for help logging in.')}
              </Text>
            )}
            {mode === 'sign_in' && <SignInForm next={next} verificationSent={verificationSent} />}
            {mode === 'sign_up' && <SignUpForm next={next} />}
            {mode === 'reset_password' && <ResetPasswordForm />}

            {(mode === 'sign_in' || mode === 'sign_up') && (
              <>
                <OrDivider />
                <SocialButtons next={next} label={mode === 'sign_in' ? 'in' : 'up'} />
              </>
            )}

            {mode === 'sign_up' && (
              <Text size="xs" c="dimmed" ta="center">
                {t('By signing up, you confirm that you have read the')}{' '}
                <Anchor href="/privacy" size="xs" target="_blank">
                  {t('Privacy Policy')}
                </Anchor>
                .
              </Text>
            )}

            {mode !== 'token_only' && (
              <Stack gap={4} align="center">
                {mode !== 'sign_up' && (
                  <Text size="sm" c="dimmed">
                    {t("Don't have an account?")} <Anchor href={withNext('/users/new', next)}>{t('Sign Up')}</Anchor>
                  </Text>
                )}
                {mode !== 'sign_in' && (
                  <Text size="sm" c="dimmed">
                    {t('Already have an account?')} <Anchor href={withNext('/session/new', next)}>{t('Sign In')}</Anchor>
                  </Text>
                )}
              </Stack>
            )}

            {devSignIn && (
              <>
                <OrDivider />
                <DevSignIn />
              </>
            )}
          </Stack>
        </Card>
      </Center>
    </AppLayout>
  );
}
