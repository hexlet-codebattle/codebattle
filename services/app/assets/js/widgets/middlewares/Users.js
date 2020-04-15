import axios from 'axios';
import { camelizeKeys } from 'humps';
import qs from 'qs';
import {
  updateUsersRatingPage, updateUsersStats, setUserInfo, finishStoreInit,
} from '../actions';

export const loadUser = dispatch => async user => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/info`);
    const data = camelizeKeys(response.data);
    dispatch(setUserInfo(data));
  } catch (e) {
    console.log(e.message);
  }
};

export const loadUserStats = dispatch => async user => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/stats`);
    const data = camelizeKeys(response.data);
    dispatch(updateUsersStats(data));
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
      dispatch(updateUsersRatingPage(camelizeKeys(data)));
      dispatch(finishStoreInit());
    });
};

export default loadUserStats;
