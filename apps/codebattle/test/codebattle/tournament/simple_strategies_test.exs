defmodule Codebattle.Tournament.SimpleStrategiesTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Show
  alias Codebattle.Tournament.Versus

  defp tournament(attrs \\ %{}) do
    struct!(
      Tournament,
      Map.merge(
        %{
          current_round_position: 0,
          matches: %{},
          matches_table: nil,
          players: %{
            1 => %{id: 1, name: "one"},
            2 => %{id: 2, name: "two"}
          },
          players_table: nil,
          rounds_limit: 2,
          task_ids: [10, 20],
          task_provider: "task_pack"
        },
        attrs
      )
    )
  end

  test "show strategy exposes its pure tournament rules" do
    first_round = tournament()
    final_round = tournament(%{current_round_position: 1})

    assert Show.game_type() == "solo"
    assert Show.reset_meta(%{key: :value}) == %{key: :value}
    assert Show.calculate_round_results(first_round) == first_round
    refute Show.finish_tournament?(first_round)
    assert Show.finish_tournament?(final_round)
    assert Show.finish_round_after_match?(first_round)

    assert {^first_round, pairs} = Show.build_round_pairs(first_round)
    assert pairs |> List.flatten() |> Enum.map(& &1.id) |> Enum.sort() == [1, 2]
  end

  test "show tournaments without task-pack rounds are not final" do
    refute Show.finish_tournament?(tournament(%{task_provider: "level"}))
  end

  test "show completes its roster with a bot and broadcasts wait states" do
    insert(:user, is_bot: true)
    players_table = Tournament.Players.create_table(System.unique_integer([:positive]))
    first_round = tournament(%{players_table: players_table})

    Enum.each(Map.values(first_round.players), fn player ->
      Tournament.Players.put_player(first_round, Tournament.Player.new!(player))
    end)

    final_round = tournament(%{current_round_position: 1})

    completed = Show.complete_players(first_round)
    assert Enum.any?(Tournament.Helpers.get_players(completed), & &1.is_bot)

    Codebattle.PubSub.subscribe("game:10")
    assert Show.maybe_create_rematch(first_round, %{game_id: 10, ref: 7}) == first_round

    assert_receive %Message{
      event: "tournament:game:wait",
      payload: %{type: "rematch"}
    }

    assert_receive {:start_rematch, 7, 0}

    Codebattle.PubSub.subscribe("game:11")
    assert Show.maybe_create_rematch(final_round, %{game_id: 11, ref: 8}) == final_round

    assert_receive %Message{
      event: "tournament:game:wait",
      payload: %{type: "tournament"}
    }
  end

  test "versus strategy exposes its round rules" do
    active = tournament(%{current_round_position: 0})
    final = tournament(%{current_round_position: 1})

    assert Versus.game_type() == "duo"
    assert Versus.reset_meta(%{key: :value}) == %{key: :value}
    assert Versus.calculate_round_results(active) == active
    assert Versus.maybe_create_rematch(active, %{}) == active
    refute Versus.finish_tournament?(active)
    assert Versus.finish_tournament?(final)
    assert Versus.finish_round_after_match?(active)

    assert {^active, pairs} = Versus.build_round_pairs(active)
    assert pairs |> List.flatten() |> Enum.map(& &1.id) |> Enum.sort() == [1, 2]
  end

  test "versus leaves an already even player set unchanged" do
    even = tournament()
    assert Versus.complete_players(even) == even
  end
end
