defmodule CodebattleWeb.Tournament.ImageController do
  use CodebattleWeb, :controller
  use Gettext, backend: CodebattleWeb.Gettext

  import CodebattleWeb.OgImage,
    only: [esc: 1, chip: 1, chip: 2, avatar: 1, grade_cup: 1, level_color: 1, level_label: 1]

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias CodebattleWeb.HtmlImage
  alias CodebattleWeb.OgImage

  @shown_players 5

  def show(conn, %{"id" => id}) do
    case Tournament.Context.get(id) do
      nil ->
        send_resp(conn, :ok, "")

      tournament ->
        players_count = Helpers.players_count(tournament)
        locale = Gettext.get_locale(CodebattleWeb.Gettext)
        cache_key = "t_#{id}_#{tournament.state}_#{players_count}_#{locale}"
        HtmlImage.render_image(conn, cache_key, prepare_image_html(tournament, players_count))
    end
  end

  defp prepare_image_html(tournament, players_count) do
    body = """
    <div class="info">
      <div class="kicker mono">#{type_label(tournament.type)}</div>
      <div class="title display">#{esc(tournament.name)}</div>
      #{starts_line(tournament)}
    </div>
    <div class="crowd">
      #{grade_cup(tournament.grade)}
      <div class="count display gold">#{players_count}</div>
      <div class="count-label mono">#{gettext("Players")}</div>
      #{faces(tournament)}
    </div>
    """

    OgImage.page(body, chips(tournament), css())
  end

  defp type_label("ladder"), do: gettext("Ladder tournament")
  defp type_label(_type), do: gettext("Swiss tournament")

  defp starts_line(%{state: state, starts_at: %DateTime{} = starts_at})
       when state in ["upcoming", "waiting_participants"] do
    ~s(<div class="when mono">#{gettext("Starts")} #{Calendar.strftime(starts_at, "%d %b %Y · %H:%M")} UTC</div>)
  end

  defp starts_line(_tournament), do: ""

  # The podium once there are winners, otherwise the first few players.
  defp faces(tournament) do
    players =
      case tournament.winner_ids do
        [_ | _] = ids -> tournament |> Helpers.get_players(Enum.take(ids, 3)) |> Enum.reject(&is_nil/1)
        _ -> tournament |> Helpers.get_players() |> Enum.reject(&Map.get(&1, :is_bot)) |> Enum.take(@shown_players)
      end

    if players == [] do
      ""
    else
      ~s(<div class="faces">#{Enum.map_join(players, "", &avatar/1)}</div>)
    end
  end

  defp chips(tournament) do
    Enum.reject(
      [
        state_chip(tournament.state),
        tournament.task_provider == "level" && level_chip(tournament.level),
        tournament.grade not in [nil, "open"] && chip(grade_label(tournament.grade)),
        tournament.state in ["upcoming", "waiting_participants"] && chip(gettext("Join") <> " →", class: "cta push")
      ],
      &(&1 in [nil, false])
    )
  end

  defp grade_label(grade),
    do: Gettext.gettext(CodebattleWeb.Gettext, grade |> String.replace("_", " ") |> String.capitalize())

  defp level_chip(level) when level in [nil, ""], do: nil
  defp level_chip(level), do: chip(level_label(level), dot: level_color(level))

  defp state_chip("upcoming"), do: chip(gettext("Upcoming"), dot: "#4dabf7")
  defp state_chip("waiting_participants"), do: chip(gettext("Registration is open"), dot: "#e0bf7a")
  defp state_chip("active"), do: chip("LIVE", dot: "#ff5252", class: "live")
  defp state_chip("finished"), do: chip(gettext("Finished"), dot: "#51cf66")
  defp state_chip(state) when state in ["timeout", "canceled"], do: chip(gettext("Canceled"), dot: "#868e96")
  defp state_chip(_state), do: nil

  defp css do
    """
    main { gap: 56px; }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
    .kicker { font-size: 24px; font-weight: 700; color: #e0bf7a; letter-spacing: 0.12em; text-transform: uppercase; }
    .title {
      font-size: 76px;
      line-height: 1.05;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
    }
    .when { font-size: 26px; color: rgba(244, 234, 210, 0.7); }
    .crowd {
      width: 330px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 30px 0 36px;
      border-radius: 32px;
      border: 1px solid rgba(224, 191, 122, 0.3);
      background: radial-gradient(circle at 50% 30%, rgba(224, 191, 122, 0.12), rgba(224, 191, 122, 0.03) 70%);
    }
    .crowd .cup { width: 104px; height: 104px; margin-bottom: 14px; }
    .count { font-size: 96px; line-height: 1; }
    .count-label { font-size: 24px; color: rgba(244, 234, 210, 0.6); letter-spacing: 0.1em; text-transform: uppercase; }
    .faces { display: flex; margin-top: 26px; padding-left: 18px; }
    .faces .avatar {
      width: 72px;
      height: 72px;
      margin-left: -18px;
      border-radius: 50%;
      border: 3px solid #000;
      font-size: 34px;
    }
    .push { margin-left: auto; }
    """
  end
end
