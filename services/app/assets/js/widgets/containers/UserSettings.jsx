import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import cn from 'classnames';
import axios from 'axios';
import {
  Formik,
  Form,
  Field,
  useField,
} from 'formik';
import * as Yup from 'yup';
import Slider from 'calcite-react/Slider';
import * as Icon from 'react-feather';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { actions } from '../slices';
import languages from '../config/languages';
import Loading from '../components/Loading';
import sound from '../lib/sound';

const PROVIDERS = ['github', 'discord'];

const csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute('content'); // validation token

const playingLanguages = Object.keys(languages);

const renderLanguages = data => data
  .map(language => <option key={`select option: ${language}`} value={language}>{languages[language]}</option>);

const BindSocialBtn = ({ provider, disabled, isBinded }) => {
  const formatedProviderName = provider.replace(/./, provider[0].toUpperCase());

  return (
    <div className="d-flex mb-3 align-items-center">
      <FontAwesomeIcon
        className={cn({
          'mr-2': true,
          'text-muted': isBinded,
        })}
        icon={['fab', provider]}
      />
      { isBinded
          ? (
            <button
              type="button"
              className="bind-social"
              data-method="delete"
              data-csrf={window.csrf_token}
              data-to={`/auth/${provider}`}
              disabled={disabled}
            >
              {`Unbind ${formatedProviderName}`}
            </button>
          )
          : (
            <a className="bind-social" href={`/auth/${provider}/bind/`}>
              {`Bind ${formatedProviderName}`}
            </a>
          )}
    </div>
  );
};

const renderSocialBtns = currentUserSettings => {
  const numberOfActiveProviders = PROVIDERS.reduce((acc, provider) => {
    if (currentUserSettings[`${provider }_name`]) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return PROVIDERS.map(provider => (
    <BindSocialBtn
      provider={provider}
      isBinded={currentUserSettings[`${provider }_name`]}
      disabled={numberOfActiveProviders === 1}
      key={provider}
    />
  ));
};

const UserSettings = () => {
  const [unprocessableError, setUnprocessableError] = useState('');
  const [currentUserSettings, setCurrentUserSettings] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    axios
      .get('/api/v1/settings')
      .then(response => {
        setCurrentUserSettings({
          discord_name: response.data.discord_name,
          github_name: response.data.github_name,
          name: response.data.name,
          soundLevel: response.data.sound_settings.level,
          soundType: response.data.sound_settings.type,
          language: response.data.lang,
        });
      })
      .catch(error => {
        setUnprocessableError(error.message);
        dispatch(actions.setError(error));
      });
  }, [dispatch, setCurrentUserSettings]);

  const TextInput = ({ label, ...props }) => {
    const [field, meta] = useField(props);
    const { id, name } = props;

    return (
      <div className="form-group ml-2 mb-3">
        <div>
          <label htmlFor={id || name} className="h6">{label}</label>
        </div>
        <input {...field} {...props} className="form-control" />
        {meta.touched && meta.error ? (
          <span className="error text-danger">{meta.error}</span>
        ) : <span className="error text-danger">{unprocessableError}</span>}
      </div>
    );
  };

  const sendForm = async (values, { setSubmitting }) => {
    const newSettings = {
      name: values.name,
      sound_settings: {
        level: values.soundLevel,
        type: values.soundType,
      },
      lang: values.language,
    };
    try {
      const response = await axios.patch('/api/v1/settings', newSettings, {
        headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
        },
      });
      // TODO: instead of reloading page, just put new user from response to store
      window.location = '/settings';
      setSubmitting(false);
    } catch (error) {
      if (error.response && error.response.status === 422) {
        const { data: { errors } } = error.response;
        const errorMessage = errors.name[0];
        setUnprocessableError(errorMessage);
      } else {
        setUnprocessableError(error.message);
        dispatch(actions.setError(error));
      }
    }
  };

  if (!currentUserSettings) {
    return <Loading />;
  }

  return (
    <div className="container bg-white shadow-sm py-4">
      <div className="text-center">
        <h2 className="font-weight-normal">Settings</h2>
      </div>
      <Formik
        initialValues={currentUserSettings}
        validationSchema={Yup.object({
          name: Yup.string()
            .required('Field can\'t be empty')
            .min(3, 'Should be at least 3 characters')
            .max(16, 'Should be 16 character(s) or less'),
        })}
        onSubmit={sendForm}
      >
        {({ handleChange }) => (
          <Form className="">
            <TextInput
              label="Name"
              name="name"
              type="text"
              placeholder="Enter your name"
            />

            <div className="h6 ml-2">
              Select sound level
            </div>
            <div className="ml-2 d-flex">
              <Icon.VolumeX />
              <Field
                component={Slider}
                type="range"
                min={0}
                max={10}
                name="soundLevel"
                onInput={e => {
                  sound.play('win', e.target.value * 0.1);
                }}
                className="ml-3 mr-3 mb-3 form-control"
              />
              <Icon.Volume2 />
            </div>

            <div id="my-radio-group" className="h6 ml-2">Select sound type</div>
            <div role="group" aria-labelledby="my-radio-group" className="ml-3 mb-3">
              <div>
                <Field type="radio" name="soundType" value="dendy" className="mr-2" />
                Dendy
              </div>
              <div>
                <Field type="radio" name="soundType" value="cs" className="mr-2" />
                CS
              </div>
              <div>
                <Field type="radio" name="soundType" value="standart" className="mr-2" />
                Standart
              </div>
              <div>
                <Field type="radio" name="soundType" value="silent" className="mr-2" />
                Silent
              </div>
            </div>

            <div className="form-group ml-2 mb-3">
              <p className="h6">Your weapon</p>
              <Field as="select" aria-label="Programming language select" name="language" className="form-control">
                {renderLanguages(playingLanguages)}
              </Field>
            </div>

            <button type="submit" className="btn btn-primary ml-2">Save</button>
          </Form>
        )}
      </Formik>
      <div className="mt-3 ml-2 d-flex flex-column">
        <h3 className="mb-3 font-weight-normal">Socials</h3>
        {renderSocialBtns(currentUserSettings)}
      </div>
    </div>
  );
};

export default UserSettings;
