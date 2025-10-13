import React, { useState } from 'react';

import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import cn from 'classnames';
import { useFormik } from 'formik';
import { Button } from 'react-bootstrap';
import * as Yup from 'yup';

import i18n from '../../../i18n';
import schemas from '../../formik';

const getCsrfToken = () => document.querySelector("meta[name='csrf-token']").getAttribute('content'); // validation token

const isShowInvalidMessage = (formik, typeValue) => formik.submitCount !== 0 && !!formik.errors[typeValue];

const getInputClassName = isInvalid => cn('form-control', {
  'is-invalid': isInvalid,
});

const Container = ({ children }) => (
  <div className="container-fluid">
    <div className="row justify-content-center">
      <div className="col-lg-5 col-md-5 col-sm-5 px-md-4">
        <div className="card cb-card border-light shadow-sm">{children}</div>
      </div>
    </div>
  </div>
);

const Title = ({ text }) => <h3 className="text-center">{text}</h3>;

const Form = ({ onSubmit, id, children }) => (
  <form onSubmit={onSubmit} noValidate>
    {children}
    <input
      type="submit"
      name="commit"
      id={`${id}-submit`}
      value="Submit"
      aria-label="SubmitForm"
      className="btn btn-primary btn-block rounded-lg"
      data-disable-with="Submit"
    />
  </form>
);

const Input = ({
  id, type, title, formik,
}) => {
  const isInvalid = isShowInvalidMessage(formik, id);
  const inputClassName = getInputClassName(isInvalid);

  return (
    <div className="form-group">
      <span className="text-primary">{title}</span>
      <input
        type={type}
        id={id}
        aria-label={id}
        className={inputClassName}
        {...formik.getFieldProps(id)}
      />
      {isInvalid && <div className="invalid-feedback">{formik.errors[id]}</div>}
    </div>
  );
};

const PasswordInput = ({ id, title, formik }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isInvalid = isShowInvalidMessage(formik, id);
  const inputClassName = getInputClassName(isInvalid);

  const togglePasswordVisibility = () => {
    setShowPassword(prevState => !prevState);
  };

  return (
    <div className="form-group ">
      <span className="text-primary">{title}</span>
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
      {isInvalid && <div className="invalid-feedback">{formik.errors[id]}</div>}
    </div>
  );
};

const Body = ({ children }) => (
  <div className="card-body p-lg-4 p-xl-5">{children}</div>
);

const Footer = ({ children }) => (
  <div className="card-footer py-2">
    <div className="text-center">{children}</div>
  </div>
);

const searchParams = new URLSearchParams(window.location.search);
const getNextLocation = () => (searchParams.has('next') ? searchParams.get('next') : '/');
const getLinkWithNext = link => (searchParams.has('next') ? `${link}?next=${searchParams.get('next')}` : link);

const SocialLinks = ({ isSignUp }) => (
  <>
    <div className="mt-1">
      <a
        type="button"
        aria-label={isSignUp ? 'signUpWithGithub' : 'signInWithGithub'}
        href={getLinkWithNext('/auth/github')}
        className="btn w-100 px-2 btn-outline-dark rounded-lg"
      >
        {isSignUp
          ? i18n.t('Sign up with Github')
          : i18n.t('Sign in with Github')}
      </a>
    </div>
    <div className="mt-1">
      <a
        type="button"
        aria-label={isSignUp ? 'signUpWithDiscord' : 'signInWithDiscord'}
        href={getLinkWithNext('/auth/discord')}
        className="btn w-100 px-2 btn-outline-dark rounded-lg"
      >
        {isSignUp
          ? i18n.t('Sign up with Discord')
          : i18n.t('Sign in with Discord')}
      </a>
    </div>
  </>
);

const SignInInvitation = () => (
  <div className="small">
    <span className="text-muted">{i18n.t('If you have an account')}</span>
    <a
      href={getLinkWithNext('/session/new')}
      role="button"
      className="btn-link ml-3"
    >
      {i18n.t('Sign In')}
    </a>
  </div>
);

const SignUpInvitation = () => (
  <div className="small">
    <span className="text-muted">{i18n.t('Have not an account?')}</span>
    <a
      href={getLinkWithNext('/users/new')}
      role="button"
      className="btn-link ml-3"
    >
      {i18n.t('Sign Up')}
    </a>
  </div>
);

function SignIn() {
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object().shape(schemas.signIn),
    onSubmit: ({ email, password }) => {
      const data = { email, password };

      axios
        .post('/api/v1/session', data, {
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCsrfToken(),
          },
        })
        .then(() => {
          window.location.href = getNextLocation();
        })
        .catch(error => {
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
              formik.setFieldError('base', errors.base);
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
    onSubmit: formData => {
      axios
        .post('/api/v1/users', formData, {
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': getCsrfToken(),
          },
        })
        .then(() => {
          window.location.href = getNextLocation();
        })
        .catch(error => {
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
          <PasswordInput
            id="passwordConfirmation"
            title="Password Confirmation"
            formik={formik}
          />
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
      axios
        .post(
          '/api/v1/reset_password',
          { email },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': getCsrfToken(),
            },
          },
        )
        .then(() => {
          setIsSend(true);
        })
        .catch(error => {
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
          We have sent you an email with instructions on how to reset your
          password
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
