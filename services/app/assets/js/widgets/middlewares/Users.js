import axios from 'axios';
import { updateUsersStats } from '../actions';

export const loadUserStats = dispatch => async (user) => {
  try {
    const response = await axios.get(`/api/v1/user/${user.id}/stats`)
    const { stats, user_id: userId, achievements } = response.data;
    dispatch(updateUsersStats({ stats, userId, achievements }));
  } catch (e) {}
};

export default loadUserStats;
