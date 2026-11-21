defmodule Codebattle.Repo.Migrations.DropGroupTournaments do
  @moduledoc false

  use Ecto.Migration

  def up do
    execute("""
    DELETE FROM oban_jobs
    WHERE worker IN (
      'Codebattle.Workers.DevRoleRemoveWorker',
      'Codebattle.Workers.ExternalSetupWorker',
      'Codebattle.Workers.GroupTaskSolutionPostSubmitWorker',
      'Codebattle.Workers.GroupTaskSolutionRunWorker',
      'Codebattle.Workers.GroupTournamentFinalizeWorker',
      'Codebattle.Workers.GroupTournamentOccupyWorker',
      'Codebattle.Workers.RepoDeleteWorker',
      'Codebattle.Workers.RepoHideWorker',
      'Codebattle.Workers.RepoUnveilWorker',
      'Codebattle.Workers.SaveGroupTournamentResultsWorker',
      'Codebattle.Workers.SeatOccupyWorker',
      'Codebattle.Workers.SeatReleaseWorker',
      'Codebattle.Workers.ViewerRoleAddWorker'
    )
    OR (
      worker = 'Codebattle.Workers.PlatformInviteAdvancerWorker'
      AND EXISTS (
        SELECT 1
        FROM external_platform_invites AS invite
        WHERE invite.id::text = oban_jobs.args->>'invite_id'
          AND invite.group_tournament_id IS NOT NULL
      )
    )
    """)

    execute("DELETE FROM external_platform_invites WHERE group_tournament_id IS NOT NULL")

    alter table(:external_platform_invites) do
      remove(:group_tournament_id)
    end

    execute("""
    UPDATE events
    SET stages = (
      SELECT jsonb_agg(stage - 'group_tournament_id' - 'group_tournament_meta' - 'next_round_text' ORDER BY position)
      FROM jsonb_array_elements(events.stages) WITH ORDINALITY AS stages(stage, position)
    )
    WHERE jsonb_typeof(stages) = 'array'
      AND jsonb_path_exists(
        stages,
        '$[*] ? (exists(@.group_tournament_id) || exists(@.group_tournament_meta) || exists(@.next_round_text))'
      )
    """)

    execute("""
    UPDATE user_event_stages
    SET status = 'completed', finished_at = COALESCE(finished_at, updated_at)
    WHERE status = 'started' AND tournament_finished
    """)

    alter table(:user_event_stages) do
      remove(:group_tournament_id)
      remove(:group_tournament_finished)
      remove(:group_tournament_score)
      remove(:group_tournament_total_score)
      remove(:group_tournament_time_spent_in_seconds)
    end

    alter table(:tournaments) do
      remove(:group_tournament_id)
    end

    drop(table(:group_tournament_round_scores))
    drop(table(:user_group_tournament_runs))
    drop(table(:user_group_tournaments))
    drop(table(:group_tournament_players))
    drop(table(:group_task_solutions))
    drop(table(:group_tournaments))
    drop(table(:group_tasks))
  end

  def down do
    raise Ecto.MigrationError, message: "Dropped group tournament data cannot be restored"
  end
end
