defmodule Codebattle.UserGroupTournament do
  @moduledoc false

  use Ecto.Schema

  import Ecto.Changeset

  alias Codebattle.GroupTournament
  alias Codebattle.User
  alias Codebattle.UserGroupTournamentRun

  @states ~w(pending provisioning ready failed)
  @step_states ~w(pending completed failed)

  @type t :: %__MODULE__{}

  @derive {Jason.Encoder,
           only: [
             :id,
             :user_id,
             :group_tournament_id,
             :state,
             :repo_state,
             :role_state,
             :secret_state,
             :workplace_state,
             :release_state,
             :viewer_role_state,
             :dev_role_removal_state,
             :token,
             :repo_url,
             :repo_external_id,
             :role,
             :secret_key,
             :secret_group,
             :repo_response,
             :role_response,
             :secret_response,
             :workplace_response,
             :release_response,
             :viewer_role_response,
             :dev_role_removal_response,
             :last_error,
             :inserted_at,
             :updated_at
           ]}

  schema "user_group_tournaments" do
    belongs_to(:user, User)
    belongs_to(:group_tournament, GroupTournament)
    has_many(:runs, UserGroupTournamentRun)

    field(:state, :string, default: "pending")
    field(:repo_state, :string, default: "pending")
    field(:role_state, :string, default: "pending")
    field(:secret_state, :string, default: "pending")
    field(:workplace_state, :string, default: "pending")
    field(:release_state, :string, default: "pending")
    field(:viewer_role_state, :string, default: "pending")
    field(:dev_role_removal_state, :string, default: "pending")

    field(:token, :string)
    field(:repo_url, :string)
    field(:repo_external_id, :string)
    field(:role, :string)
    field(:secret_key, :string)
    field(:secret_group, :string)

    field(:repo_response, :map, default: %{})
    field(:role_response, :map, default: %{})
    field(:secret_response, :map, default: %{})
    field(:workplace_response, :map, default: %{})
    field(:release_response, :map, default: %{})
    field(:viewer_role_response, :map, default: %{})
    field(:dev_role_removal_response, :map, default: %{})
    field(:last_error, :map, default: %{})

    timestamps()
  end

  def changeset(user_group_tournament, attrs \\ %{}) do
    user_group_tournament
    |> cast(attrs, [
      :user_id,
      :group_tournament_id,
      :state,
      :repo_state,
      :role_state,
      :secret_state,
      :workplace_state,
      :release_state,
      :viewer_role_state,
      :dev_role_removal_state,
      :token,
      :repo_url,
      :repo_external_id,
      :role,
      :secret_key,
      :secret_group,
      :repo_response,
      :role_response,
      :secret_response,
      :workplace_response,
      :release_response,
      :viewer_role_response,
      :dev_role_removal_response,
      :last_error
    ])
    |> validate_required([:user_id, :group_tournament_id, :state, :repo_state, :role_state, :secret_state])
    |> validate_length(:token, min: 16, max: 255)
    |> validate_inclusion(:state, @states)
    |> validate_inclusion(:repo_state, @step_states)
    |> validate_inclusion(:role_state, @step_states)
    |> validate_inclusion(:secret_state, @step_states)
    |> validate_inclusion(:workplace_state, @step_states)
    |> validate_inclusion(:release_state, @step_states)
    |> validate_inclusion(:viewer_role_state, @step_states)
    |> validate_inclusion(:dev_role_removal_state, @step_states)
    |> unique_constraint(:token)
    |> unique_constraint(:user_id, name: :user_group_tournaments_user_id_group_tournament_id_index)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:group_tournament_id)
  end
end
