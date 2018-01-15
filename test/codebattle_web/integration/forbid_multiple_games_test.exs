defmodule Codebattle.ForbidMultipleGamesTest do
  use Codebattle.IntegrationCase

  import Mock

  alias Codebattle.GameProcess.Server
  alias Codebattle.GameProcess.FsmHelpers
  alias CodebattleWeb.GameChannel



  test "User cannot create second game", %{conn: conn} do
    # Create game
    insert(:task)
    user = insert(:user)

    conn = conn
           |> put_session(:user_id, user.id)
           |> get(user_path(conn, :index))

    get(conn, page_path(conn, :index))
    conn = post(conn, game_path(conn, :create))
    conn = post(conn, game_path(conn, :create))

    assert Repo.all(Game) |> Enum.count == 1
  end
end
