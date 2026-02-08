defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  import Ecto.Query, warn: false

  alias Codebattle.Game
  alias Codebattle.PremiumRequest
  alias Codebattle.User
  alias Codebattle.User.Achievements
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
      stats: %{all: []},
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

  def stats(conn, %{"id" => id}) do
    %{user: user, active_game_id: active_game_id, achievements: achievements, metrics: metrics} =
      get_achievements_payload(id)

    json(conn, %{
      active_game_id: active_game_id,
      stats: %{all: []},
      metrics: metrics,
      user: user,
      achievements: achievements
    })
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
    game_stats = build_metrics_from_achievements(achievements).game_stats
    json(conn, %{stats: game_stats})
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

  defp build_metrics_from_achievements(achievements) do
    game_stats =
      achievements
      |> Enum.find(%{}, &(&1.type == "game_stats"))
      |> Map.get(:meta, %{})
      |> Map.take(["won", "lost", "gave_up"])
      |> Map.merge(%{"won" => 0, "lost" => 0, "gave_up" => 0}, fn _k, v, _ -> v end)

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
      tournaments_stats: tournaments_stats
    }
  end

  defp get_achievements_payload(id) do
    user = User.get!(id)
    active_game_id = Game.Context.get_active_game_id(id)
    achievements = Achievements.get_user_achievements(id)
    metrics = build_metrics_from_achievements(achievements)

    %{
      user: user,
      active_game_id: active_game_id,
      achievements: achievements,
      metrics: metrics
    }
  end
end
