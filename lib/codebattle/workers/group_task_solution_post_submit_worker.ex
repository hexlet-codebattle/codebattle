defmodule Codebattle.Workers.GroupTaskSolutionPostSubmitWorker do
  @moduledoc """
  Runs the post-submit pipeline for a group task solution off the request
  path. The HTTP API inserts the `group_task_solutions` row, enqueues this
  worker, and returns 201 immediately; the worker loads the solution and
  drives `maybe_run_after_solution_submission/3` synchronously (pending
  runs insert, "pending" broadcast, runner call, "finished" broadcast).
  """

  use Oban.Worker, max_attempts: 3

  alias Codebattle.GroupTaskSolution
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"solution_id" => solution_id}}) do
    case Repo.get(GroupTaskSolution, solution_id) do
      nil ->
        :ok

      solution ->
        GroupTournamentContext.maybe_run_after_solution_submission(
          solution.group_tournament_id,
          solution
        )

        :ok
    end
  end
end
