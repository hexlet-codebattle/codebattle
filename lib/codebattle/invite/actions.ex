defmodule Codebattle.Invite.Actions do
  @moduledoc """
  Invite use cases shared by the lobby `InviteChannel` and the public API: validate, change the
  invite and broadcast the same `invites:*` events to both users, so every client (web lobby,
  API long-pollers) sees the change.
  """

  alias Codebattle.Invite
  alias Codebattle.PubSub.Message
  alias Codebattle.Repo
  alias Codebattle.User

  @default_timeout_seconds 3600

  @spec create(User.t(), map()) :: {:ok, Invite.t()} | {:error, atom() | Ecto.Changeset.t()}
  def create(%User{} = creator, params) do
    recipient_id = params[:recipient_id]

    cond do
      is_nil(recipient_id) or recipient_id == creator.id ->
        {:error, :invalid_recipient}

      is_nil(recipient(recipient_id)) ->
        {:error, :recipient_not_found}

      Invite.has_pending_invites?(creator.id, recipient_id) ->
        {:error, :already_invited}

      true ->
        with {:ok, task} <- fetch_task(creator, params[:task_id]),
             {:ok, invite} <- Invite.create_invite(invite_attrs(creator, recipient_id, task, params)) do
          broadcast(invite, "invites:created", payload(invite, creator.id))
          {:ok, invite}
        end
    end
  end

  @spec accept(integer(), User.t()) :: {:ok, Invite.t()} | {:error, atom()} | {:error, atom(), Invite.t()}
  def accept(invite_id, %User{} = user) do
    with {:ok, invite} <- fetch(invite_id, user),
         true <- invite.recipient_id == user.id || {:error, :not_found} do
      case Invite.accept_invite(%{id: invite.id, recipient_id: user.id}) do
        {:ok, %{invite: invite, dropped_invites: dropped}} ->
          broadcast(invite, "invites:accepted", payload(invite, user.id))
          Enum.each(dropped, &broadcast(&1, "invites:dropped", %{invite: %{state: &1.state, id: &1.id}}))
          {:ok, invite}

        {:error, reason, %Invite{} = dropped} ->
          broadcast(dropped, "invites:dropped", payload(dropped, user.id))
          {:error, reason, dropped}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc "Either side cancels: the recipient declines, the creator withdraws."
  @spec cancel(integer(), User.t()) :: {:ok, Invite.t()} | {:error, atom() | Ecto.Changeset.t()}
  def cancel(invite_id, %User{} = user) do
    with {:ok, invite} <- fetch(invite_id, user),
         true <- invite.state == "pending" || {:error, :invite_is_not_pending},
         {:ok, invite} <- Invite.cancel_invite(%{id: invite.id, user_id: user.id}) do
      invite = Repo.preload(invite, [:creator, :recipient])
      broadcast(invite, "invites:canceled", payload(invite, user.id))
      {:ok, invite}
    end
  end

  @doc "Event payload sent to both users, as the lobby expects it."
  def payload(invite, executor_id) do
    %{
      invite: %{
        state: invite.state,
        id: invite.id,
        game_id: invite.game_id,
        game_params: invite.game_params,
        creator_id: invite.creator_id,
        recipient_id: invite.recipient_id,
        executor_id: executor_id,
        creator: invite.creator,
        recipient: invite.recipient
      }
    }
  end

  # Unrelated invites look missing, like everywhere in the public API.
  defp fetch(invite_id, user) do
    case Repo.get(Invite, invite_id) do
      %Invite{} = invite when user.id in [invite.creator_id, invite.recipient_id] ->
        {:ok, Repo.preload(invite, [:creator, :recipient])}

      _ ->
        {:error, :not_found}
    end
  end

  defp recipient(id) do
    case Repo.get(User, id) do
      %User{is_guest: false, is_bot: false} = user -> if User.active?(user), do: user
      _ -> nil
    end
  end

  defp broadcast(invite, event, payload) do
    for user_id <- Enum.uniq([invite.creator_id, invite.recipient_id]) do
      topic = "invites:#{user_id}"
      Phoenix.PubSub.broadcast(Codebattle.PubSub, topic, %Message{topic: topic, event: event, payload: payload})
    end

    :ok
  end

  defp invite_attrs(creator, recipient_id, task, params) do
    game_params = %{
      level: if(task, do: task.level, else: params[:level] || "elementary"),
      type: "public",
      timeout_seconds: params[:timeout_seconds] || @default_timeout_seconds
    }

    %{creator_id: creator.id, recipient_id: recipient_id, game_params: game_params, task_id: task && task.id}
  end

  # The creator picks the task, so it must be one they may play (public, or their own).
  defp fetch_task(_creator, nil), do: {:ok, nil}

  defp fetch_task(creator, task_id) do
    case Codebattle.Task.get_task_by_id_for_user(creator, task_id) do
      nil -> {:error, :task_not_found}
      task -> {:ok, task}
    end
  end
end
