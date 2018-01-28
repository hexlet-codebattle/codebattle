import React from 'react';
import { render } from 'react-dom';
import './vendors'
import { Game, Lobby } from './App';

export const renderGameWidget = domElement => render(<Game />, domElement);
export const renderLobby = domElement => render(<Lobby />, domElement);

