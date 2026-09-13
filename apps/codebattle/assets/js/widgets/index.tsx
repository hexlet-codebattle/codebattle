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
  SoundToggleMenu,
  TournamentThreejsStreamPage,
  TournamentStreamAdminPage,
  TournamentAdminPage,
  TournamentPage,
  TournamentPlayerPage,
  UserPage,
  AdminPage,
} from './App';
import { withMantine } from './ui/withMantine';

const Heatmap = React.lazy(() => import('./pages/profile/Heatmap'));

const renderRoot = (domElement: HTMLElement, node: React.ReactNode) =>
  createRoot(domElement).render(withMantine(node));

export const renderEventPage = (domElement: HTMLElement) => renderRoot(domElement, <EventPage />);
export const renderGroupTournamentPage = (domElement: HTMLElement) =>
  renderRoot(domElement, <GroupTournamentPage />);
export const renderGameWidget = (domElement: HTMLElement) => renderRoot(domElement, <Game />);
export const renderGameThreejsPage = (domElement: HTMLElement) =>
  renderRoot(domElement, <GameThreejsPage />);
export const renderGameMlPage = (domElement: HTMLElement) => renderRoot(domElement, <GameMlPage />);
export const renderHeatmapWidget = (domElement: HTMLElement) => renderRoot(domElement, <Heatmap />);
export const renderInvitesWidget = (domElement: HTMLElement) => renderRoot(domElement, <Invites />);
export const renderMainChannelWidget = (domElement: HTMLElement) =>
  renderRoot(domElement, <MainChannel />);
export const renderLobby = (domElement: HTMLElement) => renderRoot(domElement, <Lobby />);
export const renderOnlineWidget = (domElement: HTMLElement) => renderRoot(domElement, <Online />);
export const renderRegistrationPage = (domElement: HTMLElement) =>
  renderRoot(domElement, <RegistrationPage />);
export const renderSettingPage = (domElement: HTMLElement) =>
  renderRoot(domElement, <SettingsPage />);
export const renderSoundToggle = (domElement: HTMLElement) =>
  renderRoot(domElement, <SoundToggleMenu />);
export const renderTournamentThreejsStreamPage = (domElement: HTMLElement) =>
  renderRoot(domElement, <TournamentThreejsStreamPage />);
export const renderTournamentStreamAdminPage = (domElement: HTMLElement) =>
  renderRoot(domElement, <TournamentStreamAdminPage />);
export const renderTournamentAdminPage = (domElement: HTMLElement) =>
  renderRoot(domElement, <TournamentAdminPage />);
export const renderTournamentPage = (domElement: HTMLElement) =>
  renderRoot(domElement, <TournamentPage />);
export const renderTournamentPlayerPage = (domElement: HTMLElement) =>
  renderRoot(domElement, <TournamentPlayerPage />);
export const renderUserPage = (domElement: HTMLElement) => renderRoot(domElement, <UserPage />);
export const renderAdminPage = (domElement: HTMLElement) => renderRoot(domElement, <AdminPage />);
