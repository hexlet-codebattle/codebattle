defmodule CodebattleWeb.Api.V1.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.{Repo, User, User.Stats}
  alias CodebattleWeb.Api.GameView

  import Ecto.Query, warn: false

  def index(conn, params) do
    page_number =
      params
      |> Map.get("page", "1")
      |> String.to_integer()

    page_size =
      params
      |> Map.get("page_size", "50")
      |> String.to_integer()

    query = Codebattle.User.Scope.list_users(params)
    page = Repo.paginate(query, %{page: page_number, page_size: page_size})

    page_info = Map.take(page, [:page_number, :page_size, :total_entries, :total_pages])

    users =
      Enum.map(
        page.entries,
        fn user ->
          performance =
            if is_nil(user.rating) do
              nil
            else
              Kernel.round((user.rating - 1200) * 100 / (user.games_played + 1))
            end

          Map.put(user, :performance, performance)
        end
      )

    json(conn, %{
      users: users,
      page_info: page_info,
      date_from: Map.get(params, "date_from"),
      with_bots: Map.get(params, "with_bots")
    })
  end

  def show(conn, %{"id" => id}) do
    user = Repo.get(User, id)

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
    user = Repo.get(User, id)

    json(conn, %{stats: game_stats, user: user})
  end

  def current(conn, _) do
    current_user = conn.assigns.current_user

    json(conn, %{id: current_user.id})
  end
end
