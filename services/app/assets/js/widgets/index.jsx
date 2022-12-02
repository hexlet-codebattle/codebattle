import React from 'react';
import { createRoot } from 'react-dom/client';
import {
 Game, Lobby, UsersRating, UserPage, SettingsPage, RegistrationPage, Invites, StairwayGamePage, TournamentPage,
} from './App';
import Heatmap from './containers/Heatmap';

export const renderInvitesWidget = domElement =>  createRoot(domElement).render(<Invites />);
export const renderGameWidget = domElement => createRoot(domElement).render(<Game />);
export const renderLobby = domElement => createRoot(domElement).render(<Lobby />);
export const renderHeatmapWidget = domElement => createRoot(domElement).render(<Heatmap />);
export const renderUsersRating = domElement => createRoot(domElement).render(<UsersRating />);
export const renderUserPage = domElement => createRoot(domElement).render(<UserPage />);
export const renderSettingPage = domElement => createRoot(domElement).render(<SettingsPage />);
export const renderRegistrationPage = domElement => createRoot(domElement).render(<RegistrationPage />);
export const renderStairwayGamePage = domElement => createRoot(domElement).render(<StairwayGamePage />);
export const renderTournamentPage = domElement => createRoot(domElement).render(<TournamentPage />);
