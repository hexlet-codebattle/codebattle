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
  alias Codebattle.Game.BotDetection.LanguageTemplates
  alias Codebattle.Game.BotDetection.PlayerReport
  alias Codebattle.Game.BotDetection.RiskScorer
  alias Codebattle.Game.BotDetection.Worker
  alias Codebattle.Game.Context, as: GameContext
  alias Codebattle.Game.EditorEventBatch
  alias Codebattle.Game.Helpers
  alias Codebattle.Repo

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
        players = Helpers.get_players(game)

        analyses =
          Enum.map(players, fn player ->
            analyze_player(game, player, Map.get(batches_by_user, player.id, []))
          end)

        {:ok, analyses}

      {:error, _} = err ->
        err
    end
  end

  @doc """
  Run the pipeline for a single player. `player` should be a
  `Codebattle.Game.Player` struct (or any map exposing `:id`,
  `:editor_text`, `:editor_lang`).
  """
  @spec analyze_player(map(), map(), [EditorEventBatch.t()]) :: Analysis.t()
  def analyze_player(game, player, batches) do
    stats = BatchAggregator.aggregate(batches)
    final_text = Map.get(player, :editor_text) || ""
    final_lang = Map.get(player, :editor_lang) || Map.get(player, :lang)
    code_analysis = CodeAnalyzer.analyze(final_text)
    template_length = LanguageTemplates.length_for(final_lang)
    final_length = String.length(final_text)
    effective = max(0, final_length - template_length)

    %{score: score, level: level, signals: signals} =
      RiskScorer.score(%{
        stats: stats,
        code_analysis: code_analysis,
        final_length: final_length,
        template_length: template_length
      })

    %Analysis{
      game_id: Map.get(game, :id),
      user_id: player.id,
      score: score,
      level: level,
      signals: signals,
      stats: stats,
      code_analysis: code_analysis,
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
    attrs = PlayerReport.from_analysis(analysis)

    %PlayerReport{}
    |> PlayerReport.changeset(attrs)
    |> Repo.insert(
      on_conflict: {:replace_all_except, [:id, :inserted_at]},
      conflict_target: [:game_id, :user_id],
      returning: true
    )
  end

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
  Read persisted reports if any exist for the game; otherwise compute
  the analyses synchronously, persist them and return the freshly-built
  analyses. The caller can convert reports back to analyses via
  `report_to_analysis/1` if needed.
  """
  @spec get_or_analyze(pos_integer() | String.t()) ::
          {:ok, [Analysis.t()]} | {:error, term()}
  def get_or_analyze(game_id) do
    case list_reports(game_id) do
      [] ->
        with {:ok, analyses} <- analyze_game(game_id),
             {:ok, _reports} <- persist_analyses(analyses) do
          {:ok, analyses}
        end

      reports ->
        {:ok, Enum.map(reports, &report_to_analysis/1)}
    end
  end

  @doc "Inverse of `PlayerReport.from_analysis/1` (no `final_text`/`final_lang`)."
  @spec report_to_analysis(PlayerReport.t()) :: Analysis.t()
  def report_to_analysis(%PlayerReport{} = r) do
    %Analysis{
      game_id: r.game_id,
      user_id: r.user_id,
      score: r.score,
      level: level_to_atom(r.level),
      signals: r.signals || [],
      stats: stringify_keys(r.stats),
      code_analysis: stringify_keys(r.code_analysis),
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
  `:bot_detection` queue and never raises — failures are logged and
  swallowed so the engine path never crashes on telemetry analysis.
  """
  @spec schedule_analysis_after_game(pos_integer() | String.t() | map()) :: :ok
  def schedule_analysis_after_game(%{id: id}), do: schedule_analysis_after_game(id)

  def schedule_analysis_after_game(game_id) do
    case schedule_analysis(game_id) do
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

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)

  defp level_to_atom("high"), do: :high
  defp level_to_atom("medium"), do: :medium
  defp level_to_atom("low"), do: :low
  defp level_to_atom(_), do: :none

  defp stringify_keys(nil), do: nil
  defp stringify_keys(map) when is_map(map), do: map
end
