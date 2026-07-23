import React, { useMemo } from 'react';

import cn from 'classnames';
import { Field, Form, Formik, useField, type FormikHelpers } from 'formik';
import capitalize from 'lodash/capitalize';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import Dropdown from 'react-bootstrap/Dropdown';
import * as Icon from 'react-feather';
import * as Yup from 'yup';

import LanguageIcon from '@/components/LanguageIcon';

import i18n from '../../../i18n';
import languages, { cssProcessors, dbNames } from '../../config/languages';
import schemas from '../../formik';
import { createPlayer } from '../../lib/sound';

export interface UserSettingsData {
  locale: string;
  name: string;
  clan?: string;
  lang?: string;
  styleLang?: string;
  dbType?: string;
  soundSettings: {
    type: 'dendy' | 'cs' | 'standard' | 'silent';
    level: number;
    tournamentLevel?: number;
  };
  githubId?: string | number | null;
  discordId?: string | number | null;
  canUnlinkSocial?: boolean;
  hasPassword?: boolean;
  [key: string]: unknown;
}

export interface UserSettingsFormValues {
  locale: string;
  name: string;
  clan: string;
  langView: SettingsView;
  lang: string;
  styleLang: string;
  dbType: string;
  soundSettings: {
    type: 'dendy' | 'cs' | 'standard' | 'silent';
    level: number;
    tournamentLevel: number;
  };
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

type SoundType = 'dendy' | 'cs' | 'standard';

const views = {
  code: 'code',
  css: 'css',
  sql: 'sql',
} as const;

type SettingsView = (typeof views)[keyof typeof views];
const passwordFieldNames = ['currentPassword', 'password', 'passwordConfirmation'] as const;

const hasPasswordValue = (values: Partial<UserSettingsFormValues>) =>
  passwordFieldNames.some((fieldName) => Boolean(values[fieldName]?.trim()));

const passwordValidationSchema = {
  currentPassword: Yup.string().test(
    'required-current-password',
    "Field can't be empty",
    function (value) {
      return !hasPasswordValue(this.parent) || Boolean(value?.trim());
    },
  ),
  password: Yup.string()
    .test('required-password', "Field can't be empty", function (value) {
      return !hasPasswordValue(this.parent) || Boolean(value?.trim());
    })
    .test('password-min-length', 'Should be at least 12 characters', function (value) {
      return !hasPasswordValue(this.parent) || (value?.length ?? 0) >= 12;
    })
    .test('password-max-bytes', 'Should be at most 72 bytes', function (value) {
      return !value || new TextEncoder().encode(value).length <= 72;
    })
    .matches(/^\S*$/, "Can't contain empty symbols"),
  passwordConfirmation: Yup.string()
    .test('required-password-confirmation', "Field can't be empty", function (value) {
      return !hasPasswordValue(this.parent) || Boolean(value?.trim());
    })
    .test('password-confirmation', 'Passwords must match', function (value) {
      return !hasPasswordValue(this.parent) || value === this.parent.password;
    }),
};

const playingLanguages = Object.entries(omit(languages, [...cssProcessors, ...dbNames]));
const cssLanguages = Object.entries(pick(languages, cssProcessors));
const databaseTypes = Object.entries(pick(languages, dbNames));

const player = createPlayer();

const playSound = (type: SoundType, volume: number) => {
  player.stop();
  player[type].play('win', volume);
};

const getFieldNameByView = (view: SettingsView) => {
  switch (view) {
    case views.code:
      return 'lang';
    case views.css:
      return 'styleLang';
    case views.sql:
      return 'dbType';
    default:
      return 'lang';
  }
};

interface TextInputProps {
  label: React.ReactNode;
  name: string;
  disabled?: boolean;
  placeholder?: string;
  hint?: React.ReactNode;
  hintHref?: string;
  [key: string]: unknown;
}

const getPlaceholder = ({
  disabled,
  placeholder,
}: {
  disabled?: boolean;
  placeholder?: string;
}) => {
  if (!disabled) {
    return placeholder;
  }

  return i18n.t('No access yet');
};

function TextInput({ label, ...props }: TextInputProps) {
  const [field, meta] = useField(props);
  const { name, disabled, hint, hintHref = '', ...inputProps } = props;

  const labelClassName = cn('h6', {
    'text-muted': disabled,
  });

  return (
    <div className="form-group mb-3">
      <label className={labelClassName} htmlFor={name}>
        {label}
        {hint && (
          <a className="text-primary pl-2" href={hintHref}>
            <small>{hint}</small>
          </a>
        )}
      </label>
      <input
        {...field}
        {...inputProps}
        placeholder={getPlaceholder(props)}
        className="form-control cb-bg-panel cb-border-color text-white"
      />
      {meta.touched && meta.error && <div className="invalid-feedback">{meta.error}</div>}
    </div>
  );
}

interface LanguageSelectProps {
  lang?: string;
  view: SettingsView;
  currentView: SettingsView;
  items: [string, string][];
}

function LanguageSelect({ lang, view, currentView, items }: LanguageSelectProps) {
  const [field, , helpers] = useField(getFieldNameByView(view));
  const selectedSlug = field.value || lang || items[0]?.[0];
  const selectedName = items.find(([slug]) => slug === selectedSlug)?.[1] || selectedSlug;

  return (
    <div className={cn('col-lg-4', { hidden: view !== currentView })}>
      <div className="h6">{i18n.t('Your weapon')}</div>
      <div className="card cb-card p-3">
        <Dropdown className="w-100">
          <Dropdown.Toggle
            id={`${view}-language-dropdown`}
            data-testid={`${view}-langSelect`}
            aria-label="Programming language select"
            className="btn cb-bg-panel cb-border-color text-white w-100 d-flex align-items-center"
          >
            <LanguageIcon
              className="mr-2 flex-shrink-0"
              lang={selectedSlug}
              style={{ width: '24px', height: '24px' }}
            />
            <span>{capitalize(selectedName)}</span>
          </Dropdown.Toggle>
          <Dropdown.Menu className="w-100 cb-bg-highlight-panel">
            {items.map(([slug, languageName]) => (
              <Dropdown.Item
                key={slug}
                as="button"
                type="button"
                active={selectedSlug === slug}
                className="cb-dropdown-item d-flex align-items-center"
                onClick={() => helpers.setValue(slug)}
              >
                <LanguageIcon
                  className="mr-2 flex-shrink-0"
                  lang={slug}
                  style={{ width: '24px', height: '24px' }}
                />
                {capitalize(languageName)}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );
}

const locales = [
  ['en', 'Eng'],
  ['ru', 'Ru'],
];

function LocaleSelect() {
  const [field, , helpers] = useField('locale');
  const currentLocaleLabel = locales.find(([value]) => value === field.value)?.[1] || locales[0][1];

  return (
    <Dropdown>
      <Dropdown.Toggle
        id="locale-dropdown"
        data-testid="localeSelect"
        aria-label="Locale"
        type="button"
        className="btn cb-bg-panel cb-border-color text-white w-100 text-left"
      >
        {currentLocaleLabel}
      </Dropdown.Toggle>
      <Dropdown.Menu className="w-100 cb-bg-highlight-panel">
        {locales.map(([value, label]) => (
          <Dropdown.Item
            key={value}
            as="button"
            type="button"
            active={field.value === value}
            className="cb-dropdown-item"
            onClick={() => helpers.setValue(value)}
          >
            {label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

interface RangeInputProps {
  name: string;
  className?: string;
  min?: number;
  max?: number;
  style?: React.CSSProperties;
  [key: string]: unknown;
}

function RangeInput({ className, min = 0, max = 100, style, ...props }: RangeInputProps) {
  const [field] = useField(props.name);
  const currentValue = Number(field.value ?? min);
  const minValue = Number(min);
  const maxValue = Number(max);
  const progress =
    maxValue === minValue ? 0 : ((currentValue - minValue) / (maxValue - minValue)) * 100;

  return (
    <input
      {...field}
      {...props}
      min={min}
      max={max}
      value={currentValue}
      className={cn('form-range w-100 cb-range', className)}
      style={{ ...style, '--range-progress': `${progress}%` } as React.CSSProperties}
    />
  );
}

interface UserSettingsFormProps {
  settings: UserSettingsData;
  onSubmit: (
    values: UserSettingsFormValues,
    formikHelpers: FormikHelpers<UserSettingsFormValues>,
  ) => void | Promise<void>;
}

function UserSettingsForm({ onSubmit, settings }: UserSettingsFormProps) {
  const initialValues = useMemo<UserSettingsFormValues>(
    () => ({
      locale: settings.locale,
      name: settings.name,
      soundSettings: {
        type: settings.soundSettings.type,
        level: settings.soundSettings.level,
        tournamentLevel: settings.soundSettings.tournamentLevel ?? settings.soundSettings.level,
      },
      clan: settings.clan || '',
      langView: views.code,
      lang: settings.lang || '',
      styleLang: settings.styleLang || '',
      dbType: settings.dbType || '',
      currentPassword: '',
      password: '',
      passwordConfirmation: '',
    }),
    [settings],
  );

  const validationSchema = useMemo(
    () => Yup.object({ ...schemas.userSettings(settings), ...passwordValidationSchema }),
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
      {({ handleChange, dirty, isValid, isSubmitting, values }) => (
        <Form>
          <div className="container">
            <div className="row form-group mb-3">
              <div className="col-lg-3">
                <div>
                  <TextInput
                    className="col-5"
                    data-testid="nameInput"
                    label={i18n.t('Your name')}
                    id="name"
                    name="name"
                    type="text"
                    placeholder={i18n.t('Enter your name')}
                  />
                </div>
                <div className="mt-2">
                  <TextInput
                    className="col-5"
                    data-testid="clanInput"
                    label={i18n.t('Your clan')}
                    id="clan"
                    name="clan"
                    type="text"
                    hint={i18n.t('clan list')}
                    hintHref="/clans"
                    placeholder={i18n.t('Enter your clan')}
                  />
                </div>
                <div className="mt-2">
                  <div className="h6">{i18n.t('Locale')}</div>
                  <LocaleSelect />
                </div>
              </div>
              <LanguageSelect
                view={views.code}
                currentView={values.langView}
                lang={values.lang}
                items={playingLanguages}
              />
              <LanguageSelect
                view={views.css}
                currentView={values.langView}
                lang={values.styleLang}
                items={cssLanguages}
              />
              <LanguageSelect
                view={views.sql}
                currentView={values.langView}
                lang={values.dbType}
                items={databaseTypes}
              />
            </div>
          </div>

          {settings.hasPassword && (
            <div className="container">
              <div className="row form-group mb-3">
                <div className="col-lg-4">
                  <h3 className="font-weight-normal">{i18n.t('Change password')}</h3>
                  <TextInput
                    data-testid="currentPasswordInput"
                    label={i18n.t('Old password')}
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    placeholder={i18n.t('Enter old password')}
                  />
                  <TextInput
                    data-testid="passwordInput"
                    label={i18n.t('New password')}
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={i18n.t('Enter new password')}
                  />
                  <TextInput
                    data-testid="passwordConfirmationInput"
                    label={i18n.t('Confirm new password')}
                    id="passwordConfirmation"
                    name="passwordConfirmation"
                    type="password"
                    autoComplete="new-password"
                    placeholder={i18n.t('Confirm new password')}
                  />
                </div>
              </div>
            </div>
          )}

          <div id="my-radio-group" className="h6 ml-2">
            {i18n.t('Select sound type')}
          </div>
          <div role="group" aria-labelledby="my-radio-group" className="ml-3 mb-3">
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
                {i18n.t('Dendy')}
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
                {i18n.t('CS')}
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
                {i18n.t('Standard')}
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
                {i18n.t('Silent')}
              </label>
            </div>
          </div>

          <div className="h6 ml-2">{i18n.t('Select sound level')}</div>
          <div className="ml-2 mb-3 d-flex align-items-center">
            <Icon.VolumeX />
            <RangeInput
              type="range"
              min={0}
              max={10}
              name="soundSettings.level"
              disabled={values.soundSettings.type === 'silent'}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                handleChange(e);
                playSound(
                  values.soundSettings.type as SoundType,
                  Number(e.currentTarget.value) * 0.1,
                );
              }}
              className="mx-3"
            />
            <Icon.Volume2 />
          </div>

          <div className="h6 ml-2">{i18n.t('Select tournament sound level')}</div>
          <div className="ml-2 mb-3 d-flex align-items-center">
            <Icon.VolumeX />
            <RangeInput
              type="range"
              min={0}
              max={10}
              name="soundSettings.tournamentLevel"
              disabled={values.soundSettings.type === 'silent'}
              onInput={(e: React.FormEvent<HTMLInputElement>) => {
                handleChange(e);
                playSound(
                  values.soundSettings.type as SoundType,
                  Number(e.currentTarget.value) * 0.1,
                );
              }}
              className="mx-3"
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
                i18n.t('Save')
              )}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default UserSettingsForm;
