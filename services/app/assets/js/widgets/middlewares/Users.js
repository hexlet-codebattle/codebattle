import axios from 'axios';
import { camelizeKeys } from 'humps';
import qs from 'qs';
import { actions } from '../slices';

export const loadLangStats = dispatch => async user => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/lang_stats`);
    const data = camelizeKeys(response.data);
    dispatch(actions.fetchLangStats(data));
  } catch (error) {
    dispatch(actions.setError(error));
  }
};

export const loadUser = dispatch => async user => {
  try {
    const response = await axios.get(`/api/v1/users/${user.id}`);
    const data = camelizeKeys(response.data);
    dispatch(actions.setUserInfo(data));
  } catch (error) {
    dispatch(actions.setError(error));
  }
};

export const loadUserStats = dispatch => async user => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/stats`);
    const data = camelizeKeys(response.data);
    dispatch(actions.updateUsersStats(data));
  } catch (error) {
    dispatch(actions.setError(error));
  }
};

export const getUsersRatingPage = (dateFrom = null, withBots = true, page = 1, filter = '', sort = '') => dispatch => {
  const queryParamsString = qs.stringify({
    page,
    s: sort,
    q: {
      name_ilike: filter,
    },
    date_from: dateFrom,
    with_bots: withBots,
  });

  axios
    .get(`/api/v1/users?${queryParamsString}`)
    .then(({ data }) => {
      dispatch(actions.updateUsersRatingPage(camelizeKeys(data)));
      dispatch(actions.finishStoreInit());
    })
    .catch(error => {
      dispatch(actions.setError(error));
    });
};

export default loadUserStats;
