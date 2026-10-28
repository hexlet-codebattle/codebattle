defmodule Codebattle.Game.BotDetection do
  @moduledoc """
  Public API for bot/AI detection on game telemetry.

  Two execution modes:

    * **Synchronous** — `analyze_game/1` runs the full pipeline in-process
      and returns `[Analysis.t()]` without touching the database.

    * **Asynchronous + persisted** — `schedule_analysis/1` enqueues an
      `Oban` job that runs the pipeline and upserts a
      `BotDetection.PlayerReport` row per player. `get_or_analyze/1`
      reads the persisted reports if they exist, otherwise computes them
      synchronously and persists them — making the controller path
      cache-aware without an explicit if/else.

  The pipeline:

      EditorEventBatch.list_by_game/1
        ↓
      BatchAggregator.aggregate/1   (per player)
      CodeAnalyzer.analyze/1        (per player)
      LanguageTemplates.length_for/1
        ↓
      RiskScorer.score/1
        ↓
      Analysis struct
  """

  import Ecto.Query

  alias Codebattle.Game.BotDetection.Analysis
  alias Codebattle.Game.BotDetection.BatchAggregator
  alias Codebattle.Game.BotDetection.CodeAnalyzer
  alias Codebattle.Game.BotDetection.EditorHistory
  alias Codebattle.Game.BotDetection.LanguageTemplates
  alias Codebattle.Game.BotDetection.PlayerReport
  alias Codebattle.Game.BotDetection.RiskScorer
  alias Codebattle.Game.BotDetection.Worker
  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Game.EditorEventBatch
  alias Codebattle.Game.Helpers
  alias Codebattle.Repo
  alias Codebattle.User

  # Bump when the scoring or the stats change: older persisted reports are recomputed on read.
  @report_version 6
  @after_game_delay_sec 10

  @doc """
  Run the full pipeline for the given game and return one `Analysis`
  struct per player. Pure — does not write to the DB.
  """
  @spec analyze_game(pos_integer() | String.t()) ::
          {:ok, [Analysis.t()]} | {:error, :not_found}
  def analyze_game(game_id) do
    case GameContext.fetch_game(game_id) do
      {:ok, game} ->
        batches = EditorEventBatch.list_by_game(game.id)
        batches_by_user = Enum.group_by(batches, & &1.user_id)

        players =
          game
          |> Helpers.get_players()
          |> Enum.reject(&ignored_player?/1)

        replay = if players == [], do: %{texts: %{}, summaries: %{}}, else: EditorHistory.snapshot(game)

        analyses =
          Enum.map(players, fn player ->
            player = competitive_player(player, replay.texts[player.id])

            analyze_player(game, player, Map.get(batches_by_user, player.id, []), Map.get(replay.summaries, player.id))
          end)

        {:ok, analyses}

      {:error, _} = err ->
        err
    end
  end

  @doc """
  Run the pipeline for a single player. `player` should be a
  `Codebattle.Game.Player` struct (or any map exposing `:id`,
  `:editor_text`, `:editor_lang`). `history` is the player's
  `EditorHistory` summary, if the game has editor records.
  """
  @spec analyze_player(map(), map(), [EditorEventBatch.t()], map() | nil) :: Analysis.t()
  def analyze_player(game, player, batches, history \\ nil) do
    snapshot = EditorEventBatch.snapshot(batches)
    competitive = competitive_batches(batches, game_duration_ms(game))
    stats = BatchAggregator.aggregate(competitive, duration_ms: game_duration_ms(game))
    final_text = Map.get(player, :editor_text) || ""
    final_lang = Map.get(player, :editor_lang) || Map.get(player, :lang)
    code_analysis = CodeAnalyzer.analyze(final_text)
    template_length = LanguageTemplates.length_for(Map.get(game, :task), final_lang)
    final_length = String.length(final_text)
    effective = max(0, final_length - template_length)
    stats = add_quality_limits(stats, effective, length(batches) - length(competitive))

    %{score: score, level: level, signals: signals, evidence: evidence} =
      RiskScorer.score(%{
        stats: stats,
        batches: competitive,
        code_analysis: code_analysis,
        editor_history: history,
        final_length: final_length,
        template_length: template_length
      })

    %Analysis{
      game_id: Map.get(game, :id),
      user_id: player.id,
      score: score,
      level: level,
      signals: signals,
      evidence: evidence,
      stats: stats,
      code_analysis: code_analysis,
      editor_history: history,
      telemetry_snapshot: snapshot_for_game(snapshot, game),
      final_length: final_length,
      template_length: template_length,
      effective_added_length: effective,
      final_text: final_text,
      final_lang: final_lang
    }
  end

  @doc """
  Run the pipeline and persist one `PlayerReport` row per player.
  Idempotent — repeated calls upsert on `(game_id, user_id)`.
  """
  @spec analyze_and_persist(pos_integer() | String.t()) ::
          {:ok, [PlayerReport.t()]} | {:error, term()}
  def analyze_and_persist(game_id) do
    with {:ok, analyses} <- analyze_game(game_id) do
      persist_analyses(analyses)
    end
  end

  @doc """
  Upsert the given analyses as `PlayerReport` rows. Returns `{:ok, [report]}`
  with the persisted records (in input order) or the first failing changeset.
  """
  @spec persist_analyses([Analysis.t()]) :: {:ok, [PlayerReport.t()]} | {:error, Ecto.Changeset.t()}
  def persist_analyses(analyses) do
    analyses
    |> Enum.reduce_while({:ok, []}, fn analysis, {:ok, acc} ->
      case upsert_report(analysis) do
        {:ok, nil} -> {:cont, {:ok, acc}}
        {:ok, report} -> {:cont, {:ok, [report | acc]}}
        {:error, changeset} -> {:halt, {:error, changeset}}
      end
    end)
    |> case do
      {:ok, reversed} -> {:ok, Enum.reverse(reversed)}
      err -> err
    end
  end

  defp upsert_report(%Analysis{} = analysis) do
    attrs = analysis |> PlayerReport.from_analysis() |> Map.put(:version, @report_version)

    if Repo.exists?(from(u in User, where: u.id == ^analysis.user_id and u.is_bot == false)) do
      %PlayerReport{}
      |> PlayerReport.changeset(attrs)
      |> Repo.insert(
        on_conflict: {:replace_all_except, [:id, :inserted_at]},
        conflict_target: [:game_id, :user_id],
        returning: true
      )
    else
      {:ok, nil}
    end
  end

  defp ignored_player?(%{is_bot: true}), do: true
  defp ignored_player?(%{is_guest: true}), do: true
  defp ignored_player?(%{id: nil}), do: true
  defp ignored_player?(_player), do: false

  @doc """
  Read all persisted reports for a game, ordered by user id.
  """
  @spec list_reports(pos_integer() | String.t()) :: [PlayerReport.t()]
  def list_reports(game_id) do
    PlayerReport
    |> where([r], r.game_id == ^to_int(game_id))
    |> order_by([r], asc: r.user_id)
    |> Repo.all()
  end

  @doc "Read a single persisted report or `nil`."
  @spec get_report(pos_integer() | String.t(), pos_integer()) :: PlayerReport.t() | nil
  def get_report(game_id, user_id) do
    Repo.get_by(PlayerReport, game_id: to_int(game_id), user_id: user_id)
  end

  @doc """
  Read persisted reports if any exist for the game (and were built by the
  current scoring); otherwise compute the analyses synchronously, persist
  them and return the freshly-built analyses. The caller can convert reports
  back to analyses via `report_to_analysis/1` if needed.
  """
  @spec get_or_analyze(pos_integer() | String.t()) ::
          {:ok, [Analysis.t()]} | {:error, term()}
  def get_or_analyze(game_id) do
    with {:ok, game} <- GameContext.fetch_game(game_id) do
      players = game |> Helpers.get_players() |> Enum.reject(&ignored_player?/1)
      reports = game_id |> list_reports() |> Map.new(&{&1.user_id, &1})
      snapshots = EditorEventBatch.snapshots_by_user(game.id)

      if game.state in ["game_over", "timeout"] and
           Enum.all?(players, &fresh_report?(reports[&1.id], snapshots[&1.id], game)) do
        {:ok, Enum.map(players, &report_to_analysis(reports[&1.id]))}
      else
        refresh_analyses(game_id)
      end
    end
  end

  defp refresh_analyses(game_id) do
    with {:ok, analyses} <- analyze_game(game_id),
         {:ok, _reports} <- persist_analyses(analyses) do
      {:ok, analyses}
    end
  end

  defp fresh_report?(nil, _snapshot, _game), do: false

  defp fresh_report?(report, snapshot, game) do
    report.version >= @report_version and not is_nil(report.final_text) and
      report.telemetry_snapshot == snapshot_for_game(snapshot || EditorEventBatch.snapshot([]), game)
  end

  defp snapshot_for_game(snapshot, game) do
    Map.merge(snapshot, %{"game_state" => Map.get(game, :state), "duration_ms" => game_duration_ms(game)})
  end

  @doc "Inverse of `PlayerReport.from_analysis/1`."
  @spec report_to_analysis(PlayerReport.t()) :: Analysis.t()
  def report_to_analysis(%PlayerReport{} = r) do
    %Analysis{
      game_id: r.game_id,
      user_id: r.user_id,
      score: r.score,
      level: level_to_atom(r.level),
      signals: r.signals || [],
      evidence: r.evidence || [],
      # No telemetry is stored as an empty map.
      stats: if(r.stats == %{}, do: nil, else: stringify_keys(r.stats)),
      code_analysis: stringify_keys(r.code_analysis),
      editor_history: if(r.editor_history == %{}, do: nil, else: r.editor_history),
      telemetry_snapshot: r.telemetry_snapshot,
      final_text: r.final_text,
      final_lang: r.final_lang,
      final_length: r.final_length,
      template_length: r.template_length,
      effective_added_length: r.effective_added_length
    }
  end

  @doc """
  Enqueue an Oban job to (re)analyze the given game asynchronously.
  Useful when a moderator wants to refresh a stale report (e.g. clicks
  the "Re-analyze" button on the ML page).
  """
  @spec schedule_analysis(pos_integer() | String.t(), keyword()) ::
          {:ok, Oban.Job.t()} | {:error, term()}
  def schedule_analysis(game_id, opts \\ []) do
    %{game_id: to_int(game_id)}
    |> Worker.new(opts)
    |> Oban.insert()
  end

  @doc """
  Fire-and-forget hook called by `Codebattle.Game.Engine` after every
  finished game. Enqueues the bot-detection worker on the low-priority
  `:bot_detection` queue, a few seconds out so the players' last telemetry
  windows land first, and never raises — failures are logged and
  swallowed so the engine path never crashes on telemetry analysis.
  """
  @spec schedule_analysis_after_game(pos_integer() | String.t() | map()) :: :ok
  def schedule_analysis_after_game(%{id: id}), do: schedule_analysis_after_game(id)

  def schedule_analysis_after_game(game_id) do
    # The editors send their last telemetry window when the game ends, i.e. after this
    # point: analyzing at once would miss it (all of it in a short game).
    case schedule_analysis(game_id, schedule_in: @after_game_delay_sec) do
      {:ok, _job} ->
        :ok

      {:error, reason} ->
        require Logger

        Logger.warning(
          "BotDetection.schedule_analysis_after_game failed game_id=#{inspect(game_id)} reason=#{inspect(reason)}"
        )

        :ok
    end
  rescue
    e ->
      require Logger

      Logger.warning("BotDetection.schedule_analysis_after_game raised #{Exception.message(e)}")
      :ok
  end

  # ── helpers ──────────────────────────────────────────────────────────

  defp competitive_player(player, {text, lang}), do: %{player | editor_text: text, editor_lang: lang}
  defp competitive_player(player, _), do: player

  defp competitive_batches(batches, nil), do: batches

  defp competitive_batches(batches, duration) do
    Enum.filter(batches, &(&1.window_end_offset_ms <= duration))
  end

  defp add_quality_limits(nil, _effective, _excluded), do: nil

  defp add_quality_limits(stats, effective, excluded) do
    issues = stats.quality_issues

    issues =
      if effective >= 60 and stats.total_chars_inserted < effective * 0.6,
        do: ["incomplete_edit_coverage" | issues],
        else: issues

    issues = if excluded > 0, do: ["excluded_post_game_batches" | issues], else: issues
    Map.merge(stats, %{quality_issues: issues, excluded_batch_count: excluded})
  end

  defp game_duration_ms(%{state: state, duration_sec: seconds})
       when state in ["game_over", "timeout"] and is_integer(seconds) and seconds >= 0, do: seconds * 1000 + 999

  defp game_duration_ms(_game), do: nil

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)

  defp level_to_atom("high"), do: :high
  defp level_to_atom("medium"), do: :medium
  defp level_to_atom("low"), do: :low
  defp level_to_atom(_), do: :none

  defp stringify_keys(nil), do: nil
  defp stringify_keys(map) when is_map(map), do: map
end
