import React from 'react';
import ReactDOM from 'react-dom';
import GameView from './views/Game';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<GameView />, div);
  ReactDOM.unmountComponentAtNode(div);
});
