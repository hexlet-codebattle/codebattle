defmodule Codebattle.TournamentTest do
  use CodebattleWeb.ConnCase, async: true

  import CodebattleWeb.Factory
  alias Codebattle.Tournament

  test "updates players" do
    tournament = insert(:tournament)
    players = insert_pair(:user)

    result =
      tournament
      |> Tournament.changeset(%{
        data: %{players: players, matches: [%{state: "new", players: players}]}
      })
      |> Repo.update!()

    assert result.data.players
    assert result.data.matches
  end
end
