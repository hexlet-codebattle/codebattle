defmodule Codebattle.UserGame do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.UserGame

  @results ~w(undefined won lost gave_up timeout)

  schema "user_games" do
    field(:result, :string)
    field(:creator, :boolean)
    field(:rating, :integer)
    field(:rating_diff, :integer)
    field(:lang, :string)
    field(:is_bot, :boolean)

    timestamps()

    belongs_to(:user, Codebattle.User)
    belongs_to(:game, Codebattle.Game)
    belongs_to(:playbook, Codebattle.Playbook)
  end

  @doc false
  def changeset(%UserGame{} = user_game, attrs) do
    user_game
    |> cast(attrs, [
      :user_id,
      :game_id,
      :is_bot,
      :playbook_id,
      :result,
      :creator,
      :rating,
      :rating_diff,
      :lang
    ])
    |> validate_inclusion(:result, @results)
    |> validate_required([:user_id, :game_id])
  end
end
