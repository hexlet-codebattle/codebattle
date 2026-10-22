defmodule CodebattleWeb.TournamentChannelLiveMatchesTest do
  use ExUnit.Case, async: true

  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.Match
  alias Codebattle.Tournament.Player
  alias CodebattleWeb.TournamentChannel

  test "replies with the games being played, newest first, and their players" do
    players = Map.new([1, 2, 3, 4, 5], &{Helpers.to_id(&1), %Player{id: &1, name: "p#{&1}"}})

    matches = %{
      10 => %Match{id: 10, state: "playing", player_ids: [1, 2]},
      11 => %Match{id: 11, state: "game_over", player_ids: [3, 4]},
      12 => %Match{id: 12, state: "playing", player_ids: [3, 5]}
    }

    socket = %Phoenix.Socket{
      assigns: %{
        tournament_info: %{id: 1, players: players, matches: matches, players_table: nil, matches_table: nil}
      }
    }

    assert {:reply, {:ok, %{matches: live, players: live_players}}, ^socket} =
             TournamentChannel.handle_in("tournament:matches:request_live", %{}, socket)

    assert Enum.map(live, & &1.id) == [12, 10]
    assert live_players |> Enum.map(& &1.id) |> Enum.sort() == [1, 2, 3, 5]
  end
end
