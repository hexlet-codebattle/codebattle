import React, { useCallback, useEffect, useMemo, useRef } from 'react';

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
import SoundToggle from '../../components/SoundToggle';
import languages, { cssProcessors, dbNames } from '../../config/languages';
import schemas from '../../formik';
import { createPlayer } from '../../lib/sound';

export interface UserSettingsData {
  email?: string;
  hasFirebaseAuth?: boolean;
  locale: string;
  name: string;
  clan?: string;
  lang?: string;
  styleLang?: string;
  dbType?: string;
  soundSettings: {
    type: 'dendy' | 'cs' | 'standard' | 'silent';
    level: number;
    muted?: boolean;
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
}

export interface PasswordSettingsFormValues {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

export type UserPreferenceUpdate = Partial<
  Pick<UserSettingsFormValues, 'locale' | 'lang' | 'styleLang' | 'dbType'>
> & {
  soundSettings?: Partial<UserSettingsFormValues['soundSettings']>;
};

type SoundType = 'dendy' | 'cs' | 'standard';

const views = {
  code: 'code',
  css: 'css',
  sql: 'sql',
} as const;

type SettingsView = (typeof views)[keyof typeof views];
const passwordFieldNames = ['currentPassword', 'password', 'passwordConfirmation'] as const;

const hasPasswordValue = (values: Partial<PasswordSettingsFormValues>) =>
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
  onSelect: (fieldName: 'lang' | 'styleLang' | 'dbType', value: string) => void;
}

function LanguageSelect({ lang, view, currentView, items, onSelect }: LanguageSelectProps) {
  const fieldName = getFieldNameByView(view);
  const [field, , helpers] = useField(fieldName);
  const selectedSlug = field.value || lang || items[0]?.[0];
  const selectedName = items.find(([slug]) => slug === selectedSlug)?.[1] || selectedSlug;

  return (
    <div className={cn({ 'd-none': view !== currentView })}>
      <div className="h6">{i18n.t('Your weapon')}</div>
      <Dropdown className="w-100">
        <Dropdown.Toggle
          id={`${view}-language-dropdown`}
          data-testid={`${view}-langSelect`}
          aria-label={i18n.t('Programming language select')}
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
              onClick={() => {
                helpers.setValue(slug);
                onSelect(fieldName, slug);
              }}
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
  );
}

const locales = [
  ['en', 'Eng'],
  ['ru', 'Ru'],
];

const soundTypes = [
  { value: 'dendy', label: 'Dendy', icon: Icon.Cpu },
  { value: 'cs', label: 'CS', icon: Icon.Target },
  { value: 'standard', label: 'Standard', icon: Icon.Volume2 },
] as const;

function LocaleSelect({ onSelect }: { onSelect: (locale: string) => void }) {
  const [field, , helpers] = useField('locale');
  const currentLocaleLabel = locales.find(([value]) => value === field.value)?.[1] || locales[0][1];

  return (
    <Dropdown>
      <Dropdown.Toggle
        id="locale-dropdown"
        data-testid="localeSelect"
        aria-label={i18n.t('Locale')}
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
            onClick={() => {
              helpers.setValue(value);
              onSelect(value);
            }}
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
  onAutoSave: (values: UserPreferenceUpdate) => void | Promise<void>;
  onPasswordSubmit: (
    values: PasswordSettingsFormValues,
    formikHelpers: FormikHelpers<PasswordSettingsFormValues>,
  ) => void | Promise<void>;
}

const passwordInitialValues: PasswordSettingsFormValues = {
  currentPassword: '',
  password: '',
  passwordConfirmation: '',
};

function UserSettingsForm({
  onSubmit,
  onAutoSave,
  onPasswordSubmit,
  settings,
}: UserSettingsFormProps) {
  const pendingSoundUpdate = useRef<Partial<UserSettingsFormValues['soundSettings']>>({});
  const soundSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const initialValues = useMemo<UserSettingsFormValues>(
    () => ({
      locale: settings.locale,
      name: settings.name,
      soundSettings: {
        type: settings.soundSettings.type === 'silent' ? 'dendy' : settings.soundSettings.type,
        level: settings.soundSettings.level,
        tournamentLevel: settings.soundSettings.tournamentLevel ?? settings.soundSettings.level,
      },
      clan: settings.clan || '',
      langView: views.code,
      lang: settings.lang || '',
      styleLang: settings.styleLang || '',
      dbType: settings.dbType || '',
    }),
    [settings],
  );

  const validationSchema = useMemo(() => Yup.object(schemas.userSettings(settings)), [settings]);

  const savePreference = useCallback(
    (values: UserPreferenceUpdate) => {
      void onAutoSave(values);
    },
    [onAutoSave],
  );

  const queueSoundUpdate = useCallback(
    (values: Partial<UserSettingsFormValues['soundSettings']>) => {
      pendingSoundUpdate.current = { ...pendingSoundUpdate.current, ...values };
      clearTimeout(soundSaveTimer.current);
      soundSaveTimer.current = setTimeout(() => {
        const soundSettings = pendingSoundUpdate.current;
        pendingSoundUpdate.current = {};
        savePreference({ soundSettings });
      }, 300);
    },
    [savePreference],
  );

  useEffect(
    () => () => {
      clearTimeout(soundSaveTimer.current);
    },
    [],
  );

  return (
    <>
      <Formik
        initialValues={initialValues}
        initialTouched={{ name: true }}
        validateOnChange
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        {({ errors, handleChange, isSubmitting, values }) => {
          const profileChanged =
            values.name !== settings.name || values.clan !== (settings.clan || '');
          const profileIsValid = !errors.name && !errors.clan;

          return (
            <Form className="cb-settings-form">
              <section className="cb-settings-section" aria-labelledby="profile-settings-title">
                <div className="cb-settings-section-heading">
                  <span className="cb-settings-section-icon" aria-hidden="true">
                    <Icon.User size={20} />
                  </span>
                  <div>
                    <h3 id="profile-settings-title">{i18n.t('Profile')}</h3>
                    <p>{i18n.t('Manage your public identity.')}</p>
                  </div>
                </div>

                <div className="cb-settings-profile-grid">
                  <TextInput
                    data-testid="nameInput"
                    label={i18n.t('Your name')}
                    id="name"
                    name="name"
                    type="text"
                    placeholder={i18n.t('Enter your name')}
                  />
                  <TextInput
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

                <div className="cb-settings-section-actions">
                  <button
                    disabled={!profileChanged || !profileIsValid || isSubmitting}
                    aria-label={i18n.t('Update profile')}
                    type="submit"
                    className="btn btn-primary rounded-lg px-4"
                  >
                    {isSubmitting ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="sr-only">{i18n.t('Loading...')}</span>
                      </div>
                    ) : (
                      i18n.t('Update profile')
                    )}
                  </button>
                </div>
              </section>

              <section className="cb-settings-section" aria-labelledby="preferences-settings-title">
                <div className="cb-settings-section-heading">
                  <span className="cb-settings-section-icon" aria-hidden="true">
                    <Icon.Code size={20} />
                  </span>
                  <div>
                    <h3 id="preferences-settings-title">{i18n.t('Coding preferences')}</h3>
                    <p>{i18n.t('Weapon and locale changes are saved automatically.')}</p>
                  </div>
                </div>

                <div className="cb-settings-profile-grid">
                  <LanguageSelect
                    view={views.code}
                    currentView={values.langView}
                    lang={values.lang}
                    items={playingLanguages}
                    onSelect={(fieldName, value) => savePreference({ [fieldName]: value })}
                  />
                  <LanguageSelect
                    view={views.css}
                    currentView={values.langView}
                    lang={values.styleLang}
                    items={cssLanguages}
                    onSelect={(fieldName, value) => savePreference({ [fieldName]: value })}
                  />
                  <LanguageSelect
                    view={views.sql}
                    currentView={values.langView}
                    lang={values.dbType}
                    items={databaseTypes}
                    onSelect={(fieldName, value) => savePreference({ [fieldName]: value })}
                  />
                  <div>
                    <div className="h6">{i18n.t('Locale')}</div>
                    <LocaleSelect onSelect={(locale) => savePreference({ locale })} />
                  </div>
                </div>
              </section>

              <section className="cb-settings-section" aria-labelledby="sound-settings-title">
                <div className="cb-settings-section-heading cb-settings-sound-heading">
                  <span className="cb-settings-section-icon" aria-hidden="true">
                    <Icon.Volume2 size={20} />
                  </span>
                  <div className="flex-grow-1">
                    <h3 id="sound-settings-title">{i18n.t('Sound settings')}</h3>
                    <p>{i18n.t('Choose how game and tournament notifications sound.')}</p>
                  </div>
                  <SoundToggle variant="settings" />
                </div>

                <fieldset className="mb-4">
                  <legend className="cb-settings-label">{i18n.t('Sound theme')}</legend>
                  <div className="cb-settings-sound-types">
                    {soundTypes.map(({ value, label, icon: SoundIcon }) => (
                      <div key={value} className="cb-settings-sound-option">
                        <Field
                          id={`sound-type-${value}`}
                          type="radio"
                          name="soundSettings.type"
                          value={value}
                          className="cb-settings-sound-input"
                          onClick={() => {
                            playSound(value, values.soundSettings.level * 0.1);
                            savePreference({ soundSettings: { type: value } });
                          }}
                        />
                        <label htmlFor={`sound-type-${value}`}>
                          <SoundIcon size={20} aria-hidden="true" />
                          <span>{i18n.t(label)}</span>
                          <Icon.Check className="cb-settings-sound-check" size={16} />
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <div className="cb-settings-volume-grid">
                  <div className="cb-settings-volume-card">
                    <div className="cb-settings-volume-label">
                      <span>{i18n.t('Game sound level')}</span>
                      <strong>{values.soundSettings.level}/10</strong>
                    </div>
                    <div className="d-flex align-items-center">
                      <Icon.VolumeX size={18} aria-hidden="true" />
                      <RangeInput
                        type="range"
                        min={0}
                        max={10}
                        name="soundSettings.level"
                        aria-label={i18n.t('Game sound level')}
                        disabled={values.soundSettings.type === 'silent'}
                        onInput={(e: React.FormEvent<HTMLInputElement>) => {
                          handleChange(e);
                          queueSoundUpdate({
                            level: Number(e.currentTarget.value),
                          });
                          playSound(
                            values.soundSettings.type as SoundType,
                            Number(e.currentTarget.value) * 0.1,
                          );
                        }}
                        className="mx-3"
                      />
                      <Icon.Volume2 size={18} aria-hidden="true" />
                    </div>
                  </div>

                  <div className="cb-settings-volume-card">
                    <div className="cb-settings-volume-label">
                      <span>{i18n.t('Tournament sound level')}</span>
                      <strong>{values.soundSettings.tournamentLevel}/10</strong>
                    </div>
                    <div className="d-flex align-items-center">
                      <Icon.VolumeX size={18} aria-hidden="true" />
                      <RangeInput
                        type="range"
                        min={0}
                        max={10}
                        name="soundSettings.tournamentLevel"
                        aria-label={i18n.t('Tournament sound level')}
                        disabled={values.soundSettings.type === 'silent'}
                        onInput={(e: React.FormEvent<HTMLInputElement>) => {
                          handleChange(e);
                          queueSoundUpdate({
                            tournamentLevel: Number(e.currentTarget.value),
                          });
                          playSound(
                            values.soundSettings.type as SoundType,
                            Number(e.currentTarget.value) * 0.1,
                          );
                        }}
                        className="mx-3"
                      />
                      <Icon.Volume2 size={18} aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </section>
            </Form>
          );
        }}
      </Formik>

      {settings.hasPassword && (
        <Formik
          initialValues={passwordInitialValues}
          validationSchema={Yup.object(passwordValidationSchema)}
          validateOnChange
          onSubmit={onPasswordSubmit}
        >
          {({ dirty, isValid, isSubmitting }) => (
            <Form className="cb-settings-form">
              <section className="cb-settings-section" aria-labelledby="password-settings-title">
                <div className="cb-settings-section-heading">
                  <span className="cb-settings-section-icon" aria-hidden="true">
                    <Icon.Lock size={20} />
                  </span>
                  <div>
                    <h3 id="password-settings-title">{i18n.t('Change password')}</h3>
                  </div>
                </div>
                <div className="cb-settings-security-grid">
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
                <div className="cb-settings-section-actions">
                  <button
                    disabled={!dirty || !isValid || isSubmitting}
                    aria-label={i18n.t('Change password')}
                    type="submit"
                    className="btn btn-primary rounded-lg px-4"
                  >
                    {isSubmitting ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="sr-only">{i18n.t('Loading...')}</span>
                      </div>
                    ) : (
                      i18n.t('Change password')
                    )}
                  </button>
                </div>
              </section>
            </Form>
          )}
        </Formik>
      )}
    </>
  );
}

export default UserSettingsForm;
