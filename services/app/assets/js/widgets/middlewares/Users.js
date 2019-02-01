import axios from 'axios';
import { updateUsersStats } from '../actions';

export const loadUserStats = dispatch => (user) => {
  axios.get(`/api/v1/user/${user.id}/stats`)
    .then((response) => {
      const { stats, user_id: userId } = response.data;
      dispatch(updateUsersStats({ stats, userId }));
    });
};

export default loadUserStats;
