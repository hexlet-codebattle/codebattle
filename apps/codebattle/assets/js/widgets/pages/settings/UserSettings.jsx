import React, { useState, useCallback, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import cn from "classnames";
import { camelizeKeys, decamelizeKeys } from "humps";
import capitalize from "lodash/capitalize";
import noop from "lodash/noop";
import Alert from "react-bootstrap/Alert";
import { useDispatch, useSelector } from "react-redux";

import i18n, { getSupportedLocale } from "../../../i18n";
import { userSettingsSelector } from "../../selectors";
import { actions } from "../../slices";

import UserSettingsForm from "./UserSettingsForm";

const providers = ["github", "discord"];
const mapUserPropNameByProviderName = {
  github: "githubId",
  discord: "discordId",
};
const notifications = {
  success: { variant: "success", message: i18n.t("Settings changed successfully") },
  error: { variant: "danger", message: i18n.t("Something went wrong") },
  empty: {},
};

const csrfToken = document?.querySelector("meta[name='csrf-token']")?.getAttribute("content");
const updateSettings = async (values) => {
  const response = await fetch("/api/v1/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify(decamelizeKeys(values)),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
};

function Notification({ notification, onClose }) {
  const { variant, message } = notification;

  useEffect(() => {
    if (!message) return noop;

    const timerId = setTimeout(() => onClose(notifications.empty), 1600);

    return () => clearTimeout(timerId);
  }, [onClose, message]);

  return (
    <Alert show={!!message} variant={variant} className="alert-dark-theme rounded shadow-sm mb-2">
      {message}
    </Alert>
  );
}

function SocialButtons({ settings }) {
  return providers.map((provider) => {
    const providerPropName = mapUserPropNameByProviderName[provider];
    const isLinked = !!settings[providerPropName];
    const formatedProviderName = capitalize(provider);

    return (
      <div key={provider} className="d-flex mb-2 align-items-center">
        <FontAwesomeIcon
          className={cn("mr-2", { "text-muted": isLinked })}
          icon={["fab", provider]}
        />
        {isLinked ? (
          <button
            type="button"
            className="bind-social"
            data-method="delete"
            data-csrf={csrfToken}
            data-to={`/auth/${provider}`}
            disabled={!settings.canUnlinkSocial}
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
  });
}

function UserSettings() {
  const [notification, setNotification] = useState(notifications.empty);
  const settings = useSelector(userSettingsSelector);
  const dispatch = useDispatch();

  const handleUpdateUserSettings = useCallback(
    async (values, { setErrors }) => {
      try {
        const data = await updateSettings(values);

        await i18n.changeLanguage(getSupportedLocale(data.locale));
        dispatch(actions.updateUserSettings(camelizeKeys(data)));
        setNotification(notifications.success);
      } catch (error) {
        if (!error.response) {
          setNotification(notifications.error);
          return;
        }

        const { name: userNameErrors = [] } = error.response.data.errors;
        setErrors({ name: userNameErrors.map(capitalize).join(", ") });
      }
    },
    [dispatch],
  );

  return (
    <div className="container cb-bg-panel cb-text cb-rounded shadow-sm py-4">
      <Notification notification={notification} onClose={setNotification} />
      <h2 className="font-weight-normal">Settings</h2>
      <UserSettingsForm settings={settings} onSubmit={handleUpdateUserSettings} />
      <div className="mt-3 ml-2 d-flex flex-column">
        <h3 className="mb-3 font-weight-normal">Socials</h3>
        <SocialButtons settings={settings} />
      </div>
    </div>
  );
}

export default UserSettings;
