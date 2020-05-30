import React from 'react';
import { render } from 'react-dom';
import { Game, Lobby, UsersRating } from './App';
import Heatmap from './containers/Heatmap';

export const renderGameWidget = domElement => render(<Game />, domElement);
export const renderLobby = domElement => render(<Lobby />, domElement);
export const renderHeatmapWidget = domElement => render(<Heatmap />, domElement);
export const renderUsersRating = domElement => render(<UsersRating />, domElement);
