import axios from 'axios';
import { camelizeKeys } from 'humps';
import qs from 'qs';
import { updateUsersRatingPage, updateUsersStats } from '../actions';

export const loadUserStats = (dispatch) => async (user) => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/stats`);
    const data = camelizeKeys(response.data);
    dispatch(updateUsersStats(data));
  } catch (e) {
    console.log(e.message);
  }
};

export const getUsersRatingPage = (page = 1, filter = '') => (dispatch) => {
  const queryParamsString = qs.stringify({
    page,
    filter,
  });

  axios.get(`/api/v1/users?${queryParamsString}`)
    .then(({ data }) => {
      dispatch(updateUsersRatingPage(camelizeKeys(data)));
    });
};

export default loadUserStats;
