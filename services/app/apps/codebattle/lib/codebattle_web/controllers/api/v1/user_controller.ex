defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  import Ecto.Query, warn: false

  alias Codebattle.Game
  alias Codebattle.PremiumRequest
  alias Codebattle.SeasonResult
  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.User
  alias Codebattle.User.Achievements
  alias Codebattle.User.Stats, as: UserStats
  alias CodebattleWeb.Api.UserView

  def index(conn, params) do
    payload = UserView.render_rating(params)

    json(conn, payload)
  end

  def show(conn, %{"id" => id}) do
    user = User.get!(id)

    json(conn, %{user: user})
  end

  def create(conn, params) do
    user_attrs = %{
      name: params["name"],
      email: params["email"],
      password: params["password"]
    }

    case Codebattle.Auth.User.create_in_firebase(user_attrs) do
      {:ok, user} ->
        conn
        |> put_session(:user_id, user.id)
        |> json(%{status: :created})

      {:error, errors} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: errors})
    end
  end

  def stats(conn, %{"id" => "0"}) do
    user = User.build_guest()

    json(conn, %{
      stats: %{games: %{"won" => 0, "lost" => 0, "gave_up" => 0}, all: []},
      season_results: [],
      metrics: %{
        game_stats: %{"won" => 0, "lost" => 0, "gave_up" => 0},
        language_stats: %{},
        tournaments_stats: %{
          "rookie_wins" => 0,
          "challenger_wins" => 0,
          "pro_wins" => 0,
          "elite_wins" => 0,
          "masters_wins" => 0,
          "grand_slam_wins" => 0
        }
      },
      user: user,
      achievements: []
    })
  end

  def stats(conn, %{"id" => id}) do
    %{
      user: user,
      active_game_id: active_game_id,
      achievements: achievements,
      metrics: metrics,
      stats: stats,
      season_results: season_results
    } =
      get_achievements_payload(id, include_stats: true, include_season_results: true)

    json(conn, %{
      active_game_id: active_game_id,
      stats: stats,
      season_results: season_results,
      metrics: metrics,
      user: user,
      achievements: achievements
    })
  end

  def rivals(conn, %{"id" => "0"}) do
    json(conn, %{top_rivals: []})
  end

  def rivals(conn, %{"id" => id}) do
    json(conn, %{top_rivals: UserStats.get_top_rivals(String.to_integer(id))})
  end

  def achievements(conn, %{"id" => "0"}) do
    user = User.build_guest()

    json(conn, %{
      active_game_id: nil,
      metrics: %{
        game_stats: %{"won" => 0, "lost" => 0, "gave_up" => 0},
        tournaments_stats: %{
          "rookie_wins" => 0,
          "challenger_wins" => 0,
          "pro_wins" => 0,
          "elite_wins" => 0,
          "masters_wins" => 0,
          "grand_slam_wins" => 0
        }
      },
      user: user,
      achievements: []
    })
  end

  def achievements(conn, %{"id" => id}) do
    payload = get_achievements_payload(id)
    json(conn, payload)
  end

  def nearby_users(conn, _) do
    nearby_users = User.get_nearby_users(conn.assigns.current_user)
    json(conn, %{users: nearby_users})
  end

  def simple_stats(conn, %{"id" => id}) do
    achievements = Achievements.get_user_achievements(id)

    game_stats =
      build_metrics_from_achievements(achievements, UserStats.get_game_stats(id)).game_stats

    json(conn, %{stats: game_stats})
  end

  def tournaments(conn, %{"id" => "0"}) do
    json(conn, %{
      tournaments: [],
      page_info: %{page_number: 1, page_size: 20, total_entries: 0, total_pages: 1}
    })
  end

  def tournaments(conn, %{"id" => id} = params) do
    page_number =
      params
      |> Map.get("page", "1")
      |> String.to_integer()

    page_size =
      params
      |> Map.get("page_size", "20")
      |> String.to_integer()

    result = TournamentUserResult.get_user_history(id, page_number, page_size)
    total_pages = max(div(result.total_entries + page_size - 1, page_size), 1)

    page_info =
      result
      |> Map.take([:page_number, :page_size, :total_entries])
      |> Map.put(:total_pages, total_pages)

    json(conn, %{tournaments: result.entries, page_info: page_info})
  end

  def send_premium_request(conn, %{"id" => user_id, "status" => status}) do
    PremiumRequest.upsert_premium_request!(String.to_integer(user_id), status)
    json(conn, %{})
  end

  def premium_requests(conn, _params) do
    requests = PremiumRequest.all()

    json(conn, %{
      requests: requests,
      yes_count: get_requests_count_by_status(requests, "yes"),
      no_count: get_requests_count_by_status(requests, "no")
    })
  end

  def current(conn, _) do
    current_user = conn.assigns.current_user

    json(conn, %{id: current_user.id})
  end

  def get_requests_count_by_status(requests, status) do
    requests
    |> Enum.filter(&(&1.status == status))
    |> Enum.uniq_by(& &1.user_id)
    |> Enum.count()
  end

  defp build_metrics_from_achievements(achievements, stats) do
    achievement_game_stats =
      achievements
      |> Enum.find(%{}, &(&1.type == "game_stats"))
      |> Map.get(:meta, %{})
      |> Map.take(["won", "lost", "gave_up"])
      |> Map.merge(%{"won" => 0, "lost" => 0, "gave_up" => 0}, fn _k, v, _v2 -> v end)

    game_stats =
      if map_size(achievement_game_stats) > 0 do
        achievement_game_stats
      else
        Map.merge(%{"won" => 0, "lost" => 0, "gave_up" => 0}, stats.games, fn _k, _v1, v2 ->
          v2
        end)
      end

    language_stats =
      stats.all
      |> Enum.group_by(& &1.lang, & &1.count)
      |> Map.new(fn {lang, counts} -> {lang, Enum.sum(counts)} end)

    tournaments_stats =
      achievements
      |> Enum.find(%{}, &(&1.type == "tournaments_stats"))
      |> Map.get(:meta, %{})
      |> Map.take([
        "rookie_wins",
        "challenger_wins",
        "pro_wins",
        "elite_wins",
        "masters_wins",
        "grand_slam_wins"
      ])
      |> Map.merge(
        %{
          "rookie_wins" => 0,
          "challenger_wins" => 0,
          "pro_wins" => 0,
          "elite_wins" => 0,
          "masters_wins" => 0,
          "grand_slam_wins" => 0
        },
        fn _k, v, _ -> v end
      )

    %{
      game_stats: game_stats,
      language_stats: language_stats,
      tournaments_stats: tournaments_stats
    }
  end

  defp get_achievements_payload(id) do
    get_achievements_payload(id, include_stats: false)
  end

  defp get_achievements_payload(id, opts) do
    include_stats = Keyword.get(opts, :include_stats, false)
    include_season_results = Keyword.get(opts, :include_season_results, false)
    user = User.get!(id)
    active_game_id = Game.Context.get_active_game_id(id)
    stats = UserStats.get_game_stats(id)
    achievements = Achievements.get_user_achievements(id)
    metrics = build_metrics_from_achievements(achievements, stats)

    payload = %{
      user: user,
      active_game_id: active_game_id,
      achievements: achievements,
      metrics: metrics
    }

    payload =
      if include_stats do
        Map.put(payload, :stats, stats)
      else
        payload
      end

    if include_season_results do
      Map.put(payload, :season_results, SeasonResult.get_by_user_history(user.id))
    else
      payload
    end
  end
end
