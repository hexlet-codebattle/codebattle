import React from 'react';

import { ErrorMessage, Field, Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';

import i18n from '../../../i18n';
import schemas from '../../formik';

export interface EmailSettingsFormValues {
  email: string;
  currentPassword: string;
}

interface EmailSettingsFormProps {
  currentEmail: string;
  onSubmit: (
    values: EmailSettingsFormValues,
    formikHelpers: FormikHelpers<EmailSettingsFormValues>,
  ) => void | Promise<void>;
}

function EmailSettingsForm({ currentEmail, onSubmit }: EmailSettingsFormProps) {
  return (
    <Formik
      initialValues={{ email: '', currentPassword: '' }}
      validationSchema={Yup.object(schemas.emailChange)}
      onSubmit={onSubmit}
    >
      {({ dirty, isSubmitting, isValid }) => (
        <Form className="container mt-4">
          <div className="row form-group mb-3">
            <div className="col-lg-4">
              <h3 className="font-weight-normal">{i18n.t('Change email')}</h3>
              <div className="form-group mb-3">
                <label className="h6" htmlFor="currentEmail">
                  {i18n.t('Current email')}
                </label>
                <input
                  id="currentEmail"
                  className="form-control cb-bg-panel cb-border-color text-white"
                  value={currentEmail}
                  readOnly
                />
              </div>
              <div className="form-group mb-3">
                <label className="h6" htmlFor="email">
                  {i18n.t('New email')}
                </label>
                <Field
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  data-testid="newEmailInput"
                  className="form-control cb-bg-panel cb-border-color text-white"
                  placeholder={i18n.t('Enter new email')}
                />
                <ErrorMessage name="email" component="div" className="invalid-feedback" />
              </div>
              <div className="form-group mb-3">
                <label className="h6" htmlFor="emailCurrentPassword">
                  {i18n.t('Current password')}
                </label>
                <Field
                  id="emailCurrentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  data-testid="emailCurrentPasswordInput"
                  className="form-control cb-bg-panel cb-border-color text-white"
                  placeholder={i18n.t('Enter current password')}
                />
                <ErrorMessage name="currentPassword" component="div" className="invalid-feedback" />
              </div>
              <button
                type="submit"
                disabled={!dirty || !isValid || isSubmitting}
                className="btn py-1 btn-primary rounded-lg"
              >
                {isSubmitting ? i18n.t('Sending...') : i18n.t('Send verification email')}
              </button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default EmailSettingsForm;
