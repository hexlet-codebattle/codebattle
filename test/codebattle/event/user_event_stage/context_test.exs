defmodule Codebattle.UserEvent.Stage.ContextTest do
  use Codebattle.DataCase, async: true
  use Oban.Testing, repo: Codebattle.Repo

  alias Codebattle.Tournament.TournamentUserResult
  alias Codebattle.UserEvent
  alias Codebattle.UserEvent.Stage.Context
  alias Codebattle.Workers.SaveTournamentResultsWorker

  test "enqueues tournament result persistence jobs" do
    Oban.Testing.with_testing_mode(:manual, fn ->
      assert {:ok, _job} = Context.save_tournament_results_async(10)
      assert_enqueued(worker: SaveTournamentResultsWorker, args: %{"tournament_id" => 10})
    end)
  end

  test "stores result metrics and marks tournament stages completed" do
    user = insert(:user)
    event = insert(:event)
    tournament = insert(:tournament)
    {:ok, user_event} = UserEvent.create(%{user_id: user.id, event_id: event.id, status: "pending"})

    {:ok, staged} =
      UserEvent.upsert_stages(user_event, [
        %{
          slug: "final",
          status: :started,
          tournament_id: tournament.id
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
  end

  test "the result worker completes a single-player stage" do
    user = insert(:user)

    event =
      insert(:event,
        stages: [%{slug: "final", name: "Final", type: :tournament, status: :active, playing_type: :single}]
      )

    tournament = insert(:tournament, event_id: event.id, state: "finished")

    {:ok, user_event} =
      UserEvent.create(%{
        user_id: user.id,
        event_id: event.id,
        stages: [%{slug: "final", status: :started, tournament_id: tournament.id}]
      })

    Repo.insert!(%TournamentUserResult{user_id: user.id, tournament_id: tournament.id, score: 50})

    assert :ok = perform_job(SaveTournamentResultsWorker, %{tournament_id: tournament.id})
    stage = user_event.id |> UserEvent.get!() |> UserEvent.get_stage("final")
    assert stage.status == :completed
    assert stage.tournament_finished
    assert stage.score == 50
  end
end
