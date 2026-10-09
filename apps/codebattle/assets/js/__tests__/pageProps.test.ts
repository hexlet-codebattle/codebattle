import { getPageProp } from '@/inertia/pageProps';

describe('initial page props', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('reads the Inertia v3 script payload', () => {
    document.body.innerHTML = `
      <div id="app"></div>
      <script data-page="app" type="application/json">{"props":{"game_id":71}}</script>
    `;

    expect(getPageProp('game_id')).toBe(71);
  });

  test('falls back to the legacy data-page attribute', () => {
    const app = document.createElement('div');
    app.id = 'app';
    app.dataset.page = JSON.stringify({ props: { game_id: 42 } });
    document.body.appendChild(app);

    expect(getPageProp('game_id')).toBe(42);
  });
});
