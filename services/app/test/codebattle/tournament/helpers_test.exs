defmodule Codebattle.Tournament.HelpersTest do
  use Codebattle.IntegrationCase, async: false

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
    insert_pair(:task, level: "elementary")
    task = insert(:task, level: "elementary")

    playbook_data = %{
      playbook: [
        %{"delta" => [%{"insert" => "t"}], "time" => 20},
        %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 20},
        %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 20},
        %{"lang" => "ruby", "time" => 100}
      ]
    }

    insert(:bot_playbook, %{data: playbook_data, task: task, lang: "ruby"})

    player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user))

    tournament =
      insert(:tournament, creator_id: user.id, data: %{players: [player]}, players_count: 16)

    new_tournament =
      Helpers.join(tournament, user)
      |> Helpers.start!(user)

    assert new_tournament.state == "active"
    assert Enum.count(new_tournament.data.players) == new_tournament.players_count
    assert Enum.count(new_tournament.data.matches) == 8

    assert new_tournament.data.matches
           |> Enum.filter(fn x -> x.state == "active" end)
           |> Enum.count() == 8

    assert new_tournament.data.matches |> Enum.filter(fn x -> x.game_id end) |> Enum.count() == 8
  end

  test "#update_match, state canceled" do
    user1 = insert(:user)
    user2 = insert(:user)

    player1 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user1))
    player2 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user2))
    game_id = 1

    tournament =
      insert(:tournament,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: [
            %{state: "active", game_id: game_id, players: [player1, player2]},
            %{state: "active", game_id: 2, players: []}
          ]
        },
        players_count: 16
      )

    new_tournament = Helpers.update_match(tournament, game_id, %{state: "canceled"})

    states = new_tournament.data.matches |> Enum.map(fn x -> x.state end)

    assert states == ["canceled", "active"]
  end

  test "#update_match, user gave_up]" do
    user1 = insert(:user)
    user2 = insert(:user)

    player1 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user1))
    player2 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user2))
    game_id = 1

    tournament =
      insert(:tournament,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: [
            %{state: "active", game_id: game_id, players: [player1, player2]},
            %{state: "active", game_id: 2, players: []}
          ]
        },
        players_count: 16
      )

    new_tournament =
      Helpers.update_match(tournament, game_id, %{
        state: "finished",
        winner: {user1.id, "won"},
        loser: {user2.id, "gave_up"}
      })

    assert new_tournament.data.matches |> Enum.map(fn x -> x.state end) == ["finished", "active"]

    assert new_tournament.data.matches
           |> List.first()
           |> Map.get(:players)
           |> Enum.map(fn x -> {x.id, x.game_result} end) ==
             [{user1.id, "won"}, {user2.id, "gave_up"}]
  end

  test "#update_match, user lost" do
    user1 = insert(:user)
    user2 = insert(:user)

    player1 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user1))
    player2 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user2))
    game_id = 1

    tournament =
      insert(:tournament,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: [
            %{state: "active", game_id: game_id, players: [player1, player2]},
            %{state: "active", game_id: 2, players: []}
          ]
        },
        players_count: 16
      )

    new_tournament =
      Helpers.update_match(tournament, game_id, %{
        state: "finished",
        winner: {user1.id, "lost"},
        loser: {user2.id, "won"}
      })

    assert new_tournament.data.matches |> Enum.map(fn x -> x.state end) == ["finished", "active"]

    assert new_tournament.data.matches
           |> List.first()
           |> Map.get(:players)
           |> Enum.map(fn x -> {x.id, x.game_result} end) ==
             [{user1.id, "lost"}, {user2.id, "won"}]
  end

  test "#maybe_start_new_step do not calls next step" do
    user1 = insert(:user)
    user2 = insert(:user)

    player1 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user1))
    player2 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user2))

    matches = %{state: "finished", game_id: 2, players: [player1, player2]} |> List.duplicate(7)

    tournament =
      insert(:tournament,
        step: 0,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches ++ [%{state: "active", game_id: 3, players: [player1, player2]}]
        },
        players_count: 16
      )

    new_tournament =
      tournament
      |> Helpers.maybe_start_new_step()

    assert new_tournament.step == 0

    states = new_tournament.data.matches |> Enum.map(fn x -> x.state end)

    assert states == [
             "finished",
             "finished",
             "finished",
             "finished",
             "finished",
             "finished",
             "finished",
             "active"
           ]
  end

  test "#maybe_start_new_step calls next step" do
    user1 = insert(:user)
    user2 = insert(:user)

    insert_pair(:task, level: "elementary")
    task = insert(:task, level: "elementary")

    playbook_data = %{
      playbook: [
        %{"delta" => [%{"insert" => "t"}], "time" => 20},
        %{"delta" => [%{"retain" => 1}, %{"insert" => "e"}], "time" => 20},
        %{"delta" => [%{"retain" => 2}, %{"insert" => "s"}], "time" => 20},
        %{"lang" => "ruby", "time" => 100}
      ]
    }

    insert(:bot_playbook, %{data: playbook_data, task: task, lang: "ruby"})
    player1 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user1))
    player2 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user2))

    matches = %{state: "finished", game_id: 2, players: [player1, player2]} |> List.duplicate(8)

    tournament =
      insert(:tournament,
        step: 0,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches
        },
        players_count: 16
      )

    new_tournament =
      tournament
      |> Helpers.maybe_start_new_step()

    assert new_tournament.step == 1

    states = new_tournament.data.matches |> Enum.map(fn x -> x.state end)

    assert states == [
             "finished",
             "finished",
             "finished",
             "finished",
             "finished",
             "finished",
             "finished",
             "finished",
             "active",
             "active",
             "active",
             "active"
           ]
  end

  test "#maybe_start_new_step finishs tournament" do
    user1 = insert(:user)
    user2 = insert(:user)

    player1 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user1))
    player2 = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user2))

    matches = %{state: "finished", game_id: 2, players: [player1, player2]} |> List.duplicate(12)

    tournament =
      insert(:tournament,
        step: 3,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches
        },
        players_count: 16
      )

    new_tournament =
      tournament
      |> Helpers.maybe_start_new_step()

    assert new_tournament.state == "finished"
  end
end
