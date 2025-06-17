import React from 'react';

import { createRoot } from 'react-dom/client';

import {
  Builder,
  Game,
  Online,
  Invites,
  Lobby,
  RegistrationPage,
  SettingsPage,
  StairwayGamePage,
  TournamentPage,
  TournamentAdminPage,
  EventPage,
  TournamentPlayerPage,
  UserPage,
  UsersRating,
  StreamPage,
} from './App';

const Heatmap = React.lazy(() => import('./pages/profile/Heatmap'));

export const renderBuilderWidget = domElement => createRoot(domElement).render(<Builder />);
export const renderGameWidget = domElement => createRoot(domElement).render(<Game />);
export const renderHeatmapWidget = domElement => createRoot(domElement).render(<Heatmap />);
export const renderOnlineWidget = domElement => createRoot(domElement).render(<Online />);
export const renderInvitesWidget = domElement => createRoot(domElement).render(<Invites />);
export const renderLobby = domElement => createRoot(domElement).render(<Lobby />);
export const renderRegistrationPage = domElement => createRoot(domElement).render(<RegistrationPage />);
export const renderSettingPage = domElement => createRoot(domElement).render(<SettingsPage />);
export const renderStairwayGamePage = domElement => createRoot(domElement).render(<StairwayGamePage />);
export const renderTournamentPage = domElement => createRoot(domElement).render(<TournamentPage />);
export const renderTournamentAdminPage = domElement => createRoot(domElement).render(<TournamentAdminPage />);
export const renderEventPage = domElement => createRoot(domElement).render(<EventPage />);
export const renderTournamentPlayerPage = domElement => createRoot(domElement).render(<TournamentPlayerPage />);
export const renderUserPage = domElement => createRoot(domElement).render(<UserPage />);
export const renderUsersRating = domElement => createRoot(domElement).render(<UsersRating />);
export const renderStreamPage = domElement => createRoot(domElement).render(<StreamPage />);

