import React, { useState } from 'react';
import axios from 'axios';
import firebase from 'firebase';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import cn from 'classnames';

const csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute('content'); // validation token

const isShowInvalidMessage = (formik, typeValue) => (
  formik.submitCount !== 0 && !!formik.errors[typeValue]
);

const getInputClassName = isInvalid => cn('form-control', {
  'is-invalid': isInvalid,
});

const Container = ({ children }) => (
  <div className="container-fluid">
    <div className="row justify-content-center">
      <div className="col-lg-5 col-md-5 col-sm-5 px-md-4">
        <div className="card border-light shadow-sm">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const Title = ({ text }) => (
  <h3 className="text-center">{text}</h3>
);

const Form = ({ onSubmit, id, children }) => (
  <form onSubmit={onSubmit} noValidate>
    {children}
    <input
      type="submit"
      name="commit"
      id={`${id}-submit`}
      value="Submit"
      aria-label="SubmitForm"
      className="btn btn-primary btn-block"
      data-disable-with="Submit"
    />
  </form>
);

const Input = ({
  id,
  type,
  title,
  formik,
}) => {
  const isInvalid = isShowInvalidMessage(formik, id);
  const inputClassName = getInputClassName(isInvalid);

  return (
    <div className="form-group">
      <span className="text-primary">
        {title}
      </span>
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

const Body = ({ children }) => (
  <div className="card-body p-lg-4 p-xl-5">
    {children}
  </div>
);

const Footer = ({ children }) => (
  <div className="card-footer py-2">
    <div className="text-center">
      {children}
    </div>
  </div>
);

const searchParams = new URLSearchParams(window.location.search);
const getNextLocation = () => (
  searchParams.has('next') ? searchParams.get('next') : '/'
);
const getLinkWithNext = link => (
  searchParams.has('next') ? `${link}?next=${searchParams.get('next')}` : link
);

const SocialLinks = () => (
  <>
    <div className="mt-1">
      <a
        type="button"
        aria-label="signInWithGithub"
        href={getLinkWithNext('/auth/github')}
        className="btn w-100 px-2 btn-outline-dark"
      >
        Sign in with Github
      </a>
    </div>
    <div className="mt-1">
      <a
        type="button"
        aria-label="signInWithDiscord"
        href={getLinkWithNext('/auth/discord')}
        className="btn w-100 px-2 btn-outline-dark"
      >
        Sign in with Discord
      </a>
    </div>
  </>
);

const SignInInvitation = () => (
  <div className="small">
    <span className="text-muted">If you have an account</span>
    <a
      href={getLinkWithNext('/session/new')}
      role="button"
      className="btn-link ml-3"
    >
      Sign In
    </a>
  </div>
);

const SignUpInvitation = () => (
  <div className="small">
    <span className="text-muted">{'Don\'t have an account?'}</span>
    <a
      href={getLinkWithNext('/users/new')}
      role="button"
      className="btn-link ml-3"
    >
      Sign Up
    </a>
  </div>
);

const SignIn = () => {
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
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then(result => {
          const data = {
            email: result.user.email,
            uid: result.user.uid,
          };

          return axios.post('/api/v1/session', data, {
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken,
            },
          });
        })
        .then(result => {
          if (result.data.errors) {
            const message = result.data.errors;
            formik.setFieldError('email', message);
            formik.setFieldError('password', message);
            return;
          }

          window.location.href = getNextLocation();
        })
        .catch(error => {
          // TODO: add log for auth error
          if (error.code === 'auth/user-not-found') {
            formik.setFieldError('email', 'User with this email not found');
            return;
          }

          if (error.message) {
            const { message } = error;
            formik.setFieldError('email', message);
            formik.setFieldError('password', message);
          }
        });
    },
  });

  return (
    <Container>
      <Body>
        <Form onSubmit={formik.handleSubmit} id="login">
          <Title text="Sign In" />
          <Input
            id="email"
            type="email"
            title="Email"
            formik={formik}
          />
          <Input
            id="password"
            type="password"
            title="Password"
            formik={formik}
          />
          <div className="text-right my-3">
            <a className="text-primary" href="/remind_password">Forgot your password?</a>
          </div>
        </Form>
        <SocialLinks />
      </Body>
      <Footer>
        <SignUpInvitation />
      </Footer>
    </Container>
  );
};

const SignUp = () => {
  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    validationSchema: Yup.object().shape({
      name: Yup.string().required('Nickname required'),
      email: Yup.string().email('Invalid email').required('Email required'),
      password: Yup.string().required('Password required'),
      passwordConfirmation: Yup.string().oneOf([Yup.ref('password'), null], 'Passwords must match'),
    }),
    onSubmit: ({ name, email, password }) => {
      const defaultAuth = firebase.auth();

      defaultAuth.createUserWithEmailAndPassword(email, password)
        .then(result => {
          const data = {
            name,
            email: result.user.email,
            uid: result.user.uid,
          };

          return axios.post('/api/v1/users', data, {
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken,
            },
          });
        })
        .then(result => {
          if (result.data.errors) {
            const message = result.data.errors;
            defaultAuth.currentUser.delete();
            formik.setFieldError('name', message);
            formik.setFieldError('email', message);
            return;
          }

          window.location.href = getNextLocation();
        })
        .catch(error => {
          // TODO: add log for auth error
          if (defaultAuth.currentUser) {
            defaultAuth.currentUser.delete();
          }

          if (error.message) {
            const { message } = error;
            formik.setFieldError('email', message);
            formik.setFieldError('password', message);
          }
        });
    },
  });

  return (
    <Container>
      <Body>
        <Form onSubmit={formik.handleSubmit} id="registration">
          <Title text="Sign Up" />
          <Input
            id="name"
            type="text"
            title="Nickname"
            formik={formik}
          />
          <Input
            id="email"
            type="email"
            title="Email"
            formik={formik}
          />
          <Input
            id="password"
            type="password"
            title="Password"
            formik={formik}
          />
          <Input
            id="passwordConfirmation"
            type="password"
            title="Password"
            formik={formik}
          />
        </Form>
        <SocialLinks />
      </Body>
      <Footer>
        <SignInInvitation />
      </Footer>
    </Container>
  );
};

const RememberPassword = () => {
  const [isSend, setIsSend] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: Yup.object().shape({
      email: Yup.string().email('Invalid email').required('Email required'),
    }),
    onSubmit: ({ email }) => {
      firebase.auth().sendPasswordResetEmail(email)
        .then(() => {
          setIsSend(true);
        })
        .catch(error => {
          // TODO: add log for auth error
          if (error.message) {
            formik.setFieldError('email', error.message);
          }
        });
    },
  });

  if (isSend) {
    return (
      <Container>
        <Body>
          We have sent you an email with instructions on how to reset your password
        </Body>
      </Container>
    );
  }

  return (
    <Container>
      <Body>
        <Form onSubmit={formik.handleSubmit} id="remindPassword">
          <Title text="Forgot your password?" />
          <Input
            id="email"
            type="email"
            title="Email"
            formik={formik}
          />
        </Form>
      </Body>
      <Footer>
        <SignUpInvitation />
        <SignInInvitation />
      </Footer>
    </Container>
  );
};

const Registration = () => {
  const { pathname } = window.location;

  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    messagingSenderId: process.env.FIREBASE_SENDER_ID,
  };

  firebase.initializeApp(firebaseConfig);

  switch (pathname) {
    case '/session/new':
      return <SignIn />;
    case '/users/new':
      return <SignUp />;
    case '/remind_password':
      return <RememberPassword />;
    default:
      throw new Error('Unexpected Registration page route');
  }
};

export default Registration;
