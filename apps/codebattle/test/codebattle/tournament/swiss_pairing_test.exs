defmodule Codebattle.Tournament.SwissPairingTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Pairing
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Swiss

  test "round one pairs players by ascending id and records played pairs" do
    tournament =
      build_tournament(%{
        current_round_position: 0,
        players:
          players_with_scores([
            {4, 0},
            {2, 0},
            {1, 0},
            {3, 0}
          ])
      })

    {updated_tournament, pairs} = Swiss.build_round_pairs(tournament)

    assert pair_ids(pairs) == [[1, 2], [3, 4]]
    assert updated_tournament.played_pair_ids == MapSet.new([{1, 2}, {3, 4}])
  end

  test "round one pairs unmatched player with a bot" do
    tournament =
      build_tournament(%{
        current_round_position: 0,
        players:
          players_with_scores([
            {5, 0},
            {3, 0},
            {1, 0},
            {4, 0},
            {2, 0}
          ])
      })

    {updated_tournament, pairs} = Swiss.build_round_pairs(tournament)

    assert pair_ids(Enum.take(pairs, 2)) == [[1, 2], [3, 4]]
    assert length(pairs) == 3

    assert [[%Player{id: 5}, %Player{is_bot: true} = bot]] = Enum.take(pairs, -1)
    assert updated_tournament.played_pair_ids == MapSet.new([{1, 2}, {3, 4}, Pairing.key(5, bot.id)])
  end

  test "the bye goes to the lowest-standing player who hasn't had one yet" do
    bot = Codebattle.Bot.Context.build()

    tournament =
      build_tournament(%{
        current_round_position: 1,
        played_pair_ids: MapSet.new([{1, 2}, {3, 4}, Pairing.key(5, bot.id)]),
        players: players_with_scores([{1, 100}, {2, 90}, {3, 80}, {4, 70}, {5, 60}])
      })

    {updated_tournament, pairs} = Swiss.build_round_pairs(tournament)

    # Player 5 is last but already had the bot, so player 4 takes it this time.
    assert [[%Player{id: 4}, %Player{is_bot: true}]] = Enum.take(pairs, -1)
    assert pair_ids(Enum.drop(pairs, -1)) == [[1, 3], [2, 5]]
    assert MapSet.member?(updated_tournament.played_pair_ids, Pairing.key(4, bot.id))
  end

  test "equal standings pair deterministically by time spent, then id" do
    players =
      Map.new([{1, 30}, {2, 10}, {3, 20}, {4, 10}], fn {id, duration} ->
        {id, Player.new!(%{id: id, name: "p#{id}", score: 50, total_duration_sec: duration, state: "active"})}
      end)

    tournament = build_tournament(%{current_round_position: 1, players: players})

    {_updated_tournament, pairs} = Swiss.build_round_pairs(tournament)

    # Order is 2 (10s), 4 (10s), 3 (20s), 1 (30s).
    assert Enum.map(pairs, fn pair -> Enum.map(pair, & &1.id) end) == [[2, 4], [3, 1]]
  end

  test "later rounds sort by score and avoid repeated opponents when possible" do
    tournament =
      build_tournament(%{
        current_round_position: 1,
        played_pair_ids: MapSet.new([{1, 2}, {3, 4}]),
        players:
          players_with_scores([
            {1, 100},
            {2, 90},
            {3, 80},
            {4, 70}
          ])
      })

    {_updated_tournament, pairs} = Swiss.build_round_pairs(tournament)

    assert pair_ids(pairs) == [[1, 3], [2, 4]]
  end

  test "later rounds fallback to repeated opponents when no fresh opponent exists" do
    tournament =
      build_tournament(%{
        current_round_position: 2,
        played_pair_ids: MapSet.new([{1, 2}, {1, 3}, {1, 4}]),
        players:
          players_with_scores([
            {1, 100},
            {2, 90},
            {3, 80},
            {4, 70}
          ])
      })

    {_updated_tournament, pairs} = Swiss.build_round_pairs(tournament)

    assert pair_ids(pairs) == [[1, 2], [3, 4]]
  end

  test "pairing ignores bots and banned players" do
    tournament =
      build_tournament(%{
        current_round_position: 1,
        players:
          [
            {1, 100},
            {2, 90},
            {3, 80},
            {4, 70}
          ]
          |> players_with_scores()
          |> Map.put(5, Player.new!(%{id: 5, name: "bot", is_bot: true, score: 999, state: "active"}))
          # Player.new! doesn't cast state, so the ban is set on the struct.
          |> Map.put(6, %{Player.new!(%{id: 6, name: "banned", is_bot: false, score: 999}) | state: "banned"})
      })

    {_updated_tournament, pairs} = Swiss.build_round_pairs(tournament)

    assert pair_ids(pairs) == [[1, 2], [3, 4]]
  end

  @tag timeout: :infinity
  test "stress test pairs 3000 users through 30 swiss rounds" do
    rounds = 30
    players_count = 3_000

    tournament =
      build_tournament(%{
        current_round_position: 0,
        players: players_with_scores(Enum.map(1..players_count, &{&1, 0}))
      })

    tournament =
      Enum.reduce(0..(rounds - 1), tournament, fn round_position, tournament ->
        tournament = %{tournament | current_round_position: round_position}
        {tournament, pairs} = Swiss.build_round_pairs(tournament)

        assert length(pairs) == div(players_count, 2)
        assert players_count == pairs |> List.flatten() |> Enum.map(& &1.id) |> Enum.uniq() |> length()

        updated_players =
          pairs
          |> Enum.with_index()
          |> Enum.reduce(tournament.players, fn {[p1, p2], pair_index}, acc ->
            winner_id =
              if rem(round_position + pair_index, 2) == 0 do
                p1.id
              else
                p2.id
              end

            Map.update!(acc, winner_id, fn player ->
              %{player | score: player.score + 1}
            end)
          end)

        %{tournament | players: updated_players}
      end)

    assert map_size(tournament.players) == players_count
    assert MapSet.size(MapSet.new(tournament.played_pair_ids)) > players_count
  end

  defp build_tournament(attrs) do
    struct!(
      Tournament,
      Map.merge(
        %{
          type: "swiss",
          ranking_type: "by_user",
          current_round_position: 0,
          players: %{},
          played_pair_ids: MapSet.new(),
          meta: %{}
        },
        attrs
      )
    )
  end

  defp players_with_scores(entries) do
    Map.new(entries, fn {id, score} ->
      {id, Player.new!(%{id: id, name: "player-#{id}", is_bot: false, score: score, state: "active"})}
    end)
  end

  defp pair_ids(pairs) do
    Enum.map(pairs, fn pair ->
      pair
      |> Enum.map(& &1.id)
      |> Enum.sort()
    end)
  end
end
