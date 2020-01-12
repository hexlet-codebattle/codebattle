defmodule Codebattle.Tournament.TeamTest do
  use Codebattle.IntegrationCase, async: false

  import CodebattleWeb.Factory
  alias Codebattle.Tournament.Helpers

  test "#create success" do
    {:ok, result} =
      Helpers.create(%{
        "type" => "team",
        "creator_id" => 1,
        "name" => "name",
        "starts_at_type" => "5_min"
      })

    assert result.state == "waiting_participants"
  end

  test "#join" do
    tournament = insert(:team_tournament)
    user = insert(:user)

    new_tournament = Helpers.join(tournament, user, 1)

    assert Enum.count(new_tournament.data.players) == 1
  end

  test "#start!" do
    user = insert(:user)

    player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user))

    tournament = insert(:team_tournament, creator_id: user.id, data: %{players: [player]})

    new_tournament =
      Helpers.join(tournament, user)
      |> Helpers.start!(user)

    assert new_tournament.state == "active"
    assert Enum.count(new_tournament.data.players) == 2
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
