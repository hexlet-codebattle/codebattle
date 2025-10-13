import React, { useMemo } from 'react';

import Slider from 'calcite-react/Slider';
import cn from 'classnames';
import {
  Formik, Form, Field, useField,
} from 'formik';
import capitalize from 'lodash/capitalize';
import omit from 'lodash/omit';
import * as Icon from 'react-feather';
import * as Yup from 'yup';

import languages, { cssProcessors } from '../../config/languages';
import schemas from '../../formik';
import { createPlayer } from '../../lib/sound';

const playingLanguages = Object.entries(omit(languages, cssProcessors));

const getPlaceholder = ({ disabled, placeholder }) => {
  if (!disabled) {
    return placeholder;
  }

  return 'No access yet';
};

const TextInput = ({ label, ...props }) => {
  const [field, meta] = useField(props);
  const { name, disabled } = props;

  const labelClassName = cn('h6', {
    'text-muted': disabled,
  });

  return (
    <div className="form-group mb-3">
      <label className={labelClassName} htmlFor={name}>
        {label}
      </label>
      <input
        {...field}
        {...props}
        placeholder={getPlaceholder(props)}
        className="form-control cb-bg-panel cb-border-color text-white"
      />
      {meta.touched && meta.error && (
        <div className="invalid-feedback">{meta.error}</div>
      )}
    </div>
  );
};

const player = createPlayer();

const playSound = (type, volume) => {
  player.stop();
  player[type].play('win', volume);
};

const UserSettingsForm = ({ onSubmit, settings }) => {
  const initialValues = useMemo(
    () => ({
      locale: settings.locale,
      name: settings.name,
      soundSettings: {
        type: settings.soundSettings.type,
        level: settings.soundSettings.level,
      },
      clan: settings.clan || '',
      lang: settings.lang || '',
    }),
    [settings],
  );

  const validationSchema = useMemo(
    () => Yup.object(schemas.userSettings(settings)),
    [settings],
  );

  return (
    <Formik
      initialValues={initialValues}
      initialTouched={{ name: true }}
      enableReinitialize
      validateOnChange
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {({
        handleChange, dirty, isValid, isSubmitting, values,
      }) => (
        <Form>
          <div className="container">
            <div className="row form-group mb-3">
              <div className="col-lg-3">
                <TextInput
                  className="col-5"
                  data-testid="nameInput"
                  label="Your name"
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your name"
                />
              </div>
              <div className="col-lg-3">
                <div className="h6">Your weapon</div>
                <Field
                  as="select"
                  data-testid="langSelect"
                  aria-label="Programming language select"
                  name="lang"
                  className="cb-bg-panel cb-border-color text-white custom-select"
                >
                  {playingLanguages.map(([slug, lang]) => (
                    <option key={slug} value={slug}>
                      {capitalize(lang)}
                    </option>
                  ))}
                </Field>
              </div>
              <div className="col-lg-3">
                <TextInput
                  className="col-5"
                  data-testid="clanInput"
                  label="Your clan"
                  id="clan"
                  name="clan"
                  type="text"
                  placeholder="Enter your clan"
                />
              </div>
              <div className="col-lg-3">
                <div className="h6">Locale</div>
                <Field
                  as="select"
                  data-testid="localeSelect"
                  aria-label="Locale"
                  name="locale"
                  className="cb-bg-panel cb-border-color text-white custom-select"
                >
                  <option key="en" value="en">
                    Eng
                  </option>
                  <option key="ru" value="ru">
                    Ru
                  </option>
                </Field>
              </div>
            </div>
          </div>

          <div id="my-radio-group" className="h6 ml-2">
            Select sound type
          </div>
          <div
            role="group"
            aria-labelledby="my-radio-group"
            className="ml-3 mb-3"
          >
            <div className="form-check">
              <Field
                id="radioDendy"
                type="radio"
                name="soundSettings.type"
                value="dendy"
                className="form-check-input"
                onClick={() => playSound('dendy', values.soundSettings.level * 0.1)}
              />
              <label className="form-check-label" htmlFor="radioDendy">
                Dendy
              </label>
            </div>
            <div className="form-check">
              <Field
                id="radioCS"
                type="radio"
                name="soundSettings.type"
                value="cs"
                className="form-check-input"
                onClick={() => playSound('cs', values.soundSettings.level * 0.1)}
              />
              <label className="form-check-label" htmlFor="radioCS">
                CS
              </label>
            </div>
            <div className="form-check">
              <Field
                id="radioStandard"
                type="radio"
                name="soundSettings.type"
                value="standard"
                className="form-check-input"
                onClick={() => playSound('standard', values.soundSettings.level * 0.1)}
              />
              <label className="form-check-label" htmlFor="radioStandard">
                Standard
              </label>
            </div>
            <div className="form-check">
              <Field
                id="radioSilent"
                type="radio"
                name="soundSettings.type"
                value="silent"
                className="form-check-input"
              />
              <label className="form-check-label" htmlFor="radioSilent">
                Silent
              </label>
            </div>
          </div>

          <div className="h6 ml-2">Select sound level</div>
          <div className="ml-2 mb-3 d-flex align-items-center">
            <Icon.VolumeX />
            <Field
              component={Slider}
              type="range"
              min={0}
              max={10}
              name="soundSettings.level"
              disabled={values.soundSettings.type === 'silent'}
              onInput={e => {
                handleChange(e);
                playSound(values.soundSettings.type, e.target.value * 0.1);
              }}
              className="ml-3 mr-3 form-control"
            />
            <Icon.Volume2 />
          </div>

          <div className="d-flex justify-content-center">
            <button
              disabled={!dirty || !isValid}
              aria-label="SubmitForm"
              style={{ width: '120px' }}
              type="submit"
              className="btn py-1 btn-primary rounded-lg"
            >
              {isSubmitting ? (
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default UserSettingsForm;
