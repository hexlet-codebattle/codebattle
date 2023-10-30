defmodule Codebattle.Tournament.StairwayTest do
  use Codebattle.IntegrationCase, async: false

  import Codebattle.Tournament.Helpers

  @module Codebattle.Tournament.Stairway

  setup do
    insert(:task, level: "elementary", name: "2")

    :ok
  end

  describe "complete players" do
    test "add bots to complete teams" do
      user1 = insert(:user)

      tournament =
        insert(:stairway_tournament, state: "waiting_participants", creator_id: user1.id)

      tournament = @module.join(tournament, %{user: user1})
      tournament = @module.start(tournament, %{user: user1})

      assert players_count(tournament) == 2
    end
  end

  describe "pair players without duplicates" do
    test "5 rounds every time new pairs" do
      user1 = insert(:user)
      users = insert_list(27, :user)

      tournament =
        insert(:stairway_tournament,
          meta: %{rounds_limit: 5},
          match_timeout_seconds: 1000,
          break_duration_seconds: 0,
          players_limit: 100,
          played_pair_ids: MapSet.new([]),
          state: "waiting_participants",
          creator_id: user1.id
        )

      tournament = @module.join(tournament, %{user: user1})
      tournament = @module.join(tournament, %{users: users})
      tournament = @module.start(tournament, %{user: user1})

      assert players_count(tournament) == 28

      assert matches_count(tournament) == 14
      assert tournament.current_round == 0
      assert Enum.count(tournament.played_pair_ids) == 14

      tournament = finish_matches(tournament)
      assert matches_count(tournament) == 28
      assert tournament.current_round == 1
      assert Enum.count(tournament.played_pair_ids) == 28

      tournament = finish_matches(tournament)
      assert matches_count(tournament) == 42
      assert tournament.current_round == 2
      assert Enum.count(tournament.played_pair_ids) == 42

      tournament = finish_matches(tournament)
      assert matches_count(tournament) == 56
      assert tournament.current_round == 3
      assert Enum.count(tournament.played_pair_ids) == 56

      # TODO: fix flaky test
      # tournament = finish_matches(tournament)
      # assert matches_count(tournament) == 70
      # assert tournament.current_round == 4
      # assert Enum.count(tournament.played_pair_ids) == 70

      # # only 5 rounds

      # tournament = finish_matches(tournament)
      # assert matches_count(tournament) == 70
      # assert tournament.current_round == 4
      # assert Enum.count(tournament.played_pair_ids) == 70
    end
  end

  defp finish_matches(tournament) do
    tournament
    |> get_matches()
    |> Enum.filter(&(&1.state == "playing"))
    |> Enum.reduce(
      tournament,
      &@module.finish_match(&2, %{
        game_id: &1.game_id,
        game_state: "game_over",
        game_level: "elementary",
        player_results: build_palyer_results(&1),
        ref: &1.id
      })
    )
  end

  def build_palyer_results(match) do
    match.player_ids
    |> Enum.zip(["won", "lost"])
    |> Enum.map(fn {player_id, result} ->
      {player_id,
       %{
         id: player_id,
         result: result,
         duration_sec: 100,
         result_percent: 100,
         score: 5
       }}
    end)
    |> Enum.into(%{})
  end
end
