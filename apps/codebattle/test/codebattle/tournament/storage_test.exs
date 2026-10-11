defmodule Codebattle.Tournament.StorageTest do
  use ExUnit.Case, async: true

  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Matches
  alias Codebattle.Tournament.Storage.Ranking

  test "round reads isolate round and state and reflect match updates" do
    tournament = %{matches_table: Matches.create_table(System.unique_integer([:positive])), current_round_position: 2}
    historical = %Match{id: 1, state: "playing", round_position: 1}
    playing = %Match{id: 2, state: "playing", round_position: 2}
    finished = %Match{id: 3, state: "game_over", round_position: 2}
    for match <- [historical, playing, finished], do: Matches.put_match(tournament, match)

    assert Helpers.get_round_matches(tournament, 1) == [historical]
    assert Enum.sort_by(Helpers.get_current_round_matches(tournament), & &1.id) == [playing, finished]
    assert Helpers.get_current_round_playing_matches(tournament) == [playing]
    assert Matches.count(tournament) == 3

    Matches.update_match(tournament, 2, %{state: "timeout"})
    assert Helpers.get_current_round_playing_matches(tournament) == []
    assert Matches.get_matches(tournament, "playing") == [historical]
    assert Matches.get_match(tournament, 2).state == "timeout"
  end

  test "ranking indices and pages follow replacements, shrinking and removals" do
    tournament = %{ranking_table: Ranking.create_table(System.unique_integer([:positive]))}
    original = [%{id: 10, place: 1}, %{id: 20, place: 2}, %{id: 30, place: 3}]
    Ranking.put_ranking(tournament, original)
    assert Ranking.count(tournament) == 3
    assert Ranking.get_by_id(tournament, 20) == Enum.at(original, 1)

    reordered = [%{id: 30, place: 1}, %{id: 10, place: 2}]
    Ranking.put_ranking(tournament, reordered)
    assert Ranking.get_all(tournament) == reordered
    assert Ranking.count(tournament) == 2
    assert Ranking.get_by_id(tournament, 30) == hd(reordered)
    assert Ranking.get_by_id(tournament, 20) == nil
    assert Ranking.get_slice(tournament, 2, 1_000_000_000) == [Enum.at(reordered, 1)]
    assert Ranking.get_slice(tournament, 1_000_000_000, 2_000_000_000) == []
    assert Ranking.get_first(tournament, 1_000_000_000) == reordered
    assert Ranking.get_slice(tournament, 2, 1) == []
    assert Ranking.get_first(tournament, 0) == []

    assert Ranking.drop_player(tournament, 30) == 1
    assert Ranking.drop_player(tournament, 30) == 0
    assert Ranking.count(tournament) == 1
    assert Ranking.next_place(tournament) == 3
    assert Ranking.get_slice(tournament, 1, 2) == [Enum.at(reordered, 1)]

    Ranking.put_single_record(tournament, 2, %{id: 40, place: 2})
    assert Ranking.get_by_id(tournament, 10) == nil
    assert Ranking.get_by_id(tournament, 40) == %{id: 40, place: 2}
    assert Ranking.count(tournament) == 1

    Ranking.put_ranking(tournament, [])
    assert Ranking.count(tournament) == 0
    assert Ranking.get_all(tournament) == []
    assert Ranking.get_by_id(tournament, 40) == nil
    assert Ranking.next_place(tournament) == 1
  end

  test "sparse ranking places retain id lookups and bounded pages after replacement" do
    tournament = %{ranking_table: Ranking.create_table(System.unique_integer([:positive]))}
    Ranking.put_ranking(tournament, [%{id: 10, place: 1}, %{id: 20, place: 2}, %{id: 30, place: 3}])
    sparse = [%{id: 30, place: 3}]
    Ranking.put_ranking(tournament, sparse)

    assert Ranking.count(tournament) == 1
    assert Ranking.get_first(tournament, 10) == sparse
    assert Ranking.get_by_id(tournament, 30) == hd(sparse)
    assert Ranking.get_by_id(tournament, 10) == nil
    assert Ranking.next_place(tournament) == 4
  end
end
