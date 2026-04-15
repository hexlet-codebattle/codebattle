defmodule Codebattle.ExternalPlatformInvite do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTournament
  alias Codebattle.User

  @states ~w(pending creating invited accepted failed expired)

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :user_id,
             :group_tournament_id,
             :state,
             :operation_id,
             :status_url,
             :invite_link,
             :expires_at,
             :response,
             :inserted_at,
             :updated_at
           ]}

  schema "external_platform_invites" do
    belongs_to(:user, User)
    belongs_to(:group_tournament, GroupTournament)

    field(:state, :string, default: "pending")
    field(:operation_id, :string)
    field(:status_url, :string)
    field(:invite_link, :string)
    field(:expires_at, :utc_datetime)
    field(:response, :map, default: %{})

    timestamps()
  end

  def changeset(invite, attrs \\ %{}) do
    invite
    |> cast(attrs, [
      :user_id,
      :group_tournament_id,
      :state,
      :operation_id,
      :status_url,
      :invite_link,
      :expires_at,
      :response
    ])
    |> validate_required([:user_id, :state])
    |> validate_inclusion(:state, @states)
    |> unique_constraint(:user_id, name: :external_platform_invites_user_id_group_tournament_id_index)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:group_tournament_id)
  end

  def states, do: @states
end
