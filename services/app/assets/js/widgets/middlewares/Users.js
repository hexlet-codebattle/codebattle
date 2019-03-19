import axios from 'axios';
import { updateUsersRatingPage, updateUsersStats } from '../actions';

export const loadUserStats = dispatch => (user) => {
  axios.get(`/api/v1/user/${user.id}/stats`)
    .then((response) => {
      const { stats, user_id: userId, achievements } = response.data;
      dispatch(updateUsersStats({ stats, userId, achievements }));
    });
};

export const getUsersRatingPage = page => (dispatch) => {
  axios.get(`/api/v1/users/${page}`)
    .then((response) => {
      dispatch(updateUsersRatingPage(response.data));
    });
};

export default loadUserStats;
