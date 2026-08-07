import React from 'react';

import { Button, Stack, TextInput } from '@mantine/core';
import { Form, Formik, useField, type FormikHelpers } from 'formik';
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

interface FormikTextInputProps {
  label: React.ReactNode;
  name: string;
  [key: string]: unknown;
}

function FormikTextInput({ label, name, ...props }: FormikTextInputProps) {
  const [field, meta] = useField(name);

  return (
    <TextInput
      {...field}
      {...props}
      label={label}
      error={meta.touched && meta.error ? meta.error : undefined}
    />
  );
}

function EmailSettingsForm({ currentEmail, onSubmit }: EmailSettingsFormProps) {
  return (
    <Formik
      initialValues={{ email: '', currentPassword: '' }}
      validationSchema={Yup.object(schemas.emailChange)}
      onSubmit={onSubmit}
    >
      {({ dirty, isSubmitting, isValid }) => (
        <Form className="cb-settings-section">
          <div className="cb-settings-section-heading">
            <div>
              <h3>{i18n.t('Change email')}</h3>
            </div>
          </div>
          <div className="cb-settings-security-grid">
            <Stack gap="md">
              <TextInput
                id="currentEmail"
                label={i18n.t('Current email')}
                value={currentEmail}
                readOnly
              />
              <FormikTextInput
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                data-testid="newEmailInput"
                label={i18n.t('New email')}
                placeholder={i18n.t('Enter new email')}
              />
              <FormikTextInput
                id="emailCurrentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                data-testid="emailCurrentPasswordInput"
                label={i18n.t('Current password')}
                placeholder={i18n.t('Enter current password')}
              />
              <Button
                type="submit"
                radius="md"
                disabled={!dirty || !isValid || isSubmitting}
                style={{ alignSelf: 'flex-start' }}
              >
                {isSubmitting ? i18n.t('Sending...') : i18n.t('Send verification email')}
              </Button>
            </Stack>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default EmailSettingsForm;
