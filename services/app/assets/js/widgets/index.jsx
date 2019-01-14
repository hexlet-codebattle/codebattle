import React from 'react';
import { render } from 'react-dom';
import { Game, Lobby } from './App';
import Heatmap from './containers/Heatmap';

export const renderGameWidget = domElement => render(<Game />, domElement);
export const renderLobby = domElement => render(<Lobby />, domElement);
export const renderHeatmapWidget = domElement => render(<Heatmap />, domElement);
