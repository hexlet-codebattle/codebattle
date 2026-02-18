defmodule Codebattle.Tournament.PairBuilder.ByClanTest do
  use Codebattle.DataCase

  @matcher Codebattle.Tournament.PairBuilder.ByClan

  describe "call/1" do
    test "one player" do
      users = build_users([1])

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert Enum.empty?(pairs)
      assert length(unmatched_player_ids) == 1
    end

    test "two players" do
      users = build_users([1, 1])

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert length(pairs) == 1
      assert Enum.empty?(unmatched_player_ids)
    end

    test "simple case with 6,4,4 players" do
      users = build_users([6, 4, 4])

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert length(pairs) == 7
      assert Enum.empty?(unmatched_player_ids)
    end

    test "simple case with unmatched players" do
      users = build_users([4, 3])

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert length(pairs) == 3
      assert length(unmatched_player_ids) == 1
    end

    test "10_000 players with small amount of clans" do
      users = build_users([4000, 3000, 2000, 1000, 100, 10, 1])

      {pairs, unmatched_player_ids} = @matcher.call(users)

      assert length(pairs) == 5055
      assert length(unmatched_player_ids) == 1
    end

    @tag :skip
    test "1000 clans ~ 100 players" do
      users =
        0..1000
        |> Enum.map(fn _id -> Enum.random(30..100) end)
        |> build_users()

      {execution_time, {pairs, unmatched_player_ids}} =
        :timer.tc(fn -> @matcher.call(users) end)

      assert execution_time / 1000 < 3000
      assert length(pairs) > 10_000
      assert length(unmatched_player_ids) < 2
    end

    @tag :skip
    test "10_000 clans with small amount of players" do
      users =
        0..10_000
        |> Enum.map(fn _id -> Enum.random(2..3) end)
        |> build_users()

      {execution_time, {pairs, unmatched_player_ids}} =
        :timer.tc(fn -> @matcher.call(users) end)

      assert execution_time / 1000 < 7000
      assert length(pairs) > 10_000
      assert length(unmatched_player_ids) < 2
    end
  end

  defp build_users(counts) do
    counts
    |> Enum.with_index()
    |> Enum.flat_map(fn {count, index} ->
      Enum.map(1..count, fn user_id -> {index * Enum.max(counts) + user_id, index} end)
    end)
    |> Enum.shuffle()
  end
end
