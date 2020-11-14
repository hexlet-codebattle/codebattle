import React from 'react';
import axios from 'axios';
import { Formik, Form, useField } from 'formik';
import * as Yup from 'yup';

 const TextInput = ({ label, ...props }) => {
  const [field, meta] = useField(props);
  const { id, name } = props;
  return (
    <div className="form-group ml-2">
      <div>
        <label htmlFor={id || name}>{label}</label>
      </div>
      <input className="" {...field} {...props} />
      {meta.touched && meta.error ? (
        <span className="error text-danger ml-3">{meta.error}</span>
      ) : null}
    </div>
  );
};
const csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute('content');

const UserSettings = () => {
  const sumbitForm = async values => {
    const response = await axios.patch('/api/v1/settings', values);
      if (response.status === 200) {
        window.location = '/settings';
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
          .max(16, 'Must be 16 characters or less'),
        })}
          onSubmit={async (values, { setSubmitting }) => {
          try {
            sumbitForm(values);
            setSubmitting(false);
          } catch (e) {
              console.error(e);
          }
      }}
        >
          <Form>
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
