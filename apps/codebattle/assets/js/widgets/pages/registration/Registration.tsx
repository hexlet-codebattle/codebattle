import React, { type ReactNode, useState } from 'react';

import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  ActionIcon,
  Alert,
  Anchor,
  Box,
  Button,
  Flex,
  Paper,
  Stack,
  Text,
  TextInput,
  Title as MantineTitle,
} from '@mantine/core';
import { type FormikProps, useFormik } from 'formik';
import * as Yup from 'yup';

import i18n from '../../../i18n';
import { alertVariantColor } from '../../ui/alert';
import schemas from '../../formik';

// Sub-components are shared across forms with different value shapes, so the
// formik prop is typed loosely against Formik's own generic (formik ships no
// non-generic props type that fits every caller here).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RegistrationFormik = FormikProps<any>;

interface ResponseError extends Error {
  response?: { data: { errors?: Record<string, string> }; status: number };
}

const getCsrfToken = () =>
  document.querySelector("meta[name='csrf-token']")?.getAttribute('content') ?? ''; // validation token
const postJson = async (url: string, payload: unknown) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (!response.ok) {
    const error: ResponseError = new Error(`Request failed with status ${response.status}`);
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
};

const isShowInvalidMessage = (formik: RegistrationFormik, typeValue: string) =>
  formik.submitCount !== 0 && !!formik.errors[typeValue];

interface ContainerProps {
  children: ReactNode;
}

function Container({ children }: ContainerProps) {
  return (
    <Flex justify="center" px={{ md: 'lg' }}>
      <Box w={{ base: '100%', sm: '41.6667%' }}>
        <Paper withBorder radius="md" shadow="sm" bg="transparent" style={{ overflow: 'hidden' }}>
          {children}
        </Paper>
      </Box>
    </Flex>
  );
}

interface TitleProps {
  text: string;
}

function Title({ text }: TitleProps) {
  return (
    <MantineTitle order={3} ta="center" c="white">
      {i18n.t(text)}
    </MantineTitle>
  );
}

interface FormProps {
  children: ReactNode;
  id: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

function Form({ onSubmit, id, children }: FormProps) {
  return (
    <form onSubmit={onSubmit} noValidate>
      {children}
      <Button
        type="submit"
        name="commit"
        id={`${id}-submit`}
        aria-label={i18n.t('Submit form')}
        color="cbSecondary"
        radius="md"
        fullWidth
        mt="sm"
      >
        {i18n.t('Submit')}
      </Button>
    </form>
  );
}

interface InputProps {
  formik: RegistrationFormik;
  id: string;
  title?: string;
  type: string;
}

function Input({ id, type, title, formik }: InputProps) {
  const isInvalid = isShowInvalidMessage(formik, id);

  if (type === 'hidden') {
    return (
      <>
        <input type="hidden" id={id} aria-label={id} {...formik.getFieldProps(id)} />
        {isInvalid && (
          <Text c="red" size="sm">
            {formik.errors[id] as ReactNode}
          </Text>
        )}
      </>
    );
  }

  return (
    <TextInput
      mb="md"
      type={type}
      id={id}
      aria-label={id}
      label={title ? i18n.t(title) : undefined}
      error={isInvalid ? (formik.errors[id] as ReactNode) : undefined}
      {...formik.getFieldProps(id)}
    />
  );
}

interface PasswordInputProps {
  formik: RegistrationFormik;
  id: string;
  title: string;
}

function PasswordInput({ id, title, formik }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isInvalid = isShowInvalidMessage(formik, id);
  const translatedTitle = i18n.t(title).toLowerCase();
  const visibilityLabel = i18n.t(showPassword ? 'Hide %{field}' : 'Show %{field}', {
    field: translatedTitle,
  });

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  return (
    <TextInput
      mb="md"
      type={showPassword ? 'text' : 'password'}
      id={id}
      aria-label={id}
      label={i18n.t(title)}
      error={isInvalid ? (formik.errors[id] as ReactNode) : undefined}
      rightSection={
        <ActionIcon
          variant="transparent"
          color="gray"
          aria-label={visibilityLabel}
          aria-pressed={showPassword}
          title={visibilityLabel}
          onClick={togglePasswordVisibility}
        >
          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
        </ActionIcon>
      }
      {...formik.getFieldProps(id)}
    />
  );
}

function Body({ children }: { children: ReactNode }) {
  return <Box p={{ base: 'md', lg: 'lg', xl: 'xl' }}>{children}</Box>;
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <Box
      bg="cbHighlight"
      py="sm"
      px="md"
      ta="center"
      c="white"
      style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
    >
      {children}
    </Box>
  );
}

const searchParams = new URLSearchParams(window.location.search);
const getNextLocation = () => (searchParams.has('next') ? (searchParams.get('next') ?? '/') : '/');
const getLinkWithNext = (link: string) =>
  searchParams.has('next') ? `${link}?next=${searchParams.get('next')}` : link;
const getSignInAfterRegistrationLocation = () => {
  const params = new URLSearchParams();
  const next = searchParams.get('next');

  if (next) params.set('next', next);
  params.set('verification', 'sent');

  return `/session/new?${params.toString()}`;
};
const redirectTo = (path: string) => {
  if (window.navigator.userAgent.includes('jsdom')) {
    window.history.replaceState({}, '', path);
    return;
  }

  window.location.href = path;
};

interface SocialLinksProps {
  isSignUp: boolean;
}

function SocialLinks({ isSignUp }: SocialLinksProps) {
  return (
    <Stack gap="xs" mt="xs">
      <Button
        component="a"
        variant="outline"
        color="cbSecondary"
        radius="md"
        fullWidth
        px="sm"
        aria-label={isSignUp ? 'signUpWithGithub' : 'signInWithGithub'}
        href={getLinkWithNext('/auth/github')}
      >
        {isSignUp ? i18n.t('Sign up with Github') : i18n.t('Sign in with Github')}
      </Button>
      <Button
        component="a"
        variant="outline"
        color="cbSecondary"
        radius="md"
        fullWidth
        px="sm"
        aria-label={isSignUp ? 'signUpWithDiscord' : 'signInWithDiscord'}
        href={getLinkWithNext('/auth/discord')}
      >
        {isSignUp ? i18n.t('Sign up with Discord') : i18n.t('Sign in with Discord')}
      </Button>
    </Stack>
  );
}

function SignInInvitation() {
  return (
    <Text size="sm" c="cbText">
      {i18n.t('If you have an account')}
      <Anchor href={getLinkWithNext('/session/new')} c="white" ml="md">
        {i18n.t('Sign In')}
      </Anchor>
    </Text>
  );
}

function SignUpInvitation() {
  return (
    <Text size="sm" c="cbText">
      {i18n.t('Have not an account?')}
      <Anchor href={getLinkWithNext('/users/new')} ml="md">
        {i18n.t('Sign Up')}
      </Anchor>
    </Text>
  );
}

function SignIn() {
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object().shape(schemas.signIn),
    onSubmit: ({ email, password }) => {
      const data = { email, password };

      postJson('/api/v1/session', data)
        .then(() => {
          redirectTo(getNextLocation());
        })
        .catch((error) => {
          // TODO: add log for auth error
          // TODO: Add better errors handler
          if (error.response.data.errors) {
            const { errors } = error.response.data;
            if (errors.email) {
              formik.setFieldError('email', errors.email);
            }
            if (errors.base) {
              const message =
                errors.base === 'EMAIL_NOT_VERIFIED'
                  ? i18n.t(
                      'Please verify your email before signing in. A new verification email was sent.',
                    )
                  : errors.base;
              formik.setFieldError('base', message);
            }
          }
        });
    },
  });

  return (
    <Container>
      <Body>
        <Form onSubmit={formik.handleSubmit} id="login">
          <Title text="Sign In" />
          {searchParams.get('verification') === 'sent' && (
            <Alert color={alertVariantColor('info')} role="status" mb="md">
              {i18n.t('We sent a verification email. Please confirm your email before signing in.')}
            </Alert>
          )}
          <Input id="base" type="hidden" formik={formik} />
          <Input id="email" type="email" title="Email" formik={formik} />
          <PasswordInput id="password" title="Password" formik={formik} />
          <Box ta="right" my="md">
            <Anchor href="/remind_password">{i18n.t('Forgot your password?')}</Anchor>
          </Box>
        </Form>
        <SocialLinks isSignUp={false} />
      </Body>
      <Footer>
        <SignUpInvitation />
      </Footer>
    </Container>
  );
}

function SignUp() {
  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    validationSchema: Yup.object().shape(schemas.signUp),
    onSubmit: (formData) => {
      postJson('/api/v1/users', formData)
        .then(() => {
          redirectTo(getSignInAfterRegistrationLocation());
        })
        .catch((error) => {
          // TODO: Add better errors handler
          if (error.response.data.errors) {
            const { errors } = error.response.data;
            if (errors.name) {
              formik.setFieldError('name', errors.name);
            }
            if (errors.email) {
              formik.setFieldError('email', errors.email);
            }
            if (errors.base) {
              formik.setFieldError('base', errors.base);
            }
          }
        });
    },
  });

  return (
    <Container>
      <Body>
        <Form onSubmit={formik.handleSubmit} id="registration">
          <Title text="Sign Up" />
          <Input id="base" type="hidden" formik={formik} />
          <Input id="name" type="text" title="Nickname" formik={formik} />
          <Input id="email" type="email" title="Email" formik={formik} />
          <PasswordInput id="password" title="Password" formik={formik} />
          <PasswordInput id="passwordConfirmation" title="Password Confirmation" formik={formik} />
        </Form>
        <SocialLinks isSignUp />
      </Body>
      <Footer>
        <SignInInvitation />
      </Footer>
    </Container>
  );
}

function ResetPassword() {
  const [isSend, setIsSend] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: Yup.object().shape(schemas.resetPassword),
    onSubmit: ({ email }) => {
      postJson('/api/v1/reset_password', { email })
        .then(() => {
          setIsSend(true);
        })
        .catch((error) => {
          // TODO: add log for auth error
          // TODO: Add better errors handler
          if (error.response.data.errors) {
            const { errors } = error.response.data;
            if (errors.email) {
              formik.setFieldError('email', errors.email);
            }
            if (errors.base) {
              formik.setFieldError('base', errors.base);
            }
          }
        });
    },
  });

  if (isSend) {
    return (
      <Container>
        <Body>
          <Text mb={0} c="white">
            {i18n.t('We have sent you an email with instructions on how to reset your password')}
          </Text>
        </Body>
      </Container>
    );
  }

  return (
    <Container>
      <Body>
        <Form onSubmit={formik.handleSubmit} id="remindPassword">
          <Title text="Forgot your password?" />
          <Input id="base" type="hidden" formik={formik} />
          <Input id="email" type="email" title="Email" formik={formik} />
        </Form>
      </Body>
      <Footer>
        <SignUpInvitation />
        <SignInInvitation />
      </Footer>
    </Container>
  );
}

function Registration() {
  const { pathname } = window.location;

  switch (pathname) {
    case '/session/new':
      return <SignIn />;
    case '/users/new':
      return <SignUp />;
    case '/remind_password':
      return <ResetPassword />;
    default:
      throw new Error('Unexpected Registration page route');
  }
}

export default Registration;
