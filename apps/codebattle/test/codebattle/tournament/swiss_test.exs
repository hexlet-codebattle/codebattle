defmodule Codebattle.Tournament.SwissTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Player
  alias Codebattle.Tournament.Swiss

  test "does not finish round after one match while another is still playing" do
    tournament =
      insert(:tournament,
        type: "swiss",
        state: "active",
        rounds_limit: 3,
        use_infinite_break: true
      )
      |> Map.merge(%{
        current_round_position: 0,
        players_count: 4,
        players: %{
          1 => Player.new!(%{id: 1, name: "p1", state: "active"}),
          2 => Player.new!(%{id: 2, name: "p2", state: "active"}),
          3 => Player.new!(%{id: 3, name: "p3", state: "active"}),
          4 => Player.new!(%{id: 4, name: "p4", state: "active"})
        },
        matches: %{
          1 => %Match{id: 1, player_ids: [1, 2], round_position: 0, state: "game_over"},
          2 => %Match{id: 2, player_ids: [3, 4], round_position: 0, state: "playing"}
        }
      })

    result = Swiss.maybe_finish_round_after_finish_match(tournament)

    assert result.current_round_position == tournament.current_round_position
    assert result.break_state == "off"
    assert is_nil(result.last_round_ended_at)
  end
end
