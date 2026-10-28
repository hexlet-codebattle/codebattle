defmodule Codebattle.Game.BotDetection.Review do
  @moduledoc "Append-only moderator decisions, separate from heuristic reports and complaints."
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Game.BotDetection
  alias Codebattle.Game.BotDetection.PlayerReport
  alias Codebattle.Repo
  alias Codebattle.User

  @derive {Jason.Encoder,
           only: [:id, :user_id, :reviewer_id, :outcome, :reason, :replay_offset_ms, :report_version, :inserted_at]}
  schema "game_fair_play_reviews" do
    belongs_to :game, Codebattle.Game
    belongs_to :user, User
    belongs_to :reviewer, User
    field :outcome, :string
    field :reason, :string
    field :replay_offset_ms, :integer
    field :report_version, :integer
    field :report_snapshot, :map
    timestamps(updated_at: false)
  end

  def record(reviewer, game_id, user_id, attrs) do
    if User.admin_or_moderator?(reviewer) do
      case BotDetection.get_report(game_id, user_id) do
        %PlayerReport{} = report ->
          %__MODULE__{}
          |> cast(attrs, [:outcome, :reason, :replay_offset_ms])
          |> put_change(:game_id, report.game_id)
          |> put_change(:user_id, report.user_id)
          |> put_change(:reviewer_id, reviewer.id)
          |> put_change(:report_version, report.version)
          |> put_change(:report_snapshot, Map.take(report, [:score, :level, :signals, :evidence, :telemetry_snapshot]))
          |> validate_required([:outcome, :reason])
          |> validate_inclusion(:outcome, ~w(confirmed_assistance legitimate inconclusive))
          |> validate_length(:reason, min: 10, max: 5000)
          |> validate_number(:replay_offset_ms, greater_than_or_equal_to: 0)
          |> foreign_key_constraint(:game_id)
          |> foreign_key_constraint(:user_id)
          |> foreign_key_constraint(:reviewer_id)
          |> Repo.insert()

        nil ->
          {:error, :report_not_found}
      end
    else
      {:error, :forbidden}
    end
  end

  def list(game_id) do
    Repo.all(from r in __MODULE__, where: r.game_id == ^game_id, order_by: [desc: r.id])
  end
end
