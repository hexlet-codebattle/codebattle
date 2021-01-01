/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import {
  Formik,
  Form,
  Field,
  useField,
} from 'formik';
import * as Yup from 'yup';
import _ from 'lodash';

import { actions } from '../slices';
import languages from '../config/languages';
import Loading from '../components/Loading';

const csrfToken = document
  .querySelector("meta[name='csrf-token']")
  .getAttribute('content'); // validation token

const soundLevels = _.range(1, 11);
const playingLanguages = Object.values(languages);
const soundTypes = ['standart', 'silent'];
const defaultSoundLevel = 5;

const renderOptions = data => data
  .map(option => <option key={`select option: ${option}`} value={option}>{option}</option>);

const UserSettings = () => {
  const [unprocessableError, setUnprocessableError] = useState('');
  const [currentUserSettings, setCurrentUserSettings] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    axios
      .get('/api/v1/settings')
      .then(response => {
        setCurrentUserSettings({
          name: response.data.name,
          soundLevel: defaultSoundLevel,
          soundType: '', // response.data.soundType
          language: '', // response.data.language
          _csrf_token: csrfToken,
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
    try {
      await axios.patch('/api/v1/settings', values);
      window.location = '/settings'; // page update
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
  } return (
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
        <Form className="">
          <TextInput
            label="Name"
            name="name"
            type="text"
            placeholder="Enter your name"
          />

          <div className="form-group ml-2 mb-3">
            <label className="h6">Sound level</label>
            <Field as="select" name="soundLevel" className="form-control">
              {renderOptions(soundLevels)}
            </Field>
          </div>

          <div className="form-group ml-2 mb-3">
            <label className="h6">Sound type</label>
            <Field as="select" name="soundType" className="form-control">
              {renderOptions(soundTypes)}
            </Field>
          </div>

          <div className="form-group ml-2 mb-3">
            <label htmlFor="" className="h6">Your weapon</label>
            <Field as="select" name="language" className="form-control" id="languageSelect">
              {renderOptions(playingLanguages)}
            </Field>
          </div>

          <button type="submit" className="btn btn-primary ml-2">Save</button>
        </Form>
      </Formik>
    </div>
  );
};

export default UserSettings;
