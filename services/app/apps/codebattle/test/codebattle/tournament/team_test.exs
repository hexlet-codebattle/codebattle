defmodule Codebattle.Tournament.TeamTest do
  use Codebattle.IntegrationCase, async: false

  alias Codebattle.Tournament.Helpers
  @module Codebattle.Tournament.Team

  def build_team_player(user, params \\ %{}) do
    struct(Codebattle.Tournament.Player, Map.from_struct(user)) |> Map.merge(params)
  end

  def get_matches_states(tournament), do: tournament.matches |> Enum.map(fn x -> x.state end)

  test ".maybe_start_new_step do not calls next step" do
    user1 = insert(:user)
    user2 = insert(:user)

    player1 = build_team_player(user1, %{team_id: 0})
    player2 = build_team_player(user2, %{team_id: 1})

    matches = [%{state: "game_over", game_id: 2, players: [player1, player2]}]

    tournament =
      insert(:team_tournament,
        step: 0,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches ++ [%{state: "playing", game_id: 3, players: [player1, player2]}]
        }
      )

    new_tournament =
      tournament
      |> @module.maybe_start_new_step()

    assert new_tournament.step == 0

    states = new_tournament.matches |> Enum.map(fn x -> x.state end)

    assert states == ["game_over", "playing"]
  end

  test ".maybe_start_new_step calls next step" do
    user1 = insert(:user)
    user2 = insert(:user)

    insert(:task, level: "elementary")

    player1 = build_team_player(user1, %{team_id: 0})
    player2 = build_team_player(user2, %{team_id: 1})

    matches = [%{state: "game_over", game_id: 2, players: [player1, player2]}]

    tournament =
      insert(:team_tournament,
        step: 0,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches
        }
      )

    new_tournament =
      tournament
      |> @module.maybe_start_new_step()

    assert new_tournament.step == 1

    states = get_matches_states(new_tournament)

    assert states == ["game_over", "playing"]
  end

  test ".maybe_start_new_step finishes tournament after 3 scores" do
    user1 = insert(:user)
    user2 = insert(:user)

    insert(:task, level: "elementary")

    player1 = build_team_player(user1, %{team_id: 0})
    player2 = build_team_player(user2, %{team_id: 1})

    matches = [
      %{
        round_id: 0,
        state: "game_over",
        players: [Map.merge(player1, %{result: "won"}), player2]
      },
      %{
        round_id: 1,
        state: "canceled",
        players: [Map.merge(player1, %{result: "won"}), player2]
      },
      %{
        round_id: 2,
        state: "timeout",
        players: [Map.merge(player1, %{result: "won"}), player2]
      }
    ]

    tournament =
      insert(:team_tournament,
        state: "active",
        step: 3,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches
        }
      )

    new_tournament =
      tournament
      |> @module.maybe_start_new_step()

    assert new_tournament.state == "finished"

    states = get_matches_states(new_tournament)

    assert states == ["game_over", "canceled", "timeout"]
  end

  test ".maybe_start_new_step finishes tournament after 3 scores with draws" do
    user1 = insert(:user)
    user2 = insert(:user)

    insert(:task, level: "elementary")

    player1 = build_team_player(user1, %{team_id: 0})
    player2 = build_team_player(user2, %{team_id: 1})

    matches = [
      %{
        round_id: 0,
        state: "game_over",
        players: [player1, player2]
      },
      %{
        round_id: 1,
        state: "game_over",
        players: [player1, player2]
      },
      %{
        round_id: 2,
        state: "game_over",
        players: [player1, player2]
      },
      %{
        round_id: 3,
        state: "game_over",
        players: [player1, player2]
      },
      %{
        round_id: 4,
        state: "game_over",
        players: [player1, player2]
      },
      %{
        round_id: 5,
        duration: 1,
        state: "game_over",
        players: [Map.merge(player1, %{result: "won"}), player2]
      }
    ]

    tournament =
      insert(:team_tournament,
        creator_id: user1.id,
        data: %{
          players: [player1, player2],
          matches: matches
        }
      )

    new_tournament =
      tournament
      |> @module.maybe_start_new_step()

    assert new_tournament.state == "finished"

    states = get_matches_states(new_tournament)

    assert states == [
             "game_over",
             "game_over",
             "game_over",
             "game_over",
             "game_over",
             "game_over"
           ]

    winner_stats = new_tournament |> Helpers.get_players_statistics() |> List.first()

    assert winner_stats.average_time == 1
    assert winner_stats.score == 1
  end

  test ".maybe_start_new_step builds matches using a consistent strategy" do
    user1 = insert(:user)
    user2 = insert(:user)
    user3 = insert(:user)
    user4 = insert(:user)
    user5 = insert(:user)
    user6 = insert(:user)

    insert(:task, level: "elementary")

    player1 = build_team_player(user1, %{team_id: 0})
    player2 = build_team_player(user2, %{team_id: 0})
    player3 = build_team_player(user3, %{team_id: 0})
    player4 = build_team_player(user4, %{team_id: 1})
    player5 = build_team_player(user5, %{team_id: 1})
    player6 = build_team_player(user6, %{team_id: 1})

    tournament =
      insert(:team_tournament,
        state: "active",
        creator_id: user1.id,
        data: %{players: [player1, player2, player3, player4, player5, player6]}
      )

    new_tournament = @module.maybe_start_new_step(tournament)

    player_ids =
      new_tournament
      |> Helpers.get_matches()
      |> Enum.map(fn match -> Enum.map(match.players, & &1.id) end)

    assert player_ids == [[user1.id, user4.id], [user2.id, user5.id], [user3.id, user6.id]]

    new_tournament = @module.cancel_all_matches(new_tournament)
    new_tournament = @module.maybe_start_new_step(new_tournament)

    player_ids =
      new_tournament
      |> Helpers.get_matches()
      |> Enum.map(fn match -> Enum.map(match.players, & &1.id) end)

    assert player_ids == [
             [user1.id, user4.id],
             [user2.id, user5.id],
             [user3.id, user6.id],
             [user1.id, user6.id],
             [user2.id, user4.id],
             [user3.id, user5.id]
           ]

    new_tournament = @module.cancel_all_matches(new_tournament)
    new_tournament = @module.maybe_start_new_step(new_tournament)

    player_ids =
      new_tournament
      |> Helpers.get_matches()
      |> Enum.map(fn match -> Enum.map(match.players, & &1.id) end)

    assert player_ids == [
             [user1.id, user4.id],
             [user2.id, user5.id],
             [user3.id, user6.id],
             [user1.id, user6.id],
             [user2.id, user4.id],
             [user3.id, user5.id],
             [user1.id, user5.id],
             [user2.id, user6.id],
             [user3.id, user4.id]
           ]
  end
end
