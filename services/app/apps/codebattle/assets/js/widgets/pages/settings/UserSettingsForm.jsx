import React from 'react';

import Slider from 'calcite-react/Slider';
import { Formik, Form, Field, useField } from 'formik';
import capitalize from 'lodash/capitalize';
import * as Icon from 'react-feather';
import * as Yup from 'yup';

import languages from '../../config/languages';
import { createPlayer } from '../../lib/sound';

const playingLanguages = Object.entries(languages);

function TextInput({ label, ...props }) {
  const [field, meta] = useField(props);
  const { name } = props;

  return (
    <div className="form-group mb-3">
      <div>
        <label className="h6" htmlFor={name}>
          {label}
        </label>
        <input {...field} {...props} className="form-control" />
      </div>
      {meta.touched && meta.error ? (
        <span className="error text-danger">{meta.error}</span>
      ) : (
        <span className="error text-danger" />
      )}
    </div>
  );
}

function UserSettingsForm({ onSubmit, settings }) {
  const renderLanguages = (langs) =>
    langs.map(([slug, lang]) => (
      <option key={slug} value={slug}>
        {capitalize(lang)}
      </option>
    ));

  const player = createPlayer();

  const playSound = (type, volume) => {
    player.stop();
    player[type].play('win', volume);
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .strict()
      .required("Field can't be empty")
      .min(3, 'Should be at least 3 characters')
      .max(16, 'Should be 16 character(s) or less')
      .trim(),
  });

  return (
    settings && (
      <Formik
        enableReinitialize
        validationSchema={validationSchema}
        initialValues={{
          name: settings.name,
          sound_settings: {
            type: settings.sound_settings.type,
            level: settings.sound_settings.level,
          },
          lang: settings.lang || '',
        }}
        onSubmit={onSubmit}
      >
        {({ dirty, handleChange, isSubmitting, values }) => (
          <Form>
            <div className="container">
              <div className="row form-group mb-3">
                <div className="col-3">
                  <TextInput
                    className="col-5"
                    data-testid="nameInput"
                    id="name"
                    label="Your name"
                    name="name"
                    placeholder="Enter your name"
                    type="text"
                  />
                </div>
                <div className="col-3">
                  <div className="h6">Your weapon</div>
                  <Field
                    aria-label="Programming language select"
                    as="select"
                    className="custom-select"
                    data-testid="langSelect"
                    name="lang"
                  >
                    {renderLanguages(playingLanguages)}
                  </Field>
                </div>
              </div>
            </div>

            <div className="h6 ml-2" id="my-radio-group">
              Select sound type
            </div>
            <div aria-labelledby="my-radio-group" className="ml-3 mb-3" role="group">
              <div>
                <Field
                  className="mr-2"
                  name="sound_settings.type"
                  type="radio"
                  value="dendy"
                  onClick={() => playSound('dendy', values.sound_settings.level * 0.1)}
                />
                Dendy
              </div>
              <div>
                <Field
                  className="mr-2"
                  name="sound_settings.type"
                  type="radio"
                  value="cs"
                  onClick={() => playSound('cs', values.sound_settings.level * 0.1)}
                />
                CS
              </div>
              <div>
                <Field
                  className="mr-2"
                  name="sound_settings.type"
                  type="radio"
                  value="standart"
                  onClick={() => playSound('standart', values.sound_settings.level * 0.1)}
                />
                Standart
              </div>
              <div>
                <Field className="mr-2" name="sound_settings.type" type="radio" value="silent" />
                Silent
              </div>
            </div>

            <div className="h6 ml-2">Select sound level</div>
            <div className="ml-2 mb-3 d-flex align-items-center">
              <Icon.VolumeX />
              <Field
                className="ml-3 mr-3 form-control"
                component={Slider}
                disabled={values.sound_settings.type === 'silent'}
                max={10}
                min={0}
                name="sound_settings.level"
                type="range"
                onInput={(e) => {
                  handleChange(e);
                  playSound(values.sound_settings.type, e.target.value * 0.1);
                }}
              />
              <Icon.Volume2 />
            </div>

            <div className="d-flex justify-content-center">
              <button
                aria-label="SubmitForm"
                className="btn py-1 btn-primary rounded-lg"
                disabled={!dirty}
                style={{ width: '120px' }}
                type="submit"
              >
                {!isSubmitting ? (
                  'Save'
                ) : (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                )}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    )
  );
}

export default UserSettingsForm;
