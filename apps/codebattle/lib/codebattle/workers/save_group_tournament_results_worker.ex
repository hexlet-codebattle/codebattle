defmodule Codebattle.Workers.SaveGroupTournamentResultsWorker do
  @moduledoc false

  use Oban.Worker

  alias Codebattle.Event
  alias Codebattle.GroupTournament
  alias Codebattle.UserEvent.Stage.Context, as: StageContext

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"group_tournament_id" => group_tournament_id}}) do
    group_tournament = GroupTournament.Context.get_group_tournament!(group_tournament_id)

    if group_tournament.event_id do
      event = Event.get!(group_tournament.event_id)
      event_stage = Enum.find(event.stages, &(&1.group_tournament_id == group_tournament_id))

      if event_stage && event_stage.save_results != false do
        StageContext.mark_stages_completed_by_group_tournament(group_tournament_id)
      end
    end

    :ok
  end
end
