import React, { useState } from 'react';

import axios from 'axios';
import cn from 'classnames';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const getCsrfToken = () =>
  document.querySelector("meta[name='csrf-token']").getAttribute('content'); // validation token

const isShowInvalidMessage = (formik, typeValue) =>
  formik.submitCount !== 0 && !!formik.errors[typeValue];

const getInputClassName = (isInvalid) =>
  cn('form-control', {
    'is-invalid': isInvalid,
  });

function Container({ children }) {
  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-lg-5 col-md-5 col-sm-5 px-md-4">
          <div className="card border-light shadow-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Title({ text }) {
  return <h3 className="text-center">{text}</h3>;
}

function Form({ children, id, onSubmit }) {
  return (
    <form noValidate onSubmit={onSubmit}>
      {children}
      <input
        aria-label="SubmitForm"
        className="btn btn-primary btn-block rounded-lg"
        data-disable-with="Submit"
        id={`${id}-submit`}
        name="commit"
        type="submit"
        value="Submit"
      />
    </form>
  );
}

function Input({ formik, id, title, type }) {
  const isInvalid = isShowInvalidMessage(formik, id);
  const inputClassName = getInputClassName(isInvalid);

  return (
    <div className="form-group">
      <span className="text-primary">{title}</span>
      <input
        aria-label={id}
        className={inputClassName}
        id={id}
        type={type}
        {...formik.getFieldProps(id)}
      />
      {isInvalid && <div className="invalid-feedback">{formik.errors[id]}</div>}
    </div>
  );
}

function Body({ children }) {
  return <div className="card-body p-lg-4 p-xl-5">{children}</div>;
}

function Footer({ children }) {
  return (
    <div className="card-footer py-2">
      <div className="text-center">{children}</div>
    </div>
  );
}

const searchParams = new URLSearchParams(window.location.search);
const getNextLocation = () => (searchParams.has('next') ? searchParams.get('next') : '/');
const getLinkWithNext = (link) =>
  searchParams.has('next') ? `${link}?next=${searchParams.get('next')}` : link;

function SocialLinks() {
  return (
    <>
      <div className="mt-1">
        <a
          aria-label="signInWithGithub"
          className="btn w-100 px-2 btn-outline-dark rounded-lg"
          href={getLinkWithNext('/auth/github')}
          type="button"
        >
          Sign in with Github
        </a>
      </div>
      <div className="mt-1">
        <a
          aria-label="signInWithDiscord"
          className="btn w-100 px-2 btn-outline-dark rounded-lg"
          href={getLinkWithNext('/auth/discord')}
          type="button"
        >
          Sign in with Discord
        </a>
      </div>
    </>
  );
}

function SignInInvitation() {
  return (
    <div className="small">
      <span className="text-muted">If you have an account</span>
      <a className="btn-link ml-3" href={getLinkWithNext('/session/new')} role="button">
        Sign In
      </a>
    </div>
  );
}

function SignUpInvitation() {
  return (
    <div className="small">
      <span className="text-muted">Have not an account?</span>
      <a className="btn-link ml-3" href={getLinkWithNext('/users/new')} role="button">
        Sign Up
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
    validationSchema: Yup.object().shape({
      email: Yup.string().email('Invalid email').required('Email required'),
      password: Yup.string().required('Password required'),
    }),
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

  return (
    <Container>
      <Body>
        <Form id="login" onSubmit={formik.handleSubmit}>
          <Title text="Sign In" />
          <Input formik={formik} id="base" type="hidden" />
          <Input formik={formik} id="email" title="Email" type="email" />
          <Input formik={formik} id="password" title="Password" type="password" />
          <div className="text-right my-3">
            <a className="text-primary" href="/remind_password">
              Forgot your password?
            </a>
          </div>
        </Form>
        <SocialLinks />
      </Body>
      <Footer>
        <SignUpInvitation />
      </Footer>
    </Container>
  );
}

const braillePatternBlank = '\u2800';
const space = ' ';
const invalidSymbols = [braillePatternBlank, space];

function SignUp() {
  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    validationSchema: Yup.object().shape({
      name: Yup.string()
        .test(
          'start-or-end-with-empty-symbols',
          "Can't start or end with empty symbols",
          (value) => {
            if (!value) {
              return true;
            }
            const invalidSymbolIndex = invalidSymbols.findIndex(
              (invalidSymbol) => value.startsWith(invalidSymbol) || value.endsWith(invalidSymbol),
            );

            return invalidSymbolIndex === -1;
          },
        )
        .min(3, 'Should be from 3 to 16 characters')
        .max(16, 'Should be from 3 to 16 characters')
        .matches(
          /^[a-z]+[a-z0-9_-\s{1}][a-z0-9_]+$/i,
          'Can contain letters, numbers and underscores and should begin with a Latin letter',
        )
        .required('Nickname required'),
      email: Yup.string()
        .email('Invalid email')
        .test('exclude-braille-pattern-blank', 'Invalid email', (value) =>
          value ? !value.includes(braillePatternBlank) : true,
        )
        .matches(
          /^[a-z0-9]{1}[^;]*[a-z0-9]{1}@[^;]*$/i,
          'Should begin and end with a Latin letter or number',
        )
        .matches(
          /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,})$/i,
          "Can't contain special symbols",
        )
        .required('Email required'),
      password: Yup.string()
        .matches(/^\S*$/, "Can't contain empty symbols")
        .min(6, 'Should be from 6 to 16 characters')
        .max(16, 'Should be from 6 to 16 characters')
        .required('Password required'),
      passwordConfirmation: Yup.string()
        .required('Confirmation required')
        .oneOf([Yup.ref('password')], 'Passwords must match'),
    }),
    onSubmit: (formData) => {
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
        <Form id="registration" onSubmit={formik.handleSubmit}>
          <Title text="Sign Up" />
          <Input formik={formik} id="base" type="hidden" />
          <Input formik={formik} id="name" title="Nickname" type="text" />
          <Input formik={formik} id="email" title="Email" type="email" />
          <Input formik={formik} id="password" title="Password" type="password" />
          <Input
            formik={formik}
            id="passwordConfirmation"
            title="Password Confirmation"
            type="password"
          />
        </Form>
        <SocialLinks />
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
    validationSchema: Yup.object().shape({
      email: Yup.string().email('Invalid email').required('Email required'),
    }),
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
        <Body>We have sent you an email with instructions on how to reset your password</Body>
      </Container>
    );
  }

  return (
    <Container>
      <Body>
        <Form id="remindPassword" onSubmit={formik.handleSubmit}>
          <Title text="Forgot your password?" />
          <Input formik={formik} id="base" type="hidden" />
          <Input formik={formik} id="email" title="Email" type="email" />
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
