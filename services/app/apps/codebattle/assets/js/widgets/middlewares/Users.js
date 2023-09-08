import axios from 'axios';
import { camelizeKeys } from 'humps';
import moment from 'moment';
import qs from 'qs';

import { actions } from '../slices';

export const loadUser = (dispatch) => async (user) => {
  try {
    const response = await axios.get(`/api/v1/users/${user.id}`);
    const data = camelizeKeys(response.data);
    dispatch(actions.setUserInfo(data));
  } catch (error) {
    dispatch(actions.setError(error));
  }
};

export const loadUserStats = (dispatch) => async (user) => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/stats`);
    const data = camelizeKeys(response.data);
    dispatch(actions.updateUsersStats(data));
  } catch (error) {
    dispatch(actions.setError(error));
  }
};

export const loadSimpleUserStats = (onSuccess, onFailure) => (user) => {
  axios.get(`/api/v1/user/${user.id}/simple_stats`).then(onSuccess).catch(onFailure);
};

const periodToTimeUnit = {
  weekly: 'week',
  monthly: 'month',
};

const getDateByPeriod = (period) => {
  if (period === 'total') {
    return null;
  }
  return moment().startOf(periodToTimeUnit[period]).utc().format('YYYY-MM-DD');
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

    axios
      .get(`/api/v1/users?${queryParamsString}`)
      .then(({ data }) => {
        dispatch(actions.updateUsersRatingPage(camelizeKeys(data)));
        dispatch(actions.finishStoreInit());
      })
      .catch((error) => {
        dispatch(actions.setError(error));
      });
  };

export default loadUserStats;
