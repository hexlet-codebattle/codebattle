import axios from 'axios';
import { camelizeKeys } from 'humps';
import qs from 'qs';
import { actions } from '../slices';

export const loadUser = dispatch => async user => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/info`);
    const data = camelizeKeys(response.data);
    dispatch(actions.setUserInfo(data));
  } catch (e) {
    console.log(e.message);
  }
};

export const loadUserStats = dispatch => async user => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/stats`);
    const data = camelizeKeys(response.data);
    dispatch(actions.updateUsersStats(data));
  } catch (e) {
    console.log(e.message);
  }
};

export const getUsersRatingPage = (page = 1, filter = '', sort = '') => dispatch => {
  const queryParamsString = qs.stringify({
    page,
    s: sort,
    q: {
      name_ilike: filter,
    },
  });

  axios.get(`/api/v1/users?${queryParamsString}`)
    .then(({ data }) => {
      dispatch(actions.updateUsersRatingPage(camelizeKeys(data)));
      dispatch(actions.finishStoreInit());
    });
};

export default loadUserStats;
