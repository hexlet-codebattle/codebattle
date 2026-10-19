defmodule CodebattleWeb.HeadToHead.ImageController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  import CodebattleWeb.OgImage, only: [esc: 1, chip: 2, avatar: 1]

  alias Codebattle.Game.Context
  alias CodebattleWeb.HtmlImage
  alias CodebattleWeb.OgImage

  plug(:put_layout, html: false)

  def show(conn, %{"user_id" => user_id, "opponent_id" => opponent_id}) do
    head_to_head = Context.fetch_head_to_head_page_data(user_id, opponent_id)
    locale = Gettext.get_locale(CodebattleWeb.Gettext)
    # Include the score and player details so new results and profile edits refresh the card.
    fingerprint = head_to_head |> Map.delete(:games) |> :erlang.phash2()
    cache_key = "h2h_#{user_id}_#{opponent_id}_#{fingerprint}_#{locale}"

    HtmlImage.render_image(conn, cache_key, prepare_image_html(head_to_head))
  end

  defp prepare_image_html(%{players: [first, second]} = head_to_head) do
    body = """
    <div class="arena">
      #{player(first, head_to_head.winner_id)}
      <div class="scoreboard">
        <div class="label mono">HEAD TO HEAD</div>
        <div class="score display gold">#{first.wins} : #{second.wins}</div>
        <div class="label mono">#{gettext("Wins")}</div>
      </div>
      #{player(second, head_to_head.winner_id)}
    </div>
    """

    chips = [
      chip("H2H", icon: :trophy),
      chip("#{gettext("Games")}: #{head_to_head.total_games}", []),
      chip("#{gettext("Draws")}: #{head_to_head.draws}", [])
    ]

    OgImage.page(body, chips, css())
  end

  defp player(player, winner_id) do
    """
    <div class="side #{if player.id == winner_id, do: "leader", else: ""}">
      #{avatar(player)}
      <div class="name display ellipsis">#{esc(player.name)}</div>
      <div class="meta mono">#{esc(player.rating)} · #{esc(player.lang)}</div>
    </div>
    """
  end

  defp css do
    """
    .arena { width: 100%; display: grid; grid-template-columns: 1fr 300px 1fr; align-items: center; gap: 20px; }
    .side { display: flex; flex-direction: column; align-items: center; gap: 14px; min-width: 0; }
    .name { max-width: 100%; font-size: 42px; line-height: 1.1; margin-top: 8px; }
    .meta { font-size: 24px; color: rgba(244, 234, 210, 0.6); }
    .leader .avatar { border-color: #e0bf7a; box-shadow: 0 0 60px rgba(224, 191, 122, 0.5); }
    .scoreboard { text-align: center; }
    .score { font-size: 76px; line-height: 1.4; white-space: nowrap; }
    .label { font-size: 22px; color: rgba(244, 234, 210, 0.65); letter-spacing: 0.06em; }
    """
  end
end
