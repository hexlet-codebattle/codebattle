defmodule Codebattle.Invite do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query, warn: false
  alias Codebattle.Repo
  alias __MODULE__
  alias Codebattle.GameProcess.{Play, FsmHelpers}

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

  @derive {Jason.Encoder,
           only: [:id, :state, :creator, :recepient, :game_params, :creator_id, :recepient_id]}

  schema "invites" do
    field(:state, :string, default: "pending")
    embeds_one(:game_params, GameParams, on_replace: :update)
    belongs_to(:creator, Codebattle.User)
    belongs_to(:recepient, Codebattle.User)
    belongs_to(:game, Codebattle.Game)
    timestamps()
  end

  def changeset(invite, attrs) do
    invite
    |> cast(attrs, [:state, :creator_id, :recepient_id, :game_id])
    |> cast_embed(:game_params)
    |> validate_required([:state])
  end

  def list_invites do
    Repo.all(Invite)
  end

  def list_active_invites(user_id) do
    query =
      from(i in Invite,
        where: i.state == "pending" and (i.creator_id == ^user_id or i.recepient_id == ^user_id)
      )

    Repo.all(query)
    |> Repo.preload([:creator, :recepient])
  end

  def list_all_active_invites() do
    query =
      from(i in Invite,
        where: i.state == "pending"
      )

    Repo.all(query)
  end

  def expire_invite(invite) do
    Invite.update_invite(invite, %{state: "expired"})
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

  def drop_invites_by_users(creator_id, recepient_id) do
    query =
      from(i in Invite,
        where:
          i.state == "pending" and (i.creator_id == ^creator_id or i.creator_id == ^recepient_id),
        select: i
      )

    Repo.update_all(query, set: [state: "dropped"])
  end

  def accept_invite(params) do
    recepient_id = params.recepient_id
    invite_id = params.id || raise "Not found!"
    invite = get_invite!(invite_id)

    if invite.recepient_id != recepient_id do
      raise "Not authorized!"
    end

    users = [invite.creator, invite.recepient]
    game_params = Map.merge(invite.game_params, %{users: users})

    case Play.start_game(game_params) do
      {:ok, fsm} ->
        game_id = FsmHelpers.get_game_id(fsm)

        {:ok, invite} =
          Invite.update_invite(invite, %{state: "accepted", game_id: game_id})

        {_, dropped_invites} =
          Invite.drop_invites_by_users(invite.creator_id, invite.recepient_id)

        {:ok, %{invite: invite, dropped_invites: dropped_invites}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def cancel_invite(params) do
    user_id = params.user_id
    invite_id = params.id || raise "Not found!"
    invite = get_invite!(invite_id)

    if invite.recepient_id != user_id and invite.creator_id != user_id do
      raise "Not authorized!"
    end

    Invite.update_invite(invite, %{state: "canceled"})
  end
end
