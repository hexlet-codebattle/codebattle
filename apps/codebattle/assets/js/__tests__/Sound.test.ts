import sound, { configureSound } from '../widgets/lib/sound';

const howlerMocks = vi.hoisted(() => ({
  howl: vi.fn(),
  play: vi.fn(),
  stop: vi.fn(),
  volume: vi.fn(),
}));

vi.mock('howler', () => ({
  Howl: function Howl(options: unknown) {
    howlerMocks.howl(options);

    return {
      play: howlerMocks.play,
      volume: howlerMocks.volume,
    };
  },
  Howler: {
    stop: howlerMocks.stop,
    volume: howlerMocks.volume,
  },
}));

vi.mock('@/inertia/pageProps', () => ({
  getPageProp: () => ({
    sound_settings: {
      type: 'standard',
      level: 5,
    },
  }),
}));

describe('game sound settings', () => {
  beforeEach(() => {
    localStorage.clear();
    howlerMocks.howl.mockClear();
    howlerMocks.play.mockClear();
    howlerMocks.volume.mockClear();
  });

  test('uses newly saved sound settings without a page reload', () => {
    configureSound({ type: 'cs', level: 7, tournamentLevel: 3 });

    sound.play('win');

    const options = howlerMocks.howl.mock.calls[0][0] as {
      src: string;
      volume: number;
    };

    expect(options.src).toBe('/assets/audio/audioSprites/csSpritesAudio.wav');
    expect(options.volume).toBeCloseTo(0.7);
    expect(howlerMocks.play).toHaveBeenCalledWith('win');
  });

  test('does not create a player for silent mode', () => {
    configureSound({ type: 'silent', level: 5 });

    sound.play('win');

    expect(howlerMocks.howl).not.toHaveBeenCalled();
    expect(howlerMocks.play).not.toHaveBeenCalled();
  });
});
