import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import _ from "lodash";
import cn from "classnames";
import { Formik, Form, Field, useField } from "formik";
import * as Yup from "yup";
import Slider from "calcite-react/Slider";
import * as Icon from "react-feather";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import languages from "../config/languages";
import Loading from "../components/Loading";
import sound, { sounds } from "../lib/sound";
import { userSettingsSelector } from "../selectors";
import { updateUserSettings } from "../slices/userSettings";

const PROVIDERS = ["github", "discord"];
const playingLanguages = Object.entries(languages);

const renderLanguages = (langs) =>
  langs.map(([slug, lang]) => (
    <option key={slug} value={lang}>
      {_.capitalize(lang)}
    </option>
  ));

const BindSocialBtn = ({ provider, disabled, isBinded }) => {
  const formatedProviderName = _.capitalize(provider);

  return (
    <div className="d-flex mb-2 align-items-center">
      <FontAwesomeIcon
        className={cn({
          "mr-2": true,
          "text-muted": isBinded,
        })}
        icon={["fab", provider]}
      />
      {isBinded ? (
        <button
          type="button"
          className="bind-social"
          data-method="delete"
          data-csrf={window.csrf_token}
          data-to={`/auth/${provider}`}
          disabled={disabled}
        >
          {`Unlink ${formatedProviderName}`}
        </button>
      ) : (
        <a className="bind-social" href={`/auth/${provider}/bind/`}>
          {`Link ${formatedProviderName}`}
        </a>
      )}
    </div>
  );
};

const renderSocialBtns = (currentUserSettings) => {
  const getProviderName = (slug) => currentUserSettings[`${slug}_name`];
  return PROVIDERS.map((provider) => {
    const providerName = getProviderName(provider);
    return (
      <BindSocialBtn
        provider={provider}
        isBinded={providerName && providerName.length}
        disabled={providerName && providerName.length}
        key={provider}
      />
    );
  });
};

const UserSettings = () => {
  const [unprocessableError, setUnprocessableError] = useState("");
  const [notification, setNotification] = useState("pending");
  const [animation, setAnimation] = useState("done");

  const settings = useSelector(userSettingsSelector);
  const dispatch = useDispatch();

  const notificationStyles = cn({
    "alert-success": notification === "editSuccess",
    "alert-error": notification === "editError",
    alert: true,
    fade: animation === "done",
  });

  const handleUpdateUserSettings = async (values, formikHelpers) => {
    const resultAction = await dispatch(updateUserSettings(values));
    if (updateUserSettings.fulfilled.match(resultAction)) {
      // const userSettings = resultAction.payload;
      setAnimation("progress");
      setNotification("editSuccess");
    } else {
      if (resultAction.payload) {
        setNotification(resultAction.payload.field_errors);
        formikHelpers.setErrors(resultAction.payload.field_errors);
      } else {
        setNotification("editError");
      }
    }
    await setTimeout(() => setAnimation("done"), 1600);
  };

  const getNotificationMessage = (status) => {
    let message;
    switch (status) {
      case "editSuccess": {
        message = "Your settings has been changed";
        break;
      }
      case "editError": {
        message = "Oops, something has gone wrong";
        break;
      }
      case "pending": {
        message = "pending";
        break;
      }
      default: {
        message = "unfamiliar status";
        break;
      }
    }
    return message;
  };

  const TextInput = ({ label, ...props }) => {
    const [field, meta] = useField(props);
    const { id, name } = props;

    return (
      <div className="form-group mb-3">
        <div>
          <label htmlFor={id || name} className="h6">
            {label}
          </label>
        </div>
        <input {...field} {...props} className="form-control" />
        {meta.touched && meta.error ? (
          <span className="error text-danger">{meta.error}</span>
        ) : (
          <span className="error text-danger">{unprocessableError}</span>
        )}
      </div>
    );
  };

  if (!settings) {
    return <Loading />;
  }
  return (
    <div className="container bg-white shadow-sm py-4">
      <div className="text-center">
        <div className={notificationStyles} role="alert">
          {getNotificationMessage(notification)}
        </div>

        <h2 className="font-weight-normal">Settings</h2>
      </div>
      <Formik
        initialValues={{
          name: settings.name,
          sound_settings: {
            type: settings.sound_settings.type,
            level: settings.sound_settings.level,
          },
          lang: settings.lang,
        }}
        validationSchema={Yup.object({
          name: Yup.string()
            .required("Field can't be empty")
            .min(3, "Should be at least 3 characters")
            .max(16, "Should be 16 character(s) or less"),
        })}
        onSubmit={handleUpdateUserSettings}
      >
        {({ handleChange, dirty, isSubmitting, values }) => (
          <Form className="">
            <div className="container">
              <div className="row form-group mb-3">
                <div className="col-3">
                  <TextInput
                    className="col-5"
                    label="Your name"
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="col-3">
                  <p className="h6 pt-1">Your weapon</p>
                  <Field
                    as="select"
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
                  onClick={() => sounds().dendy.play("win")}
                />
                Dendy
              </div>
              <div>
                <Field
                  type="radio"
                  name="sound_settings.type"
                  value="cs"
                  className="mr-2"
                  onClick={() => sounds().cs.play("win")}
                />
                CS
              </div>
              <div>
                <Field
                  type="radio"
                  name="sound_settings.type"
                  value="standart"
                  className="mr-2"
                  onClick={() => sounds().standart.play("win")}
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
                disabled={values.sound_settings.type === "silent"}
                onInput={(e) => {
                  handleChange(e);
                  sound.play("win", e.target.value * 0.1);
                }}
                className="ml-3 mr-3 form-control"
              />
              <Icon.Volume2 />
            </div>

            <div className="d-flex justify-content-center">
              <button
                disabled={!dirty}
                style={{ width: "120px" }}
                type="submit"
                className="btn py-1 btn-primary"
              >
                {!isSubmitting ? (
                  "Save"
                ) : (
                  <div
                    className="spinner-border spinner-border-sm"
                    role="status"
                  >
                    <span className="sr-only">Loading...</span>
                  </div>
                )}
              </button>
            </div>
          </Form>
        )}
      </Formik>
      <div className="mt-3 ml-2 d-flex flex-column">
        <h3 className="mb-3 font-weight-normal">Socials</h3>
        {renderSocialBtns(settings)}
      </div>
    </div>
  );
};

export default UserSettings;
