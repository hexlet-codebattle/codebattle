defmodule CodebattleWeb.GameControllerTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.Game
  alias Codebattle.User

  test "GET /games", %{conn: conn} do
    user = User.changeset(%User{}, %{name: "test_name", email: "test@test.test", github_id: 1})
    user = Repo.insert!(user)
    conn = assign(conn, :user, user)

    conn = get conn, "/games"
    assert html_response(conn, 200) =~ "Create game"
  end

  test "POST /games create Game in db", %{conn: conn} do
    user = User.changeset(%User{}, %{name: "test_name", email: "test@test.test", github_id: 1})
    user = Repo.insert!(user)
    conn = assign(conn, :user, user)

    conn = post conn, "/games"

    assert Repo.aggregate(Game, :count, :id) == 1
  end

  test "POST /games create Game server", %{conn: conn} do
    user = User.changeset(%User{}, %{name: "test_name", email: "test@test.test", github_id: 1})
    user = Repo.insert!(user)
    conn = assign(conn, :user, user)

    conn = post conn, "/games"

    query = Ecto.Query.from(e in Game, limit: 1)
    game = Repo.one(query)
    assert Enum.count(:gproc.lookup_pids({:n, :l, {:game, game.id }})) == 1
  end

  test "POST /games show", %{conn: conn} do
    # TODO POST /games show
  end
end
