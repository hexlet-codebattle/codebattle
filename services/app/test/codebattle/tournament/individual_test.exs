defmodule Codebattle.Tournament.IndividualTest do
  use Codebattle.IntegrationCase, async: false

  @module Codebattle.Tournament.Individual
  import Codebattle.Tournament.Helpers

  describe "starts a tournament with completed players_count" do
    test "when 1" do
      user = insert(:user)
      insert(:task, level: "elementary")

      player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user))

      tournament =
        insert(:tournament,
          state: "waiting_participants",
          creator_id: user.id,
          data: %{players: [player]},
          players_count: nil
        )

      new_tournament = @module.start(tournament, %{user: user})
      assert new_tournament.players_count == 2
      assert players_count(new_tournament) == 2
    end

    test "when 7" do
      user = insert(:user)
      insert(:task, level: "elementary")

      player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user))

      tournament =
        insert(:tournament,
          creator_id: user.id,
          state: "waiting_participants",
          data: %{players: List.duplicate(player, 7)},
          players_count: nil
        )

      new_tournament = @module.start(tournament, %{user: user})
      assert new_tournament.players_count == 8
      assert players_count(new_tournament) == 8
    end

    test "when players_count" do
      user = insert(:user)
      insert(:task, level: "elementary")

      player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user))

      tournament =
        insert(:tournament,
          creator_id: user.id,
          state: "waiting_participants",
          data: %{players: List.duplicate(player, 3)},
          players_count: 16
        )

      new_tournament = @module.start(tournament, %{user: user})
      assert new_tournament.players_count == 16
      assert players_count(new_tournament) == 16
    end
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

    new_tournament = @module.update_match(tournament, game_id, %{state: "canceled"})

    states = new_tournament.data.matches |> Enum.map(fn x -> x.state end)

    assert states == ["canceled", "active"]
  end

  test "#update_match, user gave_up" do
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
      @module.update_match(tournament, game_id, %{
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
      @module.update_match(tournament, game_id, %{
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
      |> @module.maybe_start_new_step()

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
      records: [
        %{"type" => "init", "id" => 2, "editor_text" => "", "editor_lang" => "ruby"},
        %{
          "diff" => %{"delta" => [%{"insert" => "t"}], "next_lang" => "ruby", "time" => 20},
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 1}, %{"insert" => "e"}],
            "next_lang" => "ruby",
            "time" => 20
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{
          "diff" => %{
            "delta" => [%{"retain" => 2}, %{"insert" => "s"}],
            "next_lang" => "ruby",
            "time" => 20
          },
          "type" => "update_editor_data",
          "id" => 2
        },
        %{"type" => "game_over", "id" => 2, "lang" => "ruby"}
      ]
    }

    insert(:playbook, %{data: playbook_data, task: task, winner_lang: "ruby"})
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
      |> @module.maybe_start_new_step()

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
      |> @module.maybe_start_new_step()

    assert new_tournament.state == "finished"
  end
end
