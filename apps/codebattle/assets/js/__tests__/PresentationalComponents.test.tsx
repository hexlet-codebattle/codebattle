import React from 'react';

import { render, screen } from '@testing-library/react';

import Card from '../widgets/components/Card';
import EditorLoading from '../widgets/components/EditorLoading';
import GameLevelBadge from '../widgets/components/GameLevelBadge';
import InfoMessage from '../widgets/components/InfoMessage';
import Loading from '../widgets/components/Loading';
import LobbyLoading from '../widgets/pages/lobby/LobbyLoading';
import MessageTimestamp from '../widgets/components/MessageTimestamp';
import PlayerLoading from '../widgets/components/PlayerLoading';
import SystemMessage from '../widgets/components/SystemMessage';
import Timer from '../widgets/components/Timer';

vi.mock('../widgets/utils/useTimer', () => ({
  default: () => ['01:02:03', 3723],
}));

describe('presentational components', () => {
  test('renders a game level badge', () => {
    render(<GameLevelBadge level="easy" />);

    expect(screen.getByRole('img', { name: 'easy' })).toHaveAttribute(
      'src',
      '/assets/images/levels/easy.svg',
    );
  });

  test('renders an informational message', () => {
    render(<InfoMessage text="The tournament has started" />);

    expect(screen.getByText('The tournament has started')).toBeInTheDocument();
  });

  test('renders the requested loading size', () => {
    render(<Loading small />);

    expect(screen.getByRole('status')).toHaveStyle({ width: '30px', height: '30px' });
  });

  test('renders the lobby loading shell', () => {
    const { container } = render(<LobbyLoading />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(screen.getByText('Preparing your arena')).toBeInTheDocument();
    expect(container.querySelectorAll('.cb-text-skeleton')).toHaveLength(18);
  });

  test('renders the timer duration', () => {
    render(<Timer time="2026-07-13T12:00:00Z" />);

    expect(screen.getByText('01:02:03')).toBeInTheDocument();
  });

  test('shows the editor loading overlay when requested', () => {
    const { container } = render(<EditorLoading loading />);

    expect(container.firstElementChild).toHaveClass('d-flex', 'cb-loading-background');
    expect(container.firstElementChild).not.toHaveClass('d-none');
  });

  test('renders a small player loading indicator', () => {
    render(<PlayerLoading show small />);

    expect(screen.getByRole('status')).toHaveStyle({ width: '30px', height: '30px' });
    expect(screen.getByRole('status')).not.toHaveClass('invisible');
  });

  test('renders a local message timestamp', () => {
    render(<MessageTimestamp time={0} />);

    expect(screen.getByText(/\d{2}:\d{2} [AP]M/)).toHaveClass('text-muted');
  });

  test('renders system message status styling', () => {
    render(<SystemMessage text="Unable to join the game" meta={{ status: 'error' }} />);

    expect(screen.getByText('Unable to join the game')).toHaveClass('text-danger');
  });

  test('renders card content with its title', () => {
    render(
      <Card title="Tournament rules">
        <p>Win as many games as possible.</p>
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Tournament rules' })).toBeInTheDocument();
    expect(screen.getByText('Win as many games as possible.')).toBeInTheDocument();
  });
});
