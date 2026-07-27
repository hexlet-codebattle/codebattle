import React from 'react';

import { createRoot } from 'react-dom/client';

import {
  EventPage,
  GroupTournamentPage,
  Game,
  GameMlPage,
  GameThreejsPage,
  Invites,
  MainChannel,
  Lobby,
  Online,
  RegistrationPage,
  SettingsPage,
  TournamentThreejsStreamPage,
  TournamentStreamAdminPage,
  TournamentAdminPage,
  TournamentPage,
  TournamentPlayerPage,
  UserPage,
  UsersRating,
  AdminPage,
} from './App';

const Heatmap = React.lazy(() => import('./pages/profile/Heatmap'));

export const renderEventPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<EventPage />);
export const renderGroupTournamentPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<GroupTournamentPage />);
export const renderGameWidget = (domElement: HTMLElement) =>
  createRoot(domElement).render(<Game />);
export const renderGameThreejsPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<GameThreejsPage />);
export const renderGameMlPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<GameMlPage />);
export const renderHeatmapWidget = (domElement: HTMLElement) =>
  createRoot(domElement).render(<Heatmap />);
export const renderInvitesWidget = (domElement: HTMLElement) =>
  createRoot(domElement).render(<Invites />);
export const renderMainChannelWidget = (domElement: HTMLElement) =>
  createRoot(domElement).render(<MainChannel />);
export const renderLobby = (domElement: HTMLElement) => createRoot(domElement).render(<Lobby />);
export const renderOnlineWidget = (domElement: HTMLElement) =>
  createRoot(domElement).render(<Online />);
export const renderRegistrationPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<RegistrationPage />);
export const renderSettingPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<SettingsPage />);
export const renderTournamentThreejsStreamPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentThreejsStreamPage />);
export const renderTournamentStreamAdminPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentStreamAdminPage />);
export const renderTournamentAdminPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentAdminPage />);
export const renderTournamentPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentPage />);
export const renderTournamentPlayerPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentPlayerPage />);
export const renderUserPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<UserPage />);
export const renderUsersRating = (domElement: HTMLElement) =>
  createRoot(domElement).render(<UsersRating />);
export const renderAdminPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<AdminPage />);
