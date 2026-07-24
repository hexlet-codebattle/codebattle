import React, { type ReactNode, useState } from 'react';

import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { type FormikProps, useFormik } from 'formik';
import { Button } from 'react-bootstrap';
import * as Yup from 'yup';

import i18n from '../../../i18n';
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

const getInputClassName = (isInvalid: boolean) =>
  cn('form-control custom-control cb-bg-panel cb-border-color text-white', {
    'is-invalid': isInvalid,
  });

interface ContainerProps {
  children: ReactNode;
}

function Container({ children }: ContainerProps) {
  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-5 col-sm-5 px-md-4">
          <div className="card cb-card border cb-border-color cb-rounded shadow-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface TitleProps {
  text: string;
}

function Title({ text }: TitleProps) {
  return <h3 className="text-center text-white">{text}</h3>;
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
      <input
        type="submit"
        name="commit"
        id={`${id}-submit`}
        value="Submit"
        aria-label="SubmitForm"
        className="btn btn-secondary cb-btn-secondary btn-block cb-rounded"
        data-disable-with="Submit"
      />
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
  const inputClassName = getInputClassName(isInvalid);

  return (
    <div className="form-group">
      <span className="text-white">{title}</span>
      <input
        type={type}
        id={id}
        aria-label={id}
        className={inputClassName}
        {...formik.getFieldProps(id)}
      />
      {isInvalid && <div className="invalid-feedback">{formik.errors[id] as ReactNode}</div>}
    </div>
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
  const inputClassName = getInputClassName(isInvalid);

  const togglePasswordVisibility = () => {
    setShowPassword((prevState) => !prevState);
  };

  return (
    <div className="form-group">
      <span className="text-white">{title}</span>
      <div className="position-relative">
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          aria-label={id}
          className={inputClassName}
          {...formik.getFieldProps(id)}
        />
        <Button
          variant="link"
          className={`position-absolute end-0 top-0 h-100 ${isInvalid ? 'mr-4' : ''}`}
          onClick={togglePasswordVisibility}
        >
          {/* <FontAwesomeIcon icon={showPassword ? 'eye-slash' : 'eye'} /> */}
          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
        </Button>
      </div>
      {isInvalid && <div className="invalid-feedback">{formik.errors[id] as ReactNode}</div>}
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <div className="card-body p-lg-4 p-xl-5">{children}</div>;
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="card-footer py-2">
      <div className="text-center">{children}</div>
    </div>
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
    <>
      <div className="mt-1">
        <a
          type="button"
          aria-label={isSignUp ? 'signUpWithGithub' : 'signInWithGithub'}
          href={getLinkWithNext('/auth/github')}
          className="btn w-100 px-2 btn-outline-secondary cb-btn-outline-secondary cb-rounded"
        >
          {isSignUp ? i18n.t('Sign up with Github') : i18n.t('Sign in with Github')}
        </a>
      </div>
      <div className="mt-1">
        <a
          type="button"
          aria-label={isSignUp ? 'signUpWithDiscord' : 'signInWithDiscord'}
          href={getLinkWithNext('/auth/discord')}
          className="btn w-100 px-2 btn-outline-secondary cb-btn-outline-secondary cb-rounded"
        >
          {isSignUp ? i18n.t('Sign up with Discord') : i18n.t('Sign in with Discord')}
        </a>
      </div>
    </>
  );
}

function SignInInvitation() {
  return (
    <div className="small">
      <span className="cb-text">{i18n.t('If you have an account')}</span>
      <a href={getLinkWithNext('/session/new')} role="button" className="btn-link text-white ml-3">
        {i18n.t('Sign In')}
      </a>
    </div>
  );
}

function SignUpInvitation() {
  return (
    <div className="small">
      <span className="cb-text">{i18n.t('Have not an account?')}</span>
      <a href={getLinkWithNext('/users/new')} role="button" className="btn-link text-primary ml-3">
        {i18n.t('Sign Up')}
      </a>
    </div>
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
            if (errors.email === 'EMAIL_NOT_FOUND') {
              formik.errors.email = 'Invalid email';
            }
            if (errors.email && errors.email !== 'EMAIL_NOT_FOUND') {
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
            <div className="alert alert-info" role="status">
              {i18n.t('We sent a verification email. Please confirm your email before signing in.')}
            </div>
          )}
          <Input id="base" type="hidden" formik={formik} />
          <Input id="email" type="email" title="Email" formik={formik} />
          <PasswordInput id="password" title="Password" formik={formik} />
          <div className="text-right my-3">
            <a className="text-primary" href="/remind_password">
              Forgot your password?
            </a>
          </div>
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
          <p className="mb-0 text-white">
            We have sent you an email with instructions on how to reset your password
          </p>
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
