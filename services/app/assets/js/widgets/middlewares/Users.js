import axios from 'axios';
import qs from 'qs';
import { updateUsersRatingPage, updateUsersStats } from '../actions';

export const loadUserStats = (dispatch) => async (user) => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/stats`);
    const { stats, user_id: userId, achievements } = response.data;
    dispatch(updateUsersStats({ stats, userId, achievements }));
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
      dispatch(updateUsersRatingPage(data));
    });
};

export default loadUserStats;
