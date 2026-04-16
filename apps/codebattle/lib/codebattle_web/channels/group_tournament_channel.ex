defmodule CodebattleWeb.GroupTournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  require Logger

  alias Codebattle.ExternalPlatformInvite.Context
  alias Codebattle.ExternalPlatform

  def join("group_tournament:" <> _tournament_id, _payload, socket) do
    {:ok, %{}, socket}
  end

  def handle_in("request_invite_update", _, socket) do
    current_user = socket.assigns.current_user
    tournament_id = extract_tournament_id(socket.topic)

    alias_name = current_user.external_oauth_login || current_user.name

    case Context.get_or_create_invite(current_user.id, tournament_id) do
      %{state: "pending"} = invite ->
        case Context.send_invite(invite, alias_name) do
          {:ok, updated_invite} ->
            {:reply, {:ok, serialize_invite(updated_invite)}, socket}

          {:error, reason} ->
            Logger.error("Failed to send invite: #{inspect(reason)}")
            {:reply, {:error, %{reason: "failed_to_send_invite"}}, socket}
        end

      %{state: "failed"} = invite ->
        # retry sending invite
        case Context.send_invite(invite, alias_name) do
          {:ok, updated_invite} ->
            {:reply, {:ok, serialize_invite(updated_invite)}, socket}

          {:error, reason} ->
            Logger.error("Failed to send invite: #{inspect(reason)}")
            {:reply, {:error, %{reason: "failed_to_send_invite"}}, socket}
        end

      invite ->
        {:reply, {:ok, serialize_invite(invite)}, socket}
    end
  end

  def handle_in(_event, _payload, socket) do
    {:noreply, socket}
  end

  def handle_info(_message, socket) do
    {:noreply, socket}
  end

  defp extract_tournament_id("group_tournament:" <> tournament_id) do
    String.to_integer(tournament_id)
  end

  defp serialize_invite(invite) do
    %{
      id: invite.id,
      state: invite.state,
      invite_link: invite.invite_link,
      expires_at: invite.expires_at,
      response: invite.response
    }
  end
end
