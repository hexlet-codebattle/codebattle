defmodule Codebattle.ForbidMultipleGamesTest do
  use Codebattle.IntegrationCase

  import Mock

  alias Codebattle.GameProcess.Server
  alias Codebattle.GameProcess.FsmHelpers
  alias CodebattleWeb.GameChannel

  setup do
    insert(:task)
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    conn1 = assign(build_conn(), :user, user1)

    socket1 = socket("user_id", %{user_id: user1.id, current_user: user1})
    {:ok, %{conn1: conn1, socket1: socket1, user1: user1}}
  end

  test "User cannot create second game", %{conn1: conn1, socket1: socket1, user1: user1} do
    # Create game
    conn = post(conn1, game_path(conn1, :create))
    conn = post(conn1, game_path(conn1, :create))

    assert Repo.all(Game) |> Enum.count == 1
  end
end
