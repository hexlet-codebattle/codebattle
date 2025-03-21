defmodule CodebattleWeb.Game.ImageController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  alias Codebattle.Game.Context
  alias CodebattleWeb.HtmlImage

  def show(conn, %{"game_id" => id}) do
    case Context.fetch_game(id) do
      {:ok, game} ->
        cache_key = "g_#{id}_#{game.state}"
        html = prepare_image_html(game)
        HtmlImage.render_image(conn, cache_key, html)

      {:error, _reason} ->
        send_resp(conn, :ok, "")
    end
  end

  defp prepare_image_html(game) do
    """
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          /* Force the entire card to be 800×500 */
          html, body {
            margin: 0;
            padding: 0;
            width: 780px;
            height: 441px;
            overflow: hidden; /* No scrolling; everything must fit */
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(to right, #222, #444);
            color: #fff;
            position: relative; /* So absolute footer can pin to bottom */
          }

          /* The main "battle" area takes up all space above the footer */
          .main {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 40px; /* Leaves room for the pinned footer */
            display: grid;
            grid-template-columns: 1fr auto 1fr; /* player1 | logo | player2 */
            align-items: center;
          }

          /* Player columns fill available vertical space */
          .player {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }

          .player img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          /* Overlay the player info at the bottom of each avatar */
          .player-info {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            background: rgba(0,0,0,0.5);
            padding: 5px;
            font-size: 1rem;
          }

          /* Center logo gets scaled as well, so keep it within its column */
          .center-logo {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
          }

          .center-logo img {
            max-width: 200px;
            max-height: 200px;
          }

          /* Pinned footer always visible at the bottom */
          .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            text-align: center;
            background: rgba(0, 0, 0, 0.2);
            font-size: 14px;
            line-height: 40px; /* Vertically center the text */
          }

          .heart-icon {
            fill: #ff5252;
            vertical-align: middle;
          }
        </style>
      </head>
      <body>
        <div class="main">
          #{render_game_preview(game)}
        </div>

        <div class="footer">
          Made with
          <svg class="heart-icon" width="14" height="14" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                     2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                     C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42
                     22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          by Codebattle
        </div>
      </body>
    </html>
    """
  end

  defp render_game_preview(%{players: [player]} = game) do
    level = Gettext.gettext(CodebattleWeb.Gettext, "Level: #{game.level}")
    state = Gettext.gettext(CodebattleWeb.Gettext, "Game state: #{game.state}")

    """
    <!-- Player 1 -->
    <div class="player">
      #{render_player(player)}
    </div>

    <!-- Center Logo -->
    <div class="center-logo">
      <img src="#{HtmlImage.logo_url()}" alt="Main Logo">
    </div>

    <!-- Game info -->
    <center>
    <h3>#{"Game info"}</h3>
    <p>#{state}</p>
    <p>#{level}</p>
    </center>
    """
  end

  defp render_game_preview(%{players: [player1, player2 | _]}) do
    """
    <!-- Player 1 -->
    <div class="player">
      #{render_player(player1)}
    </div>

    <!-- Center Logo -->
    <div class="center-logo">
      <img src="#{HtmlImage.logo_url()}" alt="Main Logo">
    </div>

    <!-- Player 2 -->
    <div class="player">
      #{render_player(player2)}
    </div>
    """
  end

  defp render_player(player) do
    result = Gettext.gettext(CodebattleWeb.Gettext, "#{player.result}")

    """
    <img src="#{player.avatar_url || HtmlImage.logo_url()}" alt="Player Avatar">
    <div class="player-info">
      @#{player.name}
      #{if player.rating && player.rating != "N/A", do: "(#{player.rating})", else: ""}
      #{player.lang}
      #{if player.result != "undefined", do: "- #{result}"}
    </div>
    """
  end
end
