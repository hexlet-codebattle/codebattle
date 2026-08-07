import React from 'react';

import { render, screen } from '@testing-library/react';

import Card from '../widgets/components/Card';
import EditorLoading from '../widgets/components/EditorLoading';
import GameLevelBadge from '../widgets/components/GameLevelBadge';
import InfoMessage from '../widgets/components/InfoMessage';
import Loading from '../widgets/components/Loading';
import LobbyLoading from '../widgets/pages/lobby/LobbyLoading';
import MessageTimestamp from '../widgets/components/MessageTimestamp';
import Messages from '../widgets/components/Messages';
import PlayerLoading from '../widgets/components/PlayerLoading';
import SystemMessage from '../widgets/components/SystemMessage';
import Timer from '../widgets/components/Timer';

import { MantineTestProvider } from './helpers/mantine';

vi.mock('../widgets/utils/useTimer', () => ({
  default: () => ['01:02:03', 3723],
}));

vi.mock('../widgets/utils/useStayScrolled', () => ({
  default: () => ({ stayScrolled: vi.fn(), scrollBottom: vi.fn() }),
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
    render(
      <MantineTestProvider>
        <InfoMessage text="The tournament has started" />
      </MantineTestProvider>,
    );

    expect(screen.getByText('The tournament has started')).toBeInTheDocument();
  });

  test('renders the requested loading size', () => {
    render(
      <MantineTestProvider>
        <Loading small />
      </MantineTestProvider>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
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
    const { container } = render(
      <MantineTestProvider>
        <EditorLoading loading />
      </MantineTestProvider>,
    );

    const overlay = container.querySelector('.cb-loading-background');

    expect(overlay).toHaveClass('d-flex', 'cb-loading-background');
    expect(overlay).not.toHaveClass('d-none');
  });

  test('renders a small player loading indicator', () => {
    render(<PlayerLoading show small />);

    expect(screen.getByRole('status')).toHaveStyle({ width: '30px', height: '30px' });
    expect(screen.getByRole('status')).not.toHaveClass('invisible');
  });

  test('renders a local message timestamp', () => {
    render(
      <MantineTestProvider>
        <MessageTimestamp time={0} />
      </MantineTestProvider>,
    );

    expect(screen.getByText(/\d{2}:\d{2} [AP]M/)).toBeInTheDocument();
  });

  test('renders chat messages as semantic list items', () => {
    render(
      <MantineTestProvider>
        <Messages messages={[{ id: 1, text: 'Connected', type: 'system' }]} />
      </MantineTestProvider>,
    );

    const list = screen.getByRole('list');

    expect(list).toHaveClass('list-unstyled');
    expect(list.children).toHaveLength(1);
    expect(list.firstElementChild).toHaveRole('listitem');
  });

  test('renders system message status styling', () => {
    render(
      <MantineTestProvider>
        <SystemMessage text="Unable to join the game" meta={{ status: 'error' }} />
      </MantineTestProvider>,
    );

    expect(screen.getByText('Unable to join the game')).toBeInTheDocument();
  });

  test('renders card content with its title', () => {
    render(
      <MantineTestProvider>
        <Card title="Tournament rules">
          <p>Win as many games as possible.</p>
        </Card>
      </MantineTestProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Tournament rules' })).toBeInTheDocument();
    expect(screen.getByText('Win as many games as possible.')).toBeInTheDocument();
  });
});
