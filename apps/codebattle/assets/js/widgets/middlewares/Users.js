import { camelizeKeys } from "humps";
import moment from "moment";
import qs from "qs";

import { actions } from "../slices";

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.response = { data, status: response.status };
    throw error;
  }

  return data;
};

export const loadUser = (dispatch) => async (user) => {
  try {
    const response = await requestJson(`/api/v1/users/${user.id}`);
    const data = camelizeKeys(response);
    dispatch(actions.setUserInfo(data));
  } catch (error) {
    dispatch(actions.setError(error));
  }
};

export const loadUserStats = (dispatch) => async (user) => {
  try {
    const response = await requestJson(`/api/v1/user/${user.id}/stats`);
    const data = camelizeKeys(response);
    dispatch(actions.updateUsersStats(data));
  } catch (error) {
    dispatch(actions.setError(error));
  }
};

export const loadNearbyUsers = (abortController, onSuccess, onFailure) => {
  requestJson("/api/v1/user/nearby_users", { signal: abortController.signal })
    .then(camelizeKeys)
    .then(onSuccess)
    .catch(onFailure);
};

export const loadSimpleUserStats = (onSuccess, onFailure) => (user) => {
  requestJson(`/api/v1/user/${user.id}/simple_stats`).then(onSuccess).catch(onFailure);
};

export const sendPremiumRequest = (requestStatus, userId) => async (dispatch) => {
  try {
    await requestJson(`/api/v1/user/${userId}/send_premium_request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": window.csrf_token,
      },
      body: JSON.stringify({ status: requestStatus }),
    });
    dispatch(actions.togglePremiumRequestStatus());
  } catch (error) {
    dispatch(actions.setError(error));
  }
};

const periodToTimeUnit = {
  weekly: "week",
  monthly: "month",
};

const getDateByPeriod = (period) => {
  if (period === "total") {
    return null;
  }
  return moment().startOf(periodToTimeUnit[period]).utc().format("YYYY-MM-DD");
};

export const getUsersRatingPage =
  ({ name, period, withBots }, { attribute, direction }, page, pageSize) =>
  (dispatch) => {
    const queryParamsString = qs.stringify({
      page,
      page_size: pageSize,
      s: `${attribute}+${direction}`,
      q: {
        name_ilike: name,
      },
      date_from: getDateByPeriod(period),
      with_bots: withBots,
    });

    requestJson(`/api/v1/users?${queryParamsString}`)
      .then((data) => {
        dispatch(actions.updateUsersRatingPage(camelizeKeys(data)));
        dispatch(actions.finishStoreInit());
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  };

export default loadUserStats;
