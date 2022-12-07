import React from 'react';
import { render } from 'react-dom';
import {
  Game, Lobby, UsersRating, UserPage, ChartPage, SettingsPage, RegistrationPage, Invites, StairwayGamePage, TournamentPage,
} from './App';
import Heatmap from './containers/Heatmap';

export const renderInvitesWidget = domElement => render(<Invites />, domElement);
export const renderGameWidget = domElement => render(<Game />, domElement);
export const renderLobby = domElement => render(<Lobby />, domElement);
export const renderHeatmapWidget = domElement => render(<Heatmap />, domElement);
export const renderUsersRating = domElement => render(<UsersRating />, domElement);
export const renderUserPage = domElement => render(<UserPage />, domElement);
export const renderChartPage = domElement => render(<ChartPage />, domElement);
export const renderSettingPage = domElement => render(<SettingsPage />, domElement);
export const renderRegistrationPage = domElement => render(<RegistrationPage />, domElement);
export const renderStairwayGamePage = domElement => render(<StairwayGamePage />, domElement);
export const renderTournamentPage = domElement => render(<TournamentPage />, domElement);
