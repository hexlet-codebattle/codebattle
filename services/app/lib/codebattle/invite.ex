defmodule Codebattle.Invite do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query, warn: false
  alias Codebattle.Repo
  alias __MODULE__
  alias Codebattle.GameProcess.{Play, ActiveGames, FsmHelpers}
  alias Codebattle.{User, Languages, UsersActivityServer}

  defmodule GameParams do
    use Ecto.Schema
    import Ecto.Changeset
    @primary_key false
    @timeout_seconds 3600

    @derive {Jason.Encoder, only: [:level, :type, :timeout_seconds]}

    embedded_schema do
      field(:level, :string, default: "elementary")
      field(:type, :string, default: "public")
      field(:timeout_seconds, :integer, default: @timeout_seconds)
    end

    def changeset(struct, params) do
      cast(struct, params, [:level, :type, :timeout_seconds])
    end
  end

  @derive {Jason.Encoder, only: [:state, :creator, :recepient, :game_params]}

  schema "invites" do
    field :state, :string, default: "pending"
    embeds_one(:game_params, GameParams, on_replace: :update)
    belongs_to(:creator, Codebattle.User)
    belongs_to(:recepient, Codebattle.User)
    belongs_to(:game, Codebattle.Game)
    timestamps()
  end

  def changeset(invite, attrs) do
    invite
    |> cast(attrs, [:state, :creator_id, :recepient_id])
    |> cast_embed(:game_params)
    |> validate_required([:state])
  end

  def list_invites do
    Repo.all(Invite)
  end

  def list_active_invites(user_id) do
    query =
      from i in Invite,
      where: i.state == "pending" and (i.creator_id == ^user_id or i.recepient_id == ^user_id)
    Repo.all(query)
    |> Repo.preload([:creator, :recepient])
  end

  def get_invite!(id), do: Repo.get!(Invite, id) |> Repo.preload([:creator, :recepient])

  def create_invite(attrs \\ %{}) do
    %Invite{}
    |> Invite.changeset(attrs)
    |> Repo.insert()
  end

  def update_invite(%Invite{} = invite, attrs) do
    invite
    |> Invite.changeset(attrs)
    |> Repo.update()
  end

  def delete_invite(%Invite{} = invite) do
    Repo.delete(invite)
  end

  def change_invite(%Invite{} = invite, attrs \\ %{}) do
    Invite.changeset(invite, attrs)
  end

  def accept_invite(params) do
    recepient_id = params.recepient_id
    invite_id = params.id || raise "Not found!"
    invite = get_invite!(invite_id)
    if (invite.recepient_id != recepient_id) do
      raise "Not authorized!"
    end
    users = [invite.creator, invite.recepient]
    case Play.start_game(Map.merge(invite.game_params, %{users: users})) do
      {:ok, fsm} ->
        game_id = FsmHelpers.get_game_id(fsm)
        Invite.update_invite(invite, %{state: "accepted", game_id: game_id})
      {:error, reason} -> {:error, reason}
    end
  end
end
