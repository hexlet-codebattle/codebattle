import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import axios from 'axios';
import { Formik, Form, useField } from 'formik';
import * as Yup from 'yup';
import { actions } from '../slices';

const csrfToken = document
.querySelector("meta[name='csrf-token']")
.getAttribute('content'); // validation token

const UserSettings = () => {
  const [unprocessableError, setUnprocessableError] = useState('');
  const dispatch = useDispatch();

  const TextInput = ({ label, ...props }) => {
    const [field, meta] = useField(props);
    const { id, name } = props;

    return (
      <div className="form-group ml-2">
        <div>
          <label htmlFor={id || name}>{label}</label>
        </div>
        <input {...field} {...props} />
        {meta.touched && meta.error ? (
          <span className="error text-danger ml-3">{meta.error}</span>
        ) : <span className="error text-danger ml-3">{unprocessableError}</span>}
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
        dispatch(actions.setError(error));
      }
    }
  };

    return (
      <div className="container bg-white shadow-sm py-4">
        <div className="text-center">
          <h2 className="font-weight-normal">Settings</h2>
        </div>
        <Formik
          initialValues={{
        name: '',
        _csrf_token: csrfToken,
        }}
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
            <button type="submit" className="btn btn-primary ml-2">Save</button>
          </Form>
        </Formik>
      </div>
);
};

export default UserSettings;
