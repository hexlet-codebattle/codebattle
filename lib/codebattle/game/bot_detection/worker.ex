defmodule Codebattle.Game.BotDetection.Worker do
  @moduledoc """
  Oban worker that runs the bot-detection pipeline asynchronously.

  Scheduled via:
    * `Codebattle.Game.BotDetection.schedule_analysis/2` — explicit (admin
      "Re-analyze" button on the ML page).
    * `Codebattle.Game.BotDetection.schedule_analysis_after_game/1` — fires
      automatically after every finished game (called from
      `Codebattle.Game.Engine`).

  After persisting the per-player reports the worker checks if the game
  belongs to a tournament. If at least one player was flagged
  `:medium` / `:high`, an alert event is broadcast on the admin-only
  `tournament:<tournament_id>` PubSub topic so moderators can investigate.

  TODO: the matching `tournament:bot_alert` handler in
  `CodebattleWeb.TournamentAdminChannel` (and the FE notification widget)
  isn't wired up yet — the broadcast will simply land in the PubSub bus
  and be dropped until that listener exists.

  Concurrency is capped to 2 in the `:bot_detection` Oban queue so a burst
  of finishing games never starves the rest of the system.
  """

  use Oban.Worker,
    queue: :bot_detection,
    max_attempts: 3,
    priority: 9,
    unique: [keys: [:game_id], period: 30]

  alias Codebattle.Game.BotDetection
  alias Codebattle.Game.BotDetection.PlayerReport
  alias Codebattle.Game.Context, as: GameContext

  require Logger

  @suspicious_levels ["medium", "high"]

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"game_id" => game_id}}) do
    case BotDetection.analyze_and_persist(game_id) do
      {:ok, reports} ->
        maybe_alert_tournament(game_id, reports)
        :ok

      {:error, :not_found} ->
        Logger.warning("BotDetection.Worker: game_id=#{inspect(game_id)} not found, skipping")
        :discard

      {:error, reason} ->
        Logger.error("BotDetection.Worker: game_id=#{inspect(game_id)} failed reason=#{inspect(reason)}")

        {:error, reason}
    end
  end

  defp maybe_alert_tournament(game_id, reports) do
    suspicious = Enum.filter(reports, &(&1.level in @suspicious_levels))

    with [_ | _] <- suspicious,
         {:ok, %{tournament_id: tournament_id}} when not is_nil(tournament_id) <-
           GameContext.fetch_game(game_id) do
      payload = build_alert_payload(game_id, tournament_id, suspicious)

      # NOTE: published on the admin-only `tournament:#{id}` topic.
      # The receiving handler in `CodebattleWeb.TournamentAdminChannel` is
      # NOT implemented yet — that's tracked separately. For now this just
      # surfaces the alert into the PubSub bus.
      Codebattle.PubSub.broadcast("tournament:bot_alert", payload)
    else
      _ -> :ok
    end
  end

  defp build_alert_payload(game_id, tournament_id, suspicious_reports) do
    %{
      tournament_id: tournament_id,
      game_id: game_id,
      reports:
        Enum.map(suspicious_reports, fn %PlayerReport{} = r ->
          %{
            user_id: r.user_id,
            level: r.level,
            score: r.score,
            signals: r.signals
          }
        end)
    }
  end
end
