import React from 'react';
import _ from 'lodash';
import cn from 'classnames';
import {
 Formik, Form, Field, useField,
} from 'formik';
import * as Yup from 'yup';
import Slider from 'calcite-react/Slider';
import * as Icon from 'react-feather';
import languages from '../../config/languages';
import sound, { sounds } from '../../lib/sound';
// import { userSettingsSelector } from '../selectors';
// import { updateUserSettings } from '../slices/userSettings';

export default ({ onSubmit, settings }) => {
  const [unprocessableError] = React.useState('');
  const playingLanguages = Object.entries(languages);

  const TextInput = ({ label, ...props }) => {
    const [field, meta] = useField(props);
    const { name } = props;

    return (
      <div className="form-group mb-3">
        <label className="h6" htmlFor={name}>
          {label}
          <input {...field} {...props} className="form-control" />
        </label>
        {meta.touched && meta.error ? (
          <span className="error text-danger">{meta.error}</span>
        ) : (
          <span className="error text-danger">{unprocessableError}</span>
        )}
      </div>
    );
  };
  const renderLanguages = langs => langs.map(([slug, lang]) => (
    <option key={slug} value={lang}>
      {_.capitalize(lang)}
    </option>
    ));

  return (
    <>
      {settings && (
      <Formik
        initialValues={{
        name: settings.name,
        sound_settings: {
          type: settings.sound_settings.type,
          level: settings.sound_settings.level,
        },
        lang: settings.lang || '',
      }}
        validationSchema={Yup.object({
        name: Yup.string()
          .required("Field can't be empty")
          .min(3, 'Should be at least 3 characters')
          .max(16, 'Should be 16 character(s) or less'),
      })}
        onSubmit={onSubmit}
      >
        {({
 handleChange, dirty, isSubmitting, values,
}) => (
  <Form>
    <div className="container">
      <div className="row form-group mb-3">
        <div className="col-3">
          <TextInput
            className="col-5"
            label="Your name"
            id="name"
            name="name"
            type="text"
            placeholder="Enter your name"
          />
        </div>
        <div className="col-3">
          <p className="h6 pt-1">Your weapon</p>
          <Field
            as="select"
            data-testid="langSelect"
            aria-label="Programming language select"
            name="lang"
            className="custom-select"
          >
            {renderLanguages(playingLanguages)}
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
      <div>
        <Field
          type="radio"
          name="sound_settings.type"
          value="dendy"
          className="mr-2"
          onClick={() => sounds().dendy.play('win')}
        />
        Dendy
      </div>
      <div>
        <Field
          type="radio"
          name="sound_settings.type"
          value="cs"
          className="mr-2"
          onClick={() => sounds().cs.play('win')}
        />
        CS
      </div>
      <div>
        <Field
          type="radio"
          name="sound_settings.type"
          value="standart"
          className="mr-2"
          onClick={() => sounds().standart.play('win')}
        />
        Standart
      </div>
      <div>
        <Field
          type="radio"
          name="sound_settings.type"
          value="silent"
          className="mr-2"
        />
        Silent
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
        name="sound_settings.level"
        disabled={values.sound_settings.type === 'silent'}
        onInput={e => {
                handleChange(e);
                sound.play('win', e.target.value * 0.1);
              }}
        className="ml-3 mr-3 form-control"
      />
      <Icon.Volume2 />
    </div>

    <div className="d-flex justify-content-center">
      <button
        disabled={!dirty}
        style={{ width: '120px' }}
        type="submit"
        className="btn py-1 btn-primary"
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
)}
    </>
  );
};
