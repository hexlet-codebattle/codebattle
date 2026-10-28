defmodule Codebattle.Game.BotDetection.PlayerReport do
  @moduledoc """
  Persisted bot-detection report for one player in one game. Built from
  an `Analysis` struct via `from_analysis/1` and stored upserted on
  `(game_id, user_id)`.
  """

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.Game
  alias Codebattle.Game.BotDetection.Analysis
  alias Codebattle.User

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :game_id,
             :user_id,
             :score,
             :level,
             :signals,
             :evidence,
             :stats,
             :code_analysis,
             :editor_history,
             :telemetry_snapshot,
             :final_text,
             :final_lang,
             :final_length,
             :template_length,
             :effective_added_length,
             :version,
             :inserted_at,
             :updated_at
           ]}

  schema "game_bot_detection_reports" do
    belongs_to(:game, Game)
    belongs_to(:user, User)

    field(:score, :integer, default: 0)
    field(:level, :string, default: "none")
    field(:evidence, {:array, :map}, default: [])
    field(:signals, {:array, :string}, default: [])
    field(:stats, :map, default: %{})
    field(:code_analysis, :map, default: %{})
    # BotDetection.EditorHistory: the editor updates the server received.
    field(:editor_history, :map, default: %{})
    field(:telemetry_snapshot, :map, default: %{})
    field(:final_text, :string)
    field(:final_lang, :string)
    field(:final_length, :integer, default: 0)
    field(:template_length, :integer, default: 0)
    field(:effective_added_length, :integer, default: 0)
    field(:version, :integer, default: 1)

    timestamps()
  end

  @doc false
  def changeset(report, attrs) do
    report
    |> cast(attrs, [
      :game_id,
      :user_id,
      :score,
      :level,
      :signals,
      :evidence,
      :stats,
      :code_analysis,
      :editor_history,
      :telemetry_snapshot,
      :final_text,
      :final_lang,
      :final_length,
      :template_length,
      :effective_added_length,
      :version
    ])
    |> validate_required([:game_id, :user_id, :score, :level])
    |> validate_inclusion(:level, ["none", "low", "medium", "high"])
    |> validate_number(:score, greater_than_or_equal_to: 0)
    |> validate_number(:final_length, greater_than_or_equal_to: 0)
    |> validate_number(:template_length, greater_than_or_equal_to: 0)
    |> validate_number(:effective_added_length, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:game_id)
    |> foreign_key_constraint(:user_id)
    |> unique_constraint([:game_id, :user_id])
  end

  @doc "Convert an `Analysis` struct into a map suitable for `changeset/2`."
  @spec from_analysis(Analysis.t()) :: map()
  def from_analysis(%Analysis{} = a) do
    %{
      game_id: a.game_id,
      user_id: a.user_id,
      score: a.score,
      level: Atom.to_string(a.level),
      signals: a.signals,
      evidence: a.evidence,
      stats: a.stats || %{},
      code_analysis: a.code_analysis || %{},
      editor_history: a.editor_history || %{},
      telemetry_snapshot: a.telemetry_snapshot,
      final_text: a.final_text,
      final_lang: a.final_lang,
      final_length: a.final_length,
      template_length: a.template_length,
      effective_added_length: a.effective_added_length
    }
  end
end
