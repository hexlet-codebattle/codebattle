defmodule Codebattle.UserGame do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset
  alias Codebattle.UserGame

  schema "user_games" do
    belongs_to(:user, Codebattle.User)
    belongs_to(:game, Codebattle.Game)

    field(:result, :string)
    field(:creator, :boolean)
    field(:rating, :integer)
    field(:rating_diff, :integer)
    field(:lang, :string)
    field(:is_anonymous, :boolean, default: false)

    timestamps()
  end

  @doc false
  def changeset(%UserGame{} = user_game, attrs) do
    user_game
    |> cast(attrs, [
      :user_id,
      :game_id,
      :result,
      :creator,
      :rating,
      :rating_diff,
      :lang,
      :is_anonymous
    ])
    |> validate_required([:user_id, :game_id])
  end
end
