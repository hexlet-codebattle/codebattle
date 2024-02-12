defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.PremiumRequest
  alias Codebattle.User
  alias Codebattle.User.Stats
  alias CodebattleWeb.Api.UserView

  import Ecto.Query, warn: false

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

    case Codebattle.Oauth.User.create_in_firebase(user_attrs) do
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

  def stats(conn, %{"id" => id}) do
    game_stats = Stats.get_game_stats(id)
    user = User.get!(id)

    json(conn, %{stats: game_stats, user: user})
  end

  def simple_stats(conn, %{"id" => id}) do
    game_stats = Stats.get_game_stats(id)
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
end
