defmodule Codebattle.PlayerReport do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.{Game, User}

  @type t :: %__MODULE__{}

  # @states ~w(draft on_moderation processed)

  schema "player_report" do
    field(:reason, :string)
    field(:comment, :string)
    # field(:state, :string) handled / not_handled / etc....

    belongs_to(:game, Game)
    belongs_to(:player, User, foreign_key: :user_id)

    timestamps()
  end

  def changeset(player_report = %__MODULE__{}, attrs) do
    player_report
    |> cast(attrs, [])
    |> validate_required([
      :game_id,
      :user_id,
      :reason,
      :comment
    ])

    # |> validate_inclusion(:state, @states)
  end
end
