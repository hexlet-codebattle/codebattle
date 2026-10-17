defmodule CodebattleWeb.Game.ImageController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  import CodebattleWeb.OgImage, only: [esc: 1, chip: 2, avatar: 1, level_color: 1, level_label: 1]

  alias Codebattle.Game.Context
  alias CodebattleWeb.HtmlImage
  alias CodebattleWeb.OgImage

  plug(:put_layout, html: false)

  def show(conn, %{"game_id" => id}) do
    case Context.fetch_game(id) do
      {:ok, game} ->
        locale = Gettext.get_locale(CodebattleWeb.Gettext)
        cache_key = "g_#{id}_#{game.state}_#{length(game.players)}_#{locale}"
        HtmlImage.render_image(conn, cache_key, prepare_image_html(game))

      {:error, _reason} ->
        send_resp(conn, :ok, "")
    end
  end

  defp prepare_image_html(game) do
    {left, right} = sides(game)

    body = """
    <div class="arena">
      #{left}
      <div class="vs display">VS</div>
      #{right}
    </div>
    """

    OgImage.page(body, chips(game), css())
  end

  defp sides(%{players: [player1, player2 | _]} = game), do: {player(player1, game), player(player2, game)}
  defp sides(%{players: [player]} = game), do: {player(player, game), empty_seat(game)}
  defp sides(game), do: {empty_seat(game), empty_seat(game)}

  defp player(player, game) do
    status =
      cond do
        game.state == "game_over" and player.result == "won" -> "winner"
        game.state == "game_over" -> "loser"
        true -> ""
      end

    rating = if is_integer(player.rating), do: "#{player.rating} · ", else: ""

    """
    <div class="side #{status}">
      #{if status == "winner", do: ~s(<div class="badge display">#{gettext("Winner")}</div>), else: ""}
      #{avatar(player)}
      <div class="name display ellipsis">#{esc(player.name)}</div>
      <div class="meta mono">#{rating}#{esc(player.lang)}</div>
    </div>
    """
  end

  defp empty_seat(%{state: "waiting_opponent"}) do
    """
    <div class="side seat">
      <div class="avatar avatar-empty display">?</div>
      <div class="name display">#{gettext("You?")}</div>
      <div class="meta mono">#{gettext("Free seat")}</div>
    </div>
    """
  end

  defp empty_seat(_game) do
    """
    <div class="side seat">
      <div class="avatar avatar-empty display">?</div>
    </div>
    """
  end

  defp chips(game) do
    Enum.reject(
      [
        state_chip(game),
        level_chip(game.level),
        game.timeout_seconds && chip(gettext("%{count} min", count: div(game.timeout_seconds, 60)), icon: :clock),
        game.tournament_id && chip(gettext("Tournament"), icon: :trophy),
        game.state == "waiting_opponent" && chip(gettext("Join the battle") <> " →", class: "cta push")
      ],
      &(&1 in [nil, false])
    )
  end

  defp level_chip(level) when level in [nil, ""], do: nil
  defp level_chip(level), do: chip(level_label(level), dot: level_color(level))

  defp state_chip(%{state: "waiting_opponent"}), do: chip(gettext("Waiting for an opponent"), dot: "#e0bf7a")
  defp state_chip(%{state: "playing"}), do: chip("LIVE", dot: "#ff5252", class: "live")
  defp state_chip(%{state: "game_over"}), do: chip(gettext("Finished"), dot: "#51cf66")
  defp state_chip(%{state: "timeout"}), do: chip(gettext("Time is up"), dot: "#868e96")
  defp state_chip(%{state: "canceled"}), do: chip(gettext("Canceled"), dot: "#868e96")
  defp state_chip(_game), do: nil

  defp css do
    """
    .arena {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 200px 1fr;
      align-items: center;
    }
    .side { display: flex; flex-direction: column; align-items: center; gap: 14px; min-width: 0; position: relative; }
    .name { max-width: 440px; font-size: 50px; line-height: 1.1; margin-top: 8px; }
    .meta { font-size: 26px; color: rgba(244, 234, 210, 0.6); }
    .vs {
      text-align: center;
      font-size: 112px;
      transform: skewX(-10deg);
      background: linear-gradient(180deg, #ff6b6b, #db0000);
      -webkit-background-clip: text;
      color: transparent;
      filter: drop-shadow(0 0 30px rgba(219, 0, 0, 0.55));
    }
    .winner .avatar { border-color: #e0bf7a; box-shadow: 0 0 60px rgba(224, 191, 122, 0.5); }
    .badge {
      position: absolute;
      top: -22px;
      z-index: 1;
      padding: 6px 18px;
      border-radius: 14px;
      background: linear-gradient(180deg, #fff0c8, #e0bf7a 55%, #b8903c);
      color: #14110a;
      box-shadow: 0 0 20px rgba(224, 191, 122, 0.5);
      font-size: 22px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .loser { opacity: 0.55; }
    .loser .avatar { filter: grayscale(1); }
    .avatar-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      border: 4px dashed rgba(224, 191, 122, 0.4);
      background: rgba(224, 191, 122, 0.04);
      font-size: 110px;
      color: rgba(224, 191, 122, 0.6);
    }
    .seat .name { color: rgba(244, 234, 210, 0.8); }
    .push { margin-left: auto; }
    """
  end
end
