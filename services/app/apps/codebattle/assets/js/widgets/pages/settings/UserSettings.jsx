import React, { useState } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import capitalize from 'lodash/capitalize';
import { useDispatch, useSelector } from 'react-redux';

import Loading from '../../components/Loading';
import { userSettingsSelector } from '../../selectors';
import { updateUserSettings } from '../../slices/userSettings';

import UserSettingsForm from './UserSettingsForm';

const PROVIDERS = ['github', 'discord'];

function BindSocialBtn({ disabled, isBinded, provider }) {
  const formatedProviderName = capitalize(provider);

  return (
    <div className="d-flex mb-2 align-items-center">
      <FontAwesomeIcon
        icon={['fab', provider]}
        className={cn({
          'mr-2': true,
          'text-muted': isBinded,
        })}
      />
      {isBinded ? (
        <button
          className="bind-social"
          data-csrf={window.csrf_token}
          data-method="delete"
          data-to={`/auth/${provider}`}
          disabled={disabled}
          type="button"
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
}

const renderSocialBtns = (currentUserSettings) => {
  const getProviderName = (slug) => currentUserSettings[`${slug}_name`];
  return PROVIDERS.map((provider) => {
    const providerName = getProviderName(provider);
    return (
      <BindSocialBtn
        key={provider}
        disabled={providerName && providerName.length}
        isBinded={providerName && providerName.length}
        provider={provider}
      />
    );
  });
};

function UserSettings() {
  const [notification, setNotification] = useState('pending');
  const [animation, setAnimation] = useState('done');

  const settings = useSelector(userSettingsSelector);
  const dispatch = useDispatch();

  const notificationStyles = cn({
    'alert-success': notification === 'editSuccess',
    'alert-danger': notification === 'editError',
    alert: true,
    fade: animation === 'done',
  });

  const handleUpdateUserSettings = async (values, formikHelpers) => {
    const resultAction = await dispatch(updateUserSettings(values));
    if (updateUserSettings.fulfilled.match(resultAction)) {
      // const userSettings = resultAction.payload;
      setAnimation('progress');
      setNotification('editSuccess');
    } else if (resultAction.payload) {
      setAnimation('progress');
      setNotification('editError');
      formikHelpers.setErrors(resultAction.payload.field_errors);
    } else {
      setNotification('editError');
    }
    await setTimeout(() => setAnimation('done'), 1600);
  };

  const getNotificationMessage = (status) => {
    let message;
    switch (status) {
      case 'editSuccess': {
        message = 'Your settings has been changed';
        break;
      }
      case 'editError': {
        message = 'Oops, something has gone wrong';
        break;
      }
      case 'pending': {
        message = 'pending';
        break;
      }
      default: {
        message = 'unfamiliar status';
        break;
      }
    }
    return message;
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
      <UserSettingsForm settings={settings} onSubmit={handleUpdateUserSettings} />
      <div className="mt-3 ml-2 d-flex flex-column">
        <h3 className="mb-3 font-weight-normal">Socials</h3>
        {renderSocialBtns(settings)}
      </div>
    </div>
  );
}

export default UserSettings;
