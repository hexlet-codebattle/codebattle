import React from 'react';

import { createRoot } from 'react-dom/client';

import {
  Builder,
  EventPage,
  Game,
  HallOfFamePage,
  Invites,
  Lobby,
  Online,
  RegistrationPage,
  SettingsPage,
  StairwayGamePage,
  StreamPage,
  TournamentAdminPage,
  TournamentPage,
  TournamentPlayerPage,
  TournamentsSchedulePage,
  UserPage,
  UsersRating,
} from './App';

const Heatmap = React.lazy(() => import('./pages/profile/Heatmap'));

export const renderBuilderWidget = domElement => createRoot(domElement).render(<Builder />);
export const renderEventPage = domElement => createRoot(domElement).render(<EventPage />);
export const renderGameWidget = domElement => createRoot(domElement).render(<Game />);
export const renderHeatmapWidget = domElement => createRoot(domElement).render(<Heatmap />);
export const renderInvitesWidget = domElement => createRoot(domElement).render(<Invites />);
export const renderLobby = domElement => createRoot(domElement).render(<Lobby />);
export const renderOnlineWidget = domElement => createRoot(domElement).render(<Online />);
export const renderRegistrationPage = domElement => createRoot(domElement).render(<RegistrationPage />);
export const renderSettingPage = domElement => createRoot(domElement).render(<SettingsPage />);
export const renderStairwayGamePage = domElement => createRoot(domElement).render(<StairwayGamePage />);
export const renderStreamPage = domElement => createRoot(domElement).render(<StreamPage />);
export const renderHallOfFame = domElement => createRoot(domElement).render(<HallOfFamePage />);
export const renderTournamentAdminPage = domElement => createRoot(domElement).render(<TournamentAdminPage />);
export const renderTournamentPage = domElement => createRoot(domElement).render(<TournamentPage />);
export const renderTournamentPlayerPage = domElement => createRoot(domElement).render(<TournamentPlayerPage />);
export const renderTournamentsSchedule = domElement => createRoot(domElement).render(<TournamentsSchedulePage />);
export const renderUserPage = domElement => createRoot(domElement).render(<UserPage />);
export const renderUsersRating = domElement => createRoot(domElement).render(<UsersRating />);
