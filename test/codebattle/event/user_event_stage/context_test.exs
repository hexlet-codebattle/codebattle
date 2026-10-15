defmodule Codebattle.UserEvent.Stage.ContextTest do
  use Codebattle.DataCase, async: true
  use Oban.Testing, repo: Codebattle.Repo

  alias Codebattle.UserEvent
  alias Codebattle.UserEvent.Stage.Context
  alias Codebattle.Workers.SaveGroupTournamentResultsWorker
  alias Codebattle.Workers.SaveTournamentResultsWorker

  test "enqueues tournament result persistence jobs" do
    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, _job} = Context.save_tournament_results_async(10)
      assert_enqueued(worker: SaveTournamentResultsWorker, args: %{"tournament_id" => 10})

      assert {:ok, _job} = Context.save_group_tournament_results_async(20)
      assert_enqueued(worker: SaveGroupTournamentResultsWorker, args: %{"group_tournament_id" => 20})
    end)
  end

  test "stores result metrics and marks tournament stages completed" do
    user = insert(:user)
    event = insert(:event)
    tournament = insert(:tournament)
    group_tournament = insert(:group_tournament)
    {:ok, user_event} = UserEvent.create(%{user_id: user.id, event_id: event.id, status: "pending"})

    {:ok, staged} =
      UserEvent.upsert_stages(user_event, [
        %{
          slug: "final",
          status: :started,
          tournament_id: tournament.id,
          group_tournament_id: group_tournament.id
        }
      ])

    result = %{
      user_id: user.id,
      tournament_id: tournament.id,
      wins_count: 2,
      games_count: 3,
      score: 50,
      time_spent_in_seconds: 42
    }

    assert :ok = Context.save_tournament_results(event.id, [result, %{result | user_id: -1}])
    stage = staged.id |> UserEvent.get!() |> UserEvent.get_stage("final")
    assert {stage.wins_count, stage.games_count, stage.score} == {2, 3, 50}
    assert stage.time_spent_in_seconds == 42
    assert stage.tournament_finished

    assert :ok = Context.mark_stages_completed(event.id, tournament.id)
    stage = staged.id |> UserEvent.get!() |> UserEvent.get_stage("final")
    assert stage.status == :completed
    assert stage.finished_at

    assert :ok = Context.mark_stages_completed_by_group_tournament(group_tournament.id)
    stage = staged.id |> UserEvent.get!() |> UserEvent.get_stage("final")
    assert stage.group_tournament_finished
  end
end
