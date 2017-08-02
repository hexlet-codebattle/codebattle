defmodule CodebattleWeb.UserGame do
  @moduledoc false
  use Codebattle.Web, :model

  schema "user_games" do
    field :user_id, :integer
    field :game_id, :integer
    field :result, :string

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [:user_id, :game_id, :result])
    |> validate_required([:user_id, :game_id, :result])
  end
end
