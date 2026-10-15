defmodule Codebattle.Tournament.PairBuilder.ByScoreTest do
  use Codebattle.DataCase

  @matcher Codebattle.Tournament.PairBuilder.ByScore

  describe "call/1" do
    test "one player" do
      users = build_users(1)

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert Enum.empty?(pairs)
      assert length(unmatched_player_ids) == 1
    end

    test "two players" do
      users = build_users(2)

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert length(pairs) == 1
      assert Enum.empty?(unmatched_player_ids)
    end

    test "simple case with unmatched players" do
      users = build_users(7)

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert length(pairs) == 3
      assert length(unmatched_player_ids) == 1
    end

    test "simple case with 14 players" do
      users = build_users(14)

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert length(pairs) == 7
      assert Enum.empty?(unmatched_player_ids)
    end

    test "simple case with same score" do
      users = [{1, 1}, {2, 3}, {3, 7}, {4, 2}, {5, 7}, {6, 3}]

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert pairs == [[4, 1], [2, 6], [3, 5]]
      assert Enum.empty?(unmatched_player_ids)
    end

    test "10_000 players" do
      users = build_users(10_001)

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert length(pairs) == 5000
      assert length(unmatched_player_ids) == 1
    end
  end

  defp build_users(count) do
    1..count
    |> Enum.map(fn id -> {id, id} end)
    |> Enum.shuffle()
  end
end
