import React from 'react';
import { render } from 'react-dom';
import GameWidget from './containers/GameWidget';

export default (domElement) => { render(<GameWidget />, domElement); };

