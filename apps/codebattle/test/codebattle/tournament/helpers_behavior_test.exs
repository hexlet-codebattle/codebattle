defmodule Codebattle.Tournament.HelpersBehaviorTest do
  use Codebattle.DataCase, async: false

  import Codebattle.Tournament.Helpers

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.TournamentResult

  describe "player and match helpers for swiss tournaments" do
    test "works with in-memory players and matches" do
      tournament =
        build_tournament(%{
          current_round_position: 1,
          state: "active",
          creator_id: 10,
          access_type: "token",
          access_token: "secret-token",
          break_state: "on",
          players: %{
            :"1" =>
              player(%{
                id: 1,
                name: "p1",
                place: 2,
                score: 10,
                matches_ids: [1, 3],
                team_id: 1
              }),
            :"2" =>
              player(%{
                id: 2,
                name: "p2",
                place: 1,
                score: 12,
                matches_ids: [1, 2],
                team_id: 2
              }),
            :"3" =>
              player(%{
                id: 3,
                name: "p3",
                place: 3,
                score: 8,
                matches_ids: [2, 3],
                team_id: 1
              })
          },
          matches: %{
            :"1" => %Match{id: 1, player_ids: [1, 2], round_position: 0, state: "game_over", game_id: 101, winner_id: 1},
            :"2" => %Match{id: 2, player_ids: [2, 3], round_position: 1, state: "playing", game_id: 102},
            :"3" => %Match{id: 3, player_ids: [1, 3], round_position: 1, state: "timeout", game_id: 103}
          }
        })

      assert get_player(tournament, 1).name == "p1"
      assert get_player(tournament, "2").name == "p2"
      assert tournament |> get_players() |> Enum.map(& &1.id) |> Enum.sort() == [1, 2, 3]
      assert Enum.map(get_players(tournament, [1, "3"]), & &1.id) == [1, 3]
      assert players_count(tournament) == 3
      assert tournament |> get_paginated_players(1, 2) |> Enum.map(& &1.id) |> Enum.sort() == [1, 2, 3]

      assert get_match(tournament, 1).game_id == 101
      assert tournament |> get_matches() |> Enum.map(& &1.id) |> Enum.sort() == [1, 2, 3]
      assert Enum.map(get_matches(tournament, [1, 3]), & &1.id) == [1, 3]
      assert Enum.map(get_matches(tournament, "playing"), & &1.id) == [2]
      assert tournament |> get_matches_by_players([1]) |> Enum.map(& &1.id) |> Enum.sort() == [1, 3]

      assert Enum.map(get_round_matches(tournament), fn round -> round |> Enum.map(& &1.id) |> Enum.sort() end) == [
               [1],
               [2, 3]
             ]

      assert tournament |> get_current_round_matches() |> Enum.map(& &1.id) |> Enum.sort() == [2, 3]
      assert Enum.map(get_round_matches(tournament, 0), & &1.id) == [1]
      assert Enum.map(get_current_round_playing_matches(tournament), & &1.id) == [2]

      assert tournament
             |> get_player_opponents_from_matches(get_matches_by_players(tournament, [1]), 1)
             |> Enum.map(& &1.id)
             |> Enum.sort() == [2, 3]

      assert tournament |> get_opponents([1, 2]) |> Enum.map(& &1.id) |> Enum.sort() == [1, 2, 3]
      assert get_top_game_id(tournament) == 102
      assert get_player_latest_match(tournament, 1).id == 3
      assert get_player_latest_match(tournament, 999) == nil
      assert get_active_game_id(tournament, 2) == 102
      assert get_active_game_id(tournament, 1) == nil
      assert get_stats(tournament) == %{}

      assert match_player?(get_match(tournament, 1), 1)
      refute match_player?(get_match(tournament, 1), 999)
      assert tournament |> get_player_ids() |> Enum.sort() == [1, 2, 3]
      assert get_opponent_id(%{player_ids: [1, 2]}, 1) == 2
      assert get_opponent_id(%{player_ids: [2, 1]}, 1) == 2
      assert get_opponent_id(%{player_ids: [1, 2]}, 999) == nil
    end

    test "checks tournament access, status predicates, and winner selection" do
      tournament =
        build_tournament(%{
          state: "waiting_participants",
          creator_id: 10,
          type: "individual",
          access_type: "token",
          access_token: "secret-token",
          break_state: "on",
          players: %{:"1" => player(%{id: 1, name: "p1", team_id: 7})}
        })

      creator = build(:user, id: 10)
      moderator = build(:user, id: 11)
      admin = %Codebattle.User{id: 500, subscription_type: :admin}
      outsider = build(:user, id: 999)
      player_user = build(:user, id: 1)

      assert can_be_started?(tournament)
      refute can_be_started?(%{tournament | state: "active"})
      assert can_moderate?(tournament, creator)
      assert can_moderate?(%{tournament | moderator_ids: [11]}, moderator)
      assert can_moderate?(tournament, admin)
      refute can_moderate?(tournament, outsider)

      assert can_access?(tournament, creator, %{})
      assert can_access?(tournament, player_user, %{})
      assert can_access?(tournament, outsider, %{"access_token" => "secret-token"})
      refute can_access?(tournament, outsider, %{"access_token" => "wrong"})
      assert can_access?(%{tournament | access_type: "public"}, outsider, %{})

      assert active?(%{tournament | state: "active"})
      assert waiting_participants?(tournament)
      assert canceled?(%{tournament | state: "canceled"})
      assert finished?(%{tournament | state: "finished"})
      assert individual?(tournament)
      refute public?(tournament)
      assert visible_by_token?(tournament)
      assert in_break?(tournament)

      assert player?(tournament, 1)
      refute player?(tournament, 999)
      assert player?(tournament, 1, 7)
      refute player?(tournament, 1, 8)
      assert creator?(tournament, creator)
      assert moderator?(%{tournament | moderator_ids: [11]}, moderator)
      refute creator?(tournament, outsider)

      assert calc_round_result([
               %{state: "game_over", player_ids: [1, 2], winner_id: 1},
               %{state: "game_over", player_ids: [3, 4], winner_id: 4},
               %{state: "timeout", player_ids: [5, 6], winner_id: nil}
             ]) == [1, 1]

      assert pick_winner_id(%{state: "game_over", winner_id: 5}) == 5
      assert pick_winner_id(%{player_ids: [0, 9]}) == 9
      assert pick_winner_id(%{player_ids: [7, 8]}) in [7, 8]
      assert get_winner_ids(%{state: "finished"}) == []
      assert get_winner_ids(%{state: "active"}) == []
    end
  end

  describe "timeout, clan, and ranking stats helpers" do
    test "calculates round timeout through all fallback branches" do
      task = insert(:task, time_to_solve_sec: 45)
      tournament = build_ets_tournament(%{task_ids: [task.id], current_round_position: 0})
      Tournament.Tasks.put_task(tournament, task)

      assert current_round_timeout_seconds(%{tournament | current_round_timeout_seconds: 77}) == 77

      running =
        %{tournament | tournament_timeout_seconds: 40, started_at: DateTime.add(DateTime.utc_now(), -35, :second)}

      assert current_round_timeout_seconds(running) == 10

      assert current_round_timeout_seconds(%{tournament | timeout_mode: "per_round_fixed", round_timeout_seconds: 123}) ==
               123

      assert current_round_timeout_seconds(tournament) == 45
      assert current_round_timeout_seconds(%{tournament | task_ids: []}) == 300
    end

    test "builds json-safe tournament info, clan lookups, total games, and ranking stats" do
      clan = insert(:clan, name: "clan-a", long_name: "Clan A")
      task = insert(:task)

      tournament =
        build_ets_tournament(%{
          id: System.unique_integer([:positive]),
          state: "active",
          current_round_position: 3,
          use_clan: true,
          task_provider: "task_pack",
          task_strategy: "sequential",
          task_ids: [task.id],
          players: %{
            1 =>
              player(%{
                id: 1,
                name: "p1",
                clan_id: clan.id,
                place: 1,
                score: 6,
                wins_count: 1,
                draw_index: 1,
                max_draw_index: 1,
                matches_ids: [11]
              }),
            2 =>
              player(%{
                id: 2,
                name: "p2",
                clan_id: clan.id,
                place: 2,
                score: 4,
                wins_count: 0,
                draw_index: 1,
                max_draw_index: 1,
                matches_ids: [11]
              })
          },
          matches: %{11 => %Match{id: 11, player_ids: [1, 2], round_position: 0, state: "game_over", game_id: 110}},
          cheater_ids: [999]
        })

      Tournament.Tasks.put_task(tournament, task)
      Tournament.Clans.put_clans(tournament, [clan])

      Repo.insert!(%TournamentResult{
        tournament_id: tournament.id,
        game_id: 11,
        user_id: 1,
        user_name: "p1",
        user_lang: "js",
        clan_id: clan.id,
        task_id: task.id,
        score: 6,
        duration_sec: 10,
        result_percent: Decimal.new("100"),
        round_position: 0,
        level: "easy"
      })

      Repo.insert!(%TournamentResult{
        tournament_id: tournament.id,
        game_id: 11,
        user_id: 2,
        user_name: "p2",
        user_lang: "rb",
        clan_id: clan.id,
        task_id: task.id,
        score: 4,
        duration_sec: 12,
        result_percent: Decimal.new("0"),
        round_position: 0,
        level: "easy"
      })

      stats = get_player_ranking_stats(tournament)

      assert stats["tournament_id"] == tournament.id
      assert stats["current_round"] == 4
      assert Enum.map(stats["players"], & &1["id"]) == ["1", "2"]
      assert Enum.map(stats["players"], & &1["win_prob"]) == ["60", "40"]

      assert Enum.at(stats["players"], 0)["history"] == [
               %{
                 opponent_clan_id: clan.id,
                 opponent_id: 2,
                 player_win_status: true,
                 round: 1,
                 score: 6,
                 solved_tasks: ["won"]
               }
             ]

      assert get_clans_by_ranking(tournament, [%{id: clan.id}]) == %{
               clan.id => %{id: clan.id, name: clan.name, long_name: clan.long_name}
             }

      assert get_clans_by_ranking(tournament, %{entries: [%{id: clan.id}]})[clan.id].name == clan.name
      assert get_clans_by_ranking(tournament, %{clan.id => %{id: clan.id}})[clan.id].name == clan.name
      assert get_clans_by_ranking(%{tournament | use_clan: false}, [%{id: clan.id}]) == %{}
      assert get_clans_by_ranking(tournament, :unexpected) == %{}

      assert get_players_total_games_count(tournament, get_player(tournament, 1)) == 1
      assert get_players_total_games_count(%{tournament | task_provider: "level"}, nil) == 0
      assert get_players_total_games_count(%{tournament | task_provider: "level"}, get_player(tournament, 1)) == 1

      json = prepare_to_json(tournament)
      refute Map.has_key?(json, :players)
      refute Map.has_key?(json, :matches)
      refute Map.has_key?(json, :played_pair_ids)
      assert json.current_round_timeout_seconds == 300

      assert tournament_info(tournament) == %{
               id: tournament.id,
               clans_table: tournament.clans_table,
               type: tournament.type,
               ranking_type: tournament.ranking_type,
               matches_table: tournament.matches_table,
               players_table: tournament.players_table,
               ranking_table: tournament.ranking_table,
               tasks_table: tournament.tasks_table
             }
    end
  end

  defp build_tournament(attrs) do
    struct!(
      Tournament,
      Map.merge(
        %{
          id: System.unique_integer([:positive]),
          type: "swiss",
          ranking_type: "by_user",
          state: "waiting_participants",
          access_type: "public",
          break_state: "off",
          current_round_position: 0,
          players: %{},
          matches: %{},
          meta: %{},
          task_provider: "level",
          task_strategy: "random",
          task_ids: []
        },
        attrs
      )
    )
  end

  defp build_ets_tournament(attrs) do
    tournament_id = System.unique_integer([:positive, :monotonic])

    tournament =
      build_tournament(
        Map.merge(
          %{
            id: tournament_id,
            players_table: Tournament.Players.create_table(tournament_id),
            matches_table: Tournament.Matches.create_table(tournament_id),
            ranking_table: Tournament.Ranking.create_table(tournament_id),
            tasks_table: Tournament.Tasks.create_table(tournament_id),
            clans_table: Tournament.Clans.create_table(tournament_id)
          },
          attrs
        )
      )

    Enum.each(Map.values(tournament.players), &Tournament.Players.put_player(tournament, &1))
    Enum.each(Map.values(tournament.matches), &Tournament.Matches.put_match(tournament, &1))

    on_exit(fn ->
      Enum.each(
        [
          tournament.players_table,
          tournament.matches_table,
          tournament.ranking_table,
          tournament.tasks_table,
          tournament.clans_table
        ],
        &safe_delete_ets/1
      )
    end)

    tournament
  end

  defp player(attrs) do
    Player.new!(Map.merge(%{state: "active", matches_ids: [], score: 0}, attrs))
  end

  defp safe_delete_ets(table) do
    :ets.delete(table)
  rescue
    _ -> :ok
  end
end
