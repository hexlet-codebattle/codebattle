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

    post conn, "/games"

    assert Repo.aggregate(Game, :count, :id) == 1
  end

  test "POST /games create Game server", %{conn: conn} do
    user = User.changeset(%User{}, %{name: "first", email: "test@test.test", github_id: 1})
    user = Repo.insert!(user)
    conn = assign(conn, :user, user)

    post conn, "/games"

    query = Ecto.Query.from(e in Game, limit: 1)
    game = Repo.one(query)

    fsm = Play.Server.fsm(game.id)

    assert fsm.state == :waiting_opponent
    assert fsm.data.first_player.name == "first"
    assert fsm.data.second_player == nil
  end

  test "POST /games/:id/join  Join to game", %{conn: conn} do
    first = User.changeset(%User{}, %{name: "first", email: "first@test.test", github_id: 1})
    first = Repo.insert!(first)

    second = User.changeset(%User{}, %{name: "second", email: "second@test.test", github_id: 2})
    second = Repo.insert!(second)

    conn = assign(conn, :user, first)
    post conn, "/games"

    game = Repo.one(Ecto.Query.from(e in Game, limit: 1))
    conn = assign(build_conn(), :user, second)
    post conn, "/games/#{game.id}/join"

    fsm = Play.Server.fsm(game.id)

    assert fsm.state == :playing
    assert fsm.data.first_player.name == "first"
    assert fsm.data.second_player.name == "second"
    assert fsm.data.winner == nil
  end

  test "POST /games/:id/check Check game", %{conn: conn} do
    first = User.changeset(%User{}, %{name: "first", email: "first@test.test", github_id: 1})
    first = Repo.insert!(first)
    first = Repo.get(User, first.id)

    second = User.changeset(%User{}, %{name: "second", email: "second@test.test", github_id: 2})
    second = Repo.insert!(second)
    second = Repo.get(User, second.id)

    conn = assign(conn, :user, first)
    post conn, "/games"

    game = Repo.one(Ecto.Query.from(e in Game, limit: 1))
    conn = assign(build_conn(), :user, second)
    post conn, "/games/#{game.id}/join"

    conn = assign(build_conn(), :user, first)
    post conn, "/games/#{game.id}/check"

    fsm = Play.Server.fsm(game.id)

    assert fsm.state == :player_won
    assert fsm.data.first_player.name == "first"
    assert fsm.data.second_player.name == "second"
    assert fsm.data.winner.name == "first"
    assert fsm.data.game_over == false

    conn = assign(build_conn(), :user, second)
    post conn, "/games/#{game.id}/check"

    game = Repo.get(Game, game.id)
    first = Repo.get(User, first.id)
    second = Repo.get(User, second.id)

    assert game.state == "game_over"
    assert first.raiting == 101
    assert second.raiting == 99
  end
end
