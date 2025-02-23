defmodule CodebattleWeb.Game.ImageController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  alias Codebattle.Game.Context
  alias Codebattle.Game.Player
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
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background: #f5f7fa;
            font-family: 'Helvetica Neue', Arial, sans-serif;
          }
          p {
            margin: 0;
            padding: 0;
          }
          .card {
            width: 100%;
            height: 100%;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .header {
            background: #000;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #fff;
            text-align: center;
          }
          .header img {
            width: 100px;
            margin: 15px;
            height: auto;
          }
          .content {
            flex: 1;
            padding: 10px;
            color: #333;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #fff;
            padding: 8px;
            background: #000;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <img src="#{HtmlImage.logo_url()}" alt="Logo">
          </div>
          <div class="content">
            #{render_content(game)}
          </div>
          <div class="footer">
            <p>
              Made with
              <svg width="14" height="14" viewBox="0 0 24 24" style="fill:#ff5252; vertical-align:middle;">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42
                         4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81
                         14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4
                         6.86-8.55 11.54L12 21.35z"/>
              </svg>
              by Codebattle
            </p>
          </div>
        </div>
      </body>
    </html>
    """
  end

  defp render_content(game) do
    level = Gettext.gettext(CodebattleWeb.Gettext, "Level: #{game.level}")
    state = Gettext.gettext(CodebattleWeb.Gettext, "Game state: #{game.state}")

    # If you always have exactly two players:
    [player1, player2] =
      case game.players do
        [p1, p2] -> [p1, p2]
        [p1] -> [p1, %Player{}]
        [] -> [%Player{}, %Player{}]
      end

    """
    <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
      <div style="
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        max-width: 800px;
        width: 100%;
        margin: 0 auto;
        align-items: center;
        text-align: center;
      ">
        <!-- Player 1 -->
        <div style="justify-self: end;">
          #{render_player(player1)}
        </div>

        <!-- VS -->
        <div style="justify-self: center; font-size: 42px; margin: 20px;">
          VS
        </div>

        <!-- Player 2 -->
        <div style="justify-self: start;">
          #{render_player(player2)}
        </div>
      </div>
      <p>#{state}</p>
      <p>#{level}</p>
    </div>
    """
  end

  defp render_player(player) do
    result = Gettext.gettext(CodebattleWeb.Gettext, "#{player.result}")

    """
    <div>
      <img src="#{player.avatar_url || HtmlImage.logo_url()}" style="width:46px; height:46px;">
      <p>@#{player.name}(#{player.rating}) - #{player.lang}</p>
      <p>#{result}</p>
    </div>
    """
  end
end
