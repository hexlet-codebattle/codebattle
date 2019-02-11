import axios from 'axios';
import { updateUsersStats } from '../actions';

export const loadUserStats = dispatch => (user) => {
  axios.get(`/api/v1/user/${user.id}/stats`)
    .then((response) => {
      const { stats, user_id: userId, achievements } = response.data;
      dispatch(updateUsersStats({ stats, userId, achievements }));
    });
};

export default loadUserStats;
