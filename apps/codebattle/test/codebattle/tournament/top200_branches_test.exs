defmodule Codebattle.Tournament.Top200BranchesTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.PubSub.Message
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Top200
  alias CodebattleWeb.TournamentAdminChannel

  test "exposes the base callbacks and fixed round timeouts" do
    tournament = inline_tournament(0, players(1..2))

    assert Top200.complete_players(tournament) == tournament
    assert Top200.reset_meta(%{custom: true}) == %{custom: true}
    assert Top200.game_type() == "duo"
    assert Top200.round_timeout_seconds(tournament) == 210
    assert Top200.round_timeout_seconds(%{tournament | current_round_position: 5}) == 300
    refute Top200.finish_tournament?(tournament)
    assert Top200.finish_tournament?(%{tournament | current_round_position: 7})
    assert Top200.calculate_round_results(tournament) == tournament
  end

  test "Dutch pairing falls back to a rematch and drops an odd solo player" do
    tournament = insert(:tournament, type: "top200", ranking_type: "by_user", rounds_limit: 8)

    game_id = System.unique_integer([:positive])

    for {id, score} <- [{1, 30}, {2, 20}] do
      insert(:tournament_result,
        tournament_id: tournament.id,
        user_id: id,
        user_name: "p#{id}",
        game_id: game_id,
        score: score,
        duration_sec: 1,
        round_position: 0
      )
    end

    tournament = %{tournament | current_round_position: 1, players: players(1..2), matches: %{}}
    {_, pairs} = Top200.build_round_pairs(tournament)

    assert length(pairs) == 1
    assert pairs |> List.flatten() |> Enum.map(& &1.id) |> Enum.sort() == [1, 2]

    odd_tournament = %{tournament | players: players(1..3)}
    {_, odd_pairs} = Top200.build_round_pairs(odd_tournament)
    assert length(odd_pairs) == 1
    assert length(List.flatten(odd_pairs)) == 2
  end

  test "selects and broadcasts the leading player's active game" do
    tournament = inline_tournament(0, players(1..2))
    match = %Match{id: 7, game_id: 321, player_ids: [1, 2], state: "playing", round_position: 0}

    tournament = %{
      tournament
      | players: Map.update!(tournament.players, Helpers.to_id(1), &%{&1 | matches_ids: [7]}),
        matches: %{Helpers.to_id(match.id) => match}
    }

    Codebattle.PubSub.subscribe("tournament:#{tournament.id}:stream")

    assert Top200.setup_round_active_game(tournament) == tournament
    assert TournamentAdminChannel.get_active_game(tournament.id) == 321

    assert_receive %Message{
      event: "tournament:stream:active_game",
      payload: %{game_id: 321}
    }

    empty = inline_tournament(0, %{})
    assert Top200.setup_round_active_game(empty) == empty
  end

  test "redirects only players below the playoff cut" do
    tournament = insert(:tournament, type: "top200", ranking_type: "by_user", rounds_limit: 8)

    for id <- 1..10 do
      insert(:tournament_result,
        tournament_id: tournament.id,
        user_id: id,
        user_name: "p#{id}",
        score: 100 - id,
        duration_sec: id,
        round_position: 0
      )

      Codebattle.PubSub.subscribe("main:#{id}")
    end

    tournament = %{
      tournament
      | current_round_position: 4,
        players: players(1..10),
        matches: %{},
        meta: %{players_redirect_url: "https://example.test/next"}
    }

    assert Top200.calculate_round_results(tournament) == tournament

    assert_receive %Message{event: "main:redirect", topic: "main:9"}
    assert_receive %Message{event: "main:redirect", topic: "main:10"}
    refute_receive %Message{event: "main:redirect", topic: "main:1"}, 10

    without_url = %{tournament | meta: %{}}
    assert Top200.calculate_round_results(without_url) == without_url
  end

  test "keeps existing places when a final bracket is incomplete" do
    tournament = inline_tournament(7, players(1..2))
    players_table = Tournament.Players.create_table(tournament.id)
    tournament = %{tournament | players_table: players_table}

    Enum.each(1..2, fn id ->
      Tournament.Players.put_player(tournament, Player.new!(%{id: id, name: "p#{id}", state: "active", place: id}))
    end)

    assert Top200.compute_final_standings(tournament) == tournament
    assert Tournament.Players.get_player(tournament, 1).place == 1
    assert Tournament.Players.get_player(tournament, 2).place == 2
  end

  test "ignores a playoff winner that is absent from the player table" do
    tournament = insert(:tournament, type: "top200", ranking_type: "by_user", rounds_limit: 8)
    match = %Match{id: 1, player_ids: [1, 999], round_position: 5, state: "game_over"}

    for {id, score} <- [{1, 0}, {999, 100}] do
      insert(:tournament_result,
        tournament_id: tournament.id,
        user_id: id,
        user_name: "p#{id}",
        score: score,
        duration_sec: 1,
        round_position: 5
      )
    end

    tournament = %{
      tournament
      | current_round_position: 5,
        players: players([1]),
        matches: %{Helpers.to_id(match.id) => match}
    }

    assert Top200.calculate_round_results(tournament) == tournament
    assert tournament.players[Helpers.to_id(1)].draw_index == 1
  end

  test "does not advance a round while a pair has played only once" do
    tournament = inline_tournament(0, players(1..2))
    match = %Match{id: 1, player_ids: [1, 2], round_position: 0, state: "game_over"}
    tournament = %{tournament | matches: %{Helpers.to_id(match.id) => match}}

    assert Top200.maybe_finish_round_after_finish_match(tournament) == tournament
  end

  test "uses the round wait state when a finished match reference is missing" do
    tournament = inline_tournament(0, players(1..2))
    Codebattle.PubSub.subscribe("game:404")

    assert Top200.maybe_create_rematch(tournament, %{ref: 999, game_id: 404}) == tournament

    assert_receive %Message{
      event: "tournament:game:wait",
      payload: %{type: "round"}
    }

    refute_received {:start_rematch, _, _}
  end

  test "final standing assignment tolerates players missing from the restored roster" do
    tournament = inline_tournament(7, %{})
    players_table = Tournament.Players.create_table(tournament.id)
    tournament = %{tournament | players_table: players_table}
    Tournament.Players.put_player(tournament, Player.new!(%{id: 1, name: "only", state: "active", place: 1}))

    matches =
      Map.new(
        [
          %Match{id: 1, player_ids: [1, 2], round_position: 7, state: "game_over"},
          %Match{id: 2, player_ids: [3, 4], round_position: 7, state: "game_over"},
          %Match{id: 3, player_ids: [5, 6], round_position: 7, state: "game_over"},
          %Match{id: 4, player_ids: [7, 8], round_position: 7, state: "game_over"}
        ],
        &{Helpers.to_id(&1.id), &1}
      )

    tournament = %{tournament | matches: matches}
    assert Top200.compute_final_standings(tournament) == tournament
    assert Tournament.Players.get_player(tournament, 1).place == 1
  end

  defp inline_tournament(round_position, tournament_players) do
    struct!(Tournament, %{
      id: System.unique_integer([:positive]),
      type: "top200",
      ranking_type: "by_user",
      rounds_limit: 8,
      current_round_position: round_position,
      players: tournament_players,
      matches: %{},
      played_pair_ids: MapSet.new(),
      meta: %{}
    })
  end

  defp players(ids) do
    Map.new(ids, fn id ->
      {Helpers.to_id(id), Player.new!(%{id: id, name: "p#{id}", rating: id, state: "active"})}
    end)
  end
end
