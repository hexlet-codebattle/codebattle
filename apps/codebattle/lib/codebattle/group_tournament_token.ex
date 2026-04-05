defmodule Codebattle.GroupTournamentToken do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTournament
  alias Codebattle.User

  @type t :: %__MODULE__{}

  schema "group_tournament_tokens" do
    belongs_to(:user, User)
    belongs_to(:group_tournament, GroupTournament)

    field(:token, :string)

    timestamps()
  end

  def changeset(group_tournament_token, attrs \\ %{}) do
    group_tournament_token
    |> cast(attrs, [:user_id, :group_tournament_id, :token])
    |> validate_required([:user_id, :group_tournament_id, :token])
    |> validate_length(:token, min: 16, max: 255)
    |> unique_constraint(:token)
    |> unique_constraint(:group_tournament_id,
      name: :group_tournament_tokens_user_id_group_tournament_id_index
    )
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:group_tournament_id)
  end
end
