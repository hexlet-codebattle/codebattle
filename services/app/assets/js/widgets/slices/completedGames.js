import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { camelizeKeys } from 'humps';
// import { initialState } from './user';

export const fetchCompletedGames = createAsyncThunk(
  'completedGames/fetchCompletedGames',
  async () => {
    const userId = window.location.pathname.split('/').pop();
    const response = await axios.get(
      `/api/v1/user/${userId}/completed_games?page_size=20`
    );
    // тут нужен роут для всех юзеров вместе взятых
    // можно нужно использовать готовые данные - болванки вместо userId
    // в этом слайсе нужно добавить второй функционал по добыванию общих данных
    // скопировать себе json и вставлять в качестве ответа

    // перенаправить все запросы на обновление комплитед геймз - список динамический - нужно
    // научиться перенаправлять эти данные в слайс комплитед геймз
    return camelizeKeys(data);
  },
);

export const loadNextPage = createAsyncThunk(
  'completedGames/loadNextPage',
  async (page) => {
    const userId = window.location.pathname.split('/').pop();

    // общее кол-во игр; page - какая страница из полного списка
    // page - позиция полного списка ( отчасти абстракция )

    const response = await axios.get(
      `/api/v1/user/${userId}/completed_games?page_size=20&page=${page}`
    );
    console.log('RESPONSE DATA COMPLETED GAMES', response.data);

    return camelizeKeys(response.data);
  }
);

const completedGames = createSlice({
  name: 'completedGames',
  initialState: {
    completedGames: [],
    nextPage: null,
    totalPages: null,
    status: 'empty',
    error: null,
  },
  reducers: {
    initFirstCompletedGames: (state, { payload: { game } }) => {
      // console.log('payload initFirstCompletedGames', payload);
      state.completedGames = [game, ...state.completedGames];
      // должен сохранить первый комплитед геймз из payload;
      // после чего должен инициализировать nextPage = 0 и totalPage = 20;
      // пишем этот редюсер для мидллвары Lobby - services/app/assets/js/widgets/middlewares/Lobby.js
    },
    gameFinish: (state, { payload: { game } }) => {
      // также для миддлаввары Lobby - с сокетом gameFinish
      // игра завершилась - нужно добавить в список complitedGames
    },
  },
  extraReducers: {
    [fetchCompletedGames.pending]: (state) => {
      state.status = 'loading';
      state.error = null;
    },
    [fetchCompletedGames.fulfilled]: (state, { payload }) => {
      // console.log('PAYLOAD', payload)
      state.status = 'loaded';
      state.completedGames = payload.games;
      state.totalPages = payload.pageInfo.totalPages;
      state.nextPage = payload.pageInfo.pageNumber + 1;
    },
    [fetchCompletedGames.rejected]: (state, action) => {
      state.status = 'rejected';
      state.error = action.error;
    },
    [loadNextPage.pending]: (state) => {
      state.status = 'loading';
      state.error = null;
    },
    [loadNextPage.fulfilled]: (state, { payload }) => {
      state.status = 'loaded';
      state.nextPage += 1;
      state.completedGames = state.completedGames.concat(payload.games);
    },
    [loadNextPage.rejected]: (state, action) => {
      state.status = 'rejected';
      state.error = action.error;
    },
  },
});

const { actions, reducer } = completedGames;
export { actions };
export default reducer;
