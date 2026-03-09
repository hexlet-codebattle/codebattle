import React, { useMemo } from "react";

import cn from "classnames";
import { Field, Form, Formik, useField } from "formik";
import capitalize from "lodash/capitalize";
import omit from "lodash/omit";
import pick from "lodash/pick";
import Dropdown from "react-bootstrap/Dropdown";
import * as Icon from "react-feather";
import * as Yup from "yup";

import LanguageIcon from "@/components/LanguageIcon";

import languages, { cssProcessors, dbNames } from "../../config/languages";
import schemas from "../../formik";
import { createPlayer } from "../../lib/sound";

const views = {
  code: "code",
  css: "css",
  sql: "sql",
};

const playingLanguages = Object.entries(omit(languages, [...cssProcessors, ...dbNames]));
const cssLanguages = Object.entries(pick(languages, cssProcessors));
const databaseTypes = Object.entries(pick(languages, dbNames));

const player = createPlayer();

const playSound = (type, volume) => {
  player.stop();
  player[type].play("win", volume);
};

const getFieldNameByView = (view) => {
  switch (view) {
    case views.code:
      return "lang";
    case views.css:
      return "styleLang";
    case views.sql:
      return "dbType";
    default:
      return "lang";
  }
};

const getPlaceholder = ({ disabled, placeholder }) => {
  if (!disabled) {
    return placeholder;
  }

  return "No access yet";
};

function TextInput({ label, ...props }) {
  const [field, meta] = useField(props);
  const { name, disabled, hint, hintHref = "", ...inputProps } = props;

  const labelClassName = cn("h6", {
    "text-muted": disabled,
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

function LanguageSelect({ lang, view, currentView, items }) {
  return (
    <div className={cn("col-lg-4", { hidden: view !== currentView })}>
      <div className="h6">Your weapon</div>
      <div className="card cb-card p-3">
        <div className="d-flex align-items-center">
          <LanguageIcon className="w-100 h-100 mb-2" lang={lang} />
          <Field
            as="select"
            data-testid={`${view}-langSelect`}
            aria-label="Programming language select"
            name={getFieldNameByView(view)}
            className="cb-bg-panel ml-2 cb-border-color text-white custom-select"
          >
            {items.map(([slug, l]) => (
              <option key={slug} value={slug}>
                {capitalize(l)}
              </option>
            ))}
          </Field>
        </div>
      </div>
    </div>
  );
}

const locales = [
  ["en", "Eng"],
  ["ru", "Ru"],
];

function LocaleSelect() {
  const [field, , helpers] = useField("locale");
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

function RangeInput({ className, min = 0, max = 100, style, ...props }) {
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
      className={cn("form-range w-100 cb-range", className)}
      style={{ ...style, "--range-progress": `${progress}%` }}
    />
  );
}

function UserSettingsForm({ onSubmit, settings }) {
  const initialValues = useMemo(
    () => ({
      locale: settings.locale,
      name: settings.name,
      soundSettings: {
        type: settings.soundSettings.type,
        level: settings.soundSettings.level,
        tournamentLevel: settings.soundSettings.tournamentLevel ?? settings.soundSettings.level,
      },
      clan: settings.clan || "",
      langView: views.code,
      lang: settings.lang || "",
      styleLang: settings.styleLang || "",
      dbType: settings.dbType || "",
    }),
    [settings],
  );

  const validationSchema = useMemo(() => Yup.object(schemas.userSettings(settings)), [settings]);

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
                    label="Your name"
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="mt-2">
                  <TextInput
                    className="col-5"
                    data-testid="clanInput"
                    label="Your clan"
                    id="clan"
                    name="clan"
                    type="text"
                    hint="clan list"
                    hintHref="/clans"
                    placeholder="Enter your clan"
                  />
                </div>
                <div className="mt-2">
                  <div className="h6">Locale</div>
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

          <div id="my-radio-group" className="h6 ml-2">
            Select sound type
          </div>
          <div role="group" aria-labelledby="my-radio-group" className="ml-3 mb-3">
            <div className="form-check">
              <Field
                id="radioDendy"
                type="radio"
                name="soundSettings.type"
                value="dendy"
                className="form-check-input"
                onClick={() => playSound("dendy", values.soundSettings.level * 0.1)}
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
                onClick={() => playSound("cs", values.soundSettings.level * 0.1)}
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
                onClick={() => playSound("standard", values.soundSettings.level * 0.1)}
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
            <RangeInput
              type="range"
              min={0}
              max={10}
              name="soundSettings.level"
              disabled={values.soundSettings.type === "silent"}
              onInput={(e) => {
                handleChange(e);
                playSound(values.soundSettings.type, e.target.value * 0.1);
              }}
              className="mx-3"
            />
            <Icon.Volume2 />
          </div>

          <div className="h6 ml-2">Select tournament sound level</div>
          <div className="ml-2 mb-3 d-flex align-items-center">
            <Icon.VolumeX />
            <RangeInput
              type="range"
              min={0}
              max={10}
              name="soundSettings.tournamentLevel"
              disabled={values.soundSettings.type === "silent"}
              onInput={(e) => {
                handleChange(e);
                playSound(values.soundSettings.type, e.target.value * 0.1);
              }}
              className="mx-3"
            />
            <Icon.Volume2 />
          </div>

          <div className="d-flex justify-content-center">
            <button
              disabled={!dirty || !isValid}
              aria-label="SubmitForm"
              style={{ width: "120px" }}
              type="submit"
              className="btn py-1 btn-primary rounded-lg"
            >
              {isSubmitting ? (
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="sr-only">Loading...</span>
                </div>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}

export default UserSettingsForm;
