import React from 'react';

import { createRoot } from 'react-dom/client';

import {
  EventPage,
  GroupTournamentPage,
  Game,
  GameMlPage,
  GameThreejsPage,
  HallOfFamePage,
  HeadToHeadPage,
  Invites,
  MainChannel,
  Lobby,
  Online,
  RegistrationPage,
  SeasonsPage,
  SeasonShowPage,
  TaskPreviewPage,
  SettingsPage,
  StairwayGamePage,
  StreamPage,
  TournamentThreejsStreamPage,
  TournamentStreamAdminPage,
  TournamentAdminPage,
  TournamentPage,
  TournamentEditPage,
  TournamentIndexPage,
  TournamentPlayerPage,
  TournamentsSchedulePage,
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
export const renderStairwayGamePage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<StairwayGamePage />);
export const renderStreamPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<StreamPage />);
export const renderTournamentThreejsStreamPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentThreejsStreamPage />);
export const renderTournamentStreamAdminPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentStreamAdminPage />);
export const renderHallOfFame = (domElement: HTMLElement) =>
  createRoot(domElement).render(<HallOfFamePage />);
export const renderHeadToHeadPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<HeadToHeadPage />);
export const renderSeasonsPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<SeasonsPage />);
export const renderSeasonShowPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<SeasonShowPage />);
export const renderTaskPreviewPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TaskPreviewPage />);
export const renderTournamentAdminPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentAdminPage />);
export const renderTournamentPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentPage />);
export const renderTournamentEditPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentEditPage />);
export const renderTournamentIndexPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentIndexPage />);
export const renderTournamentPlayerPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentPlayerPage />);
export const renderTournamentsSchedule = (domElement: HTMLElement) =>
  createRoot(domElement).render(<TournamentsSchedulePage />);
export const renderUserPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<UserPage />);
export const renderUsersRating = (domElement: HTMLElement) =>
  createRoot(domElement).render(<UsersRating />);
export const renderAdminPage = (domElement: HTMLElement) =>
  createRoot(domElement).render(<AdminPage />);
