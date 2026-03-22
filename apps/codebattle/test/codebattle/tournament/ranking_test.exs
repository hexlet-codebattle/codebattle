defmodule Codebattle.Tournament.RankingTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Ranking
  alias Codebattle.Tournament.TournamentResult

  test "get_page/3 falls back to player ordering when ranking table is absent" do
    tournament =
      struct!(Tournament, %{
        type: "swiss",
        ranking_type: "by_user",
        players: %{
          1 => Player.new!(%{id: 1, name: "late", wr_joined_at: 20, is_bot: false}),
          2 => Player.new!(%{id: 2, name: "placed", place: 1, is_bot: false}),
          3 => Player.new!(%{id: 3, name: "early", wr_joined_at: 10, is_bot: false}),
          4 => Player.new!(%{id: 4, name: "bot", place: 2, is_bot: true})
        }
      })

    page = Ranking.get_page(tournament, 1, 10)

    assert page.total_entries == 3
    assert Enum.map(page.entries, & &1.id) == [2, 3, 1]
    assert Enum.map(page.entries, & &1.place) == [1, 2, 3]
    assert Ranking.get_first(tournament, 5) == []
    assert Ranking.get_by_player(tournament, hd(page.entries)) == nil
    assert Ranking.get_by_id(tournament, 2) == nil

    assert Ranking.get_nearest_page_by_player(tournament, hd(page.entries)) == %{
             total_entries: 0,
             page_number: 1,
             page_size: 10,
             entries: []
           }
  end

  test "by_user ranking wrapper manages ETS ranking and applies round results once" do
    tournament = build_ets_tournament(%{ranking_type: "by_user", state: "active", current_round_position: 0})

    p1 = Player.new!(%{id: 1, name: "p1", lang: "js", state: "active"})
    p2 = Player.new!(%{id: 2, name: "p2", lang: "rb", state: "active"})
    bot = Player.new!(%{id: 99, name: "bot", is_bot: true, state: "active"})

    Tournament.Players.put_player(tournament, p1)
    Tournament.Players.put_player(tournament, p2)
    Tournament.Players.put_player(tournament, bot)

    Ranking.add_new_player(tournament, p1)
    Ranking.add_new_player(tournament, p2)
    Ranking.add_new_player(tournament, bot)

    assert Enum.map(Ranking.get_first(tournament, 10), & &1.id) == [1, 2, 99]
    assert Ranking.get_by_player(tournament, p1).id == 1
    assert Ranking.get_by_id(tournament, 2).id == 2

    Repo.insert!(%TournamentResult{
      tournament_id: tournament.id,
      user_id: 1,
      user_name: "p1",
      user_lang: "js",
      score: 10,
      duration_sec: 5,
      round_position: 0,
      result_percent: Decimal.new("100"),
      game_id: 10,
      task_id: 1,
      level: "easy"
    })

    Repo.insert!(%TournamentResult{
      tournament_id: tournament.id,
      user_id: 2,
      user_name: "p2",
      user_lang: "rb",
      score: 7,
      duration_sec: 8,
      round_position: 0,
      result_percent: Decimal.new("0"),
      game_id: 10,
      task_id: 1,
      level: "easy"
    })

    Ranking.set_ranking(tournament)
    Ranking.set_ranking(tournament)

    assert Tournament.Players.get_player(tournament, 1).score == 10
    assert Tournament.Players.get_player(tournament, 1).place == 1
    assert Tournament.Players.get_player(tournament, 2).score == 7
    assert Tournament.Players.get_player(tournament, 2).place == 2

    page = Ranking.get_page(tournament, 1, 1)
    assert page.total_entries == 2
    assert Enum.map(page.entries, & &1.id) == [1]

    assert Ranking.get_nearest_page_by_player(tournament, Tournament.Players.get_player(tournament, 2)).page_number == 1
    assert Ranking.drop_player(tournament, 2) == 1
    assert Ranking.get_by_id(tournament, 2) == nil
  end

  test "by_clan ranking groups players and updates clan scores" do
    tournament = build_ets_tournament(%{ranking_type: "by_clan", state: "active"})

    p1 = Player.new!(%{id: 1, name: "p1", clan_id: 7, score: 3, state: "active"})
    p2 = Player.new!(%{id: 2, name: "p2", clan_id: 7, score: 4, state: "active"})
    p3 = Player.new!(%{id: 3, name: "p3", clan_id: 9, score: 8, state: "active"})

    Tournament.Players.put_player(tournament, p1)
    Tournament.Players.put_player(tournament, p2)
    Tournament.Players.put_player(tournament, p3)

    Ranking.set_ranking(tournament)

    assert Enum.map(Ranking.get_first(tournament, 10), &{&1.id, &1.score, &1.place, &1.players_count}) == [
             {9, 8, 1, 1},
             {7, 7, 2, 2}
           ]

    Ranking.update_player_result(tournament, p2, 10)
    assert Ranking.get_by_player(tournament, p1).score == 17

    Ranking.add_new_player(tournament, Player.new!(%{id: 4, name: "p4", clan_id: 9, state: "active"}))
    assert Ranking.get_by_id(tournament, 9).players_count == 2
  end

  defp build_ets_tournament(attrs) do
    tournament_id = System.unique_integer([:positive, :monotonic])

    tournament =
      struct!(
        Tournament,
        Map.merge(
          %{
            id: tournament_id,
            type: "swiss",
            ranking_type: "by_user",
            state: "active",
            players_table: Tournament.Players.create_table(tournament_id),
            ranking_table: Ranking.create_table(tournament_id),
            matches_table: Tournament.Matches.create_table(tournament_id),
            tasks_table: Tournament.Tasks.create_table(tournament_id),
            clans_table: Tournament.Clans.create_table(tournament_id),
            players: %{},
            matches: %{},
            meta: %{}
          },
          attrs
        )
      )

    on_exit(fn ->
      Enum.each(
        [
          tournament.players_table,
          tournament.ranking_table,
          tournament.matches_table,
          tournament.tasks_table,
          tournament.clans_table
        ],
        &safe_delete_ets/1
      )
    end)

    tournament
  end

  defp safe_delete_ets(table) do
    :ets.delete(table)
  rescue
    _ -> :ok
  end
end
