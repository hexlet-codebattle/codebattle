defmodule Codebattle.UserGameReportTest do
  use Codebattle.DataCase

  alias Codebattle.UserGameReport

  test "creates, queries, paginates, updates, and confirms reports" do
    reporter = insert(:user)
    offender = insert(:user)
    tournament = insert(:tournament)
    game = insert(:game, tournament_id: tournament.id)

    attrs = %{
      comment: "Suspicious solution",
      game_id: game.id,
      tournament_id: tournament.id,
      reporter_id: reporter.id,
      offender_id: offender.id,
      reason: :cheater
    }

    assert {:error, invalid} = UserGameReport.create(%{})
    refute invalid.valid?

    assert {:ok, first} = UserGameReport.create(attrs)
    assert first.reporter.id == reporter.id
    assert first.offender.id == offender.id
    assert UserGameReport.get!(first.id).id == first.id
    assert UserGameReport.get(first.id).id == first.id
    assert UserGameReport.get(-1) == nil
    assert UserGameReport.get_by!(game_id: game.id).id == first.id
    assert UserGameReport.get_by(game_id: -1) == nil
    assert Enum.map(UserGameReport.list_by_game(game.id), & &1.id) == [first.id]

    assert {:ok, second} = UserGameReport.create(%{attrs | comment: "Another report"})

    assert tournament.id
           |> UserGameReport.list_by_tournament(offset: 1, limit: 1, ignored: true)
           |> Enum.map(& &1.id) == [second.id]

    assert {:ok, updated} = UserGameReport.update(first, %{state: :processed})
    assert updated.state == :processed
    assert {:error, update_error} = UserGameReport.update(first, %{comment: nil})
    refute update_error.valid?

    assert {2, nil} = UserGameReport.mark_as_confirmed(tournament.id, offender.id)
    assert Enum.all?(UserGameReport.list_by_tournament(tournament.id), &(&1.state == :confirmed))
  end
end
