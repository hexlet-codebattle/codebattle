defmodule Codebattle.Tournament.HelpersTest do
  use CodebattleWeb.ConnCase, async: true

  import CodebattleWeb.Factory
  alias Codebattle.Tournament.Helpers

  test "#create success" do
    {:ok, result} =
      Helpers.create(%{"creator_id" => 1, "name" => "name", "starts_at_type" => "5_min"})

    assert result.state == "waiting_participants"
  end

  test "#create unprocessable" do
    {:error, result} = Helpers.create(%{})

    assert result.valid? == false
  end

  test "#join" do
    tournament = insert(:tournament)
    user = insert(:user)

    new_tournament = Helpers.join(tournament, user)

    assert Enum.count(new_tournament.data.players) == 1
  end

  test "#join idempotent" do
    tournament = insert(:tournament)
    user = insert(:user)

    Helpers.join(tournament, user)
    Helpers.join(tournament, user)
    new_tournament = Helpers.join(tournament, user)

    assert Enum.count(new_tournament.data.players) == 1
  end

  test "#join only in waiting_participants" do
    tournament = insert(:tournament, state: "active")
    user = insert(:user)

    Helpers.join(tournament, user)
    Helpers.join(tournament, user)
    new_tournament = Helpers.join(tournament, user)

    assert Enum.empty?(new_tournament.data.players)
  end

  test "#leave" do
    user = insert(:user)
    player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user))
    tournament = insert(:tournament, data: %{players: [player]})

    new_tournament = Helpers.leave(tournament, user)

    assert Enum.empty?(new_tournament.data.players)
  end

  test "#leave idempotent" do
    user = insert(:user)
    player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user))
    tournament = insert(:tournament, data: %{players: [player]})

    Helpers.leave(tournament, user)
    new_tournament = Helpers.leave(tournament, user)

    assert Enum.empty?(new_tournament.data.players)
  end

  test "#cancel!" do
    user = insert(:user)
    tournament = insert(:tournament, creator_id: user.id)

    new_tournament = Helpers.cancel!(tournament, user)

    assert new_tournament.state == "canceled"
  end

  test "#cancel! checks creator" do
    user = insert(:user)
    tournament = insert(:tournament)

    new_tournament = Helpers.cancel!(tournament, user)

    assert new_tournament.state == "waiting_participants"
  end

  test "#start! checks creator" do
    user = insert(:user)
    tournament = insert(:tournament)

    new_tournament = Helpers.start!(tournament, user)
    assert new_tournament.state == "waiting_participants"
  end

  test "#start!" do
    user = insert(:user)
    player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user))

    tournament =
      insert(:tournament, creator_id: user.id, data: %{players: [player]}, players_count: 16)

    new_tournament = Helpers.start!(tournament, user)

    assert new_tournament.state == "active"
    assert Enum.count(new_tournament.data.players) == new_tournament.players_count
    assert Enum.count(new_tournament.data.matches) == 8
  end
end
