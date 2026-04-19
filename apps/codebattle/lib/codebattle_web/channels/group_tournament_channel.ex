defmodule CodebattleWeb.GroupTournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.ExternalPlatformInvite.Advancer, as: InviteAdvancer
  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  def join("group_tournament:" <> tournament_id, _payload, socket) do
    case parse_tournament_id(tournament_id) do
      {:ok, parsed_tournament_id} ->
        current_user = socket.assigns.current_user
        group_tournament = GroupTournamentContext.get_group_tournament!(parsed_tournament_id)

        if has_access?(current_user, group_tournament) do
          join_tournament(socket, current_user, group_tournament, parsed_tournament_id)
        else
          {:error, %{reason: "not_authorized"}}
        end

      :error ->
        {:error, %{reason: "invalid_tournament_id"}}
    end
  end

  defp join_tournament(socket, current_user, group_tournament, tournament_id) do
    if group_tournament.require_invitation do
      join_with_invite(socket, current_user, group_tournament, tournament_id)
    else
      join_without_invite(socket, current_user, group_tournament)
    end
  end

  defp join_with_invite(socket, current_user, group_tournament, tournament_id) do
    invite =
      current_user.id
      |> InviteContext.get_or_create_invite(tournament_id)
      |> InviteAdvancer.advance(current_user)

    {user, platform_error} = maybe_ensure_platform_credentials(current_user, invite, group_tournament)
    external_setup = maybe_ensure_external_setup(user, group_tournament, invite)

    {:ok,
     %{
       status: group_tournament.state,
       invite: serialize_invite(invite),
       require_invitation: true,
       platform_error: platform_error,
       external_setup: serialize_external_setup(external_setup, user, group_tournament)
     }, socket}
  end

  defp join_without_invite(socket, current_user, group_tournament) do
    external_setup = maybe_ensure_external_setup(current_user, group_tournament, %{state: "accepted"})

    {:ok,
     %{
       status: group_tournament.state,
       invite: %{state: "accepted"},
       require_invitation: false,
       external_setup: serialize_external_setup(external_setup, current_user, group_tournament)
     }, socket}
  end

  def handle_in("request_invite_update", _, socket) do
    current_user = socket.assigns.current_user

    case extract_tournament_id(socket.topic) do
      nil -> {:reply, {:error, %{reason: "invalid_tournament_id"}}, socket}
      tournament_id -> reply_with_invite_update(current_user, tournament_id, socket)
    end
  end

  def handle_in(_event, _payload, socket) do
    {:noreply, socket}
  end

  def handle_info(_message, socket) do
    {:noreply, socket}
  end

  defp reply_with_invite_update(current_user, tournament_id, socket) do
    group_tournament = GroupTournamentContext.get_group_tournament!(tournament_id)

    invite =
      current_user.id
      |> InviteContext.get_or_create_invite(tournament_id)
      |> InviteAdvancer.advance(current_user)

    {user, platform_error} = maybe_ensure_platform_credentials(current_user, invite, group_tournament)

    socket =
      if invite.state == "accepted" do
        assign(socket, :current_user, user)
      else
        socket
      end

    {:reply, {:ok, serialize_invite_reply(user, group_tournament, invite, platform_error)}, socket}
  end

  defp extract_tournament_id("group_tournament:" <> tournament_id) do
    case parse_tournament_id(tournament_id) do
      {:ok, parsed_tournament_id} -> parsed_tournament_id
      :error -> nil
    end
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

  defp serialize_external_setup(nil, _user, _group_tournament), do: nil

  defp serialize_external_setup(external_setup, user, group_tournament) do
    %{
      state: external_setup.state,
      repo_state: external_setup.repo_state,
      role_state: external_setup.role_state,
      secret_state: external_setup.secret_state,
      repo_slug: UserGroupTournamentContext.repo_slug_for(user, group_tournament),
      repo_url: external_setup.repo_url,
      role: external_setup.role,
      secret_key: external_setup.secret_key,
      secret_group: external_setup.secret_group,
      last_error: external_setup.last_error
    }
  end

  defp serialize_invite_reply(user, group_tournament, invite, platform_error) do
    external_setup = maybe_ensure_external_setup(user, group_tournament, invite)

    %{
      invite: serialize_invite(invite),
      platform_error: platform_error,
      external_setup: serialize_external_setup(external_setup, user, group_tournament)
    }
  end

  defp maybe_ensure_platform_credentials(current_user, %{state: "accepted"}, %{run_on_external_platform: true}) do
    fresh_user = Codebattle.Repo.get!(Codebattle.User, current_user.id)

    if has_platform_credentials?(fresh_user) do
      {fresh_user, nil}
    else
      case UserGroupTournamentContext.ensure_platform_identity(fresh_user) do
        {:ok, updated_user} ->
          {updated_user, nil}

        {:error, _reason} ->
          {fresh_user, "external_platform_credentials_not_found"}
      end
    end
  end

  defp maybe_ensure_platform_credentials(current_user, _invite, _group_tournament) do
    {current_user, nil}
  end

  defp has_platform_credentials?(%{external_platform_id: id, external_platform_login: login})
       when is_binary(id) and id != "" and is_binary(login) and login != "", do: true

  defp has_platform_credentials?(_), do: false

  defp maybe_ensure_external_setup(user, %{run_on_external_platform: false} = group_tournament, _invite) do
    UserGroupTournamentContext.get(user.id, group_tournament.id)
  end

  defp maybe_ensure_external_setup(user, group_tournament, %{state: "accepted"}) do
    case UserGroupTournamentContext.ensure_external_setup(user, group_tournament) do
      {:ok, record} -> record
      {:error, _reason, record} -> record
    end
  end

  defp maybe_ensure_external_setup(user, group_tournament, _invite) do
    if can_lookup_platform_identity?(user) and !group_tournament.require_invitation do
      case UserGroupTournamentContext.ensure_external_setup(user, group_tournament) do
        {:ok, record} -> record
        {:error, _reason, record} -> record
      end
    end
  end

  defp can_lookup_platform_identity?(user) do
    UserGroupTournamentContext.can_lookup_platform_identity?(user)
  end

  defp has_access?(user, group_tournament) do
    group_tournament.creator_id == user.id ||
      Codebattle.User.admin_or_moderator?(user) ||
      UserGroupTournamentContext.get(user.id, group_tournament.id) != nil
  end

  defp parse_tournament_id(tournament_id) do
    case Integer.parse(tournament_id) do
      {parsed_tournament_id, ""} -> {:ok, parsed_tournament_id}
      _ -> :error
    end
  end
end
