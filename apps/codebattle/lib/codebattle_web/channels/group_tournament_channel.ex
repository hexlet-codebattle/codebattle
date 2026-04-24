defmodule CodebattleWeb.GroupTournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.ExternalPlatformInvite.Advancer, as: InviteAdvancer
  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.PubSub.Message
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  def join("group_tournament:" <> tournament_id, _payload, socket) do
    case parse_tournament_id(tournament_id) do
      {:ok, parsed_tournament_id} ->
        current_user = socket.assigns.current_user
        group_tournament = GroupTournamentContext.get_group_tournament!(parsed_tournament_id)

        if has_access?(current_user, group_tournament) do
          subscribe_to_group_tournament(parsed_tournament_id, current_user)
          Codebattle.PubSub.subscribe("group_tournament:#{parsed_tournament_id}:user:#{current_user.id}")
          join_tournament(socket, current_user, group_tournament, parsed_tournament_id)
        else
          {:error, %{reason: "not_authorized"}}
        end

      :error ->
        {:error, %{reason: "invalid_tournament_id"}}
    end
  end

  defp subscribe_to_group_tournament(tournament_id, current_user) do
    if Codebattle.User.admin_or_moderator?(current_user) do
      Codebattle.PubSub.subscribe("group_tournament:#{tournament_id}")
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
    external_setup = get_external_setup(user, group_tournament)

    maybe_schedule_invite_refresh(socket, tournament_id, invite)

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
    external_setup = get_external_setup(current_user, group_tournament)

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

  def handle_in("start_group_tournament", _, socket) do
    current_user = socket.assigns.current_user

    case extract_tournament_id(socket.topic) do
      nil ->
        {:reply, {:error, %{reason: "invalid_tournament_id"}}, socket}

      tournament_id ->
        case GroupTournamentContext.start_tournament(tournament_id, current_user) do
          {:ok, group_tournament} ->
            {:reply, {:ok, %{status: group_tournament.state}}, socket}

          {:error, reason} ->
            {:reply, {:error, %{reason: to_string(reason)}}, socket}
        end
    end
  end

  def handle_in("group_tournament:run:request", %{"run_id" => run_id}, socket) do
    case parse_run_id(run_id) do
      {:ok, parsed_run_id} ->
        current_user = socket.assigns.current_user

        {:reply, {:ok, GroupTournamentContext.get_run_details!(parsed_run_id, current_user)}, socket}

      :error ->
        {:reply, {:error, %{reason: "invalid_run_id"}}, socket}
    end
  rescue
    Ecto.NoResultsError ->
      {:reply, {:error, %{reason: "not_found"}}, socket}
  end

  def handle_in(_event, _payload, socket) do
    {:noreply, socket}
  end

  def handle_info({:refresh_invite, tournament_id, retries_left}, socket) do
    current_user = socket.assigns.current_user
    group_tournament = GroupTournamentContext.get_group_tournament!(tournament_id)

    invite =
      current_user.id
      |> InviteContext.get_or_create_invite(tournament_id)
      |> InviteAdvancer.advance(current_user)

    if invite.state in ["creating", "pending", "invited"] do
      maybe_schedule_invite_refresh(socket, tournament_id, invite, retries_left)
      {:noreply, socket}
    else
      {user, platform_error} = maybe_ensure_platform_credentials(current_user, invite, group_tournament)
      external_setup = get_external_setup(user, group_tournament)

      push(socket, "group_tournament:invite_updated", %{
        invite: serialize_invite(invite),
        platform_error: platform_error,
        external_setup: serialize_external_setup(external_setup, user, group_tournament)
      })

      {:noreply, socket}
    end
  end

  def handle_info(%Message{event: "group_tournament:run_updated", payload: payload}, socket) do
    push(socket, "group_tournament:run_updated", payload)
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
    response = serialize_invite_reply(user, group_tournament, invite, platform_error)

    maybe_schedule_invite_refresh(socket, tournament_id, invite)

    socket =
      if invite.state == "accepted" do
        assign(socket, :current_user, user)
      else
        socket
      end

    {:reply, {:ok, response}, socket}
  end

  defp extract_tournament_id("group_tournament:" <> tournament_id) do
    case parse_tournament_id(tournament_id) do
      {:ok, parsed_tournament_id} -> parsed_tournament_id
      :error -> nil
    end
  end

  defp parse_run_id(run_id) when is_integer(run_id), do: {:ok, run_id}

  defp parse_run_id(run_id) when is_binary(run_id) do
    case Integer.parse(run_id) do
      {parsed_run_id, ""} -> {:ok, parsed_run_id}
      _ -> :error
    end
  end

  defp parse_run_id(_run_id), do: :error

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
    external_setup = get_external_setup(user, group_tournament)

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

  defp get_external_setup(user, group_tournament) do
    UserGroupTournamentContext.get(user.id, group_tournament.id)
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

  defp maybe_schedule_invite_refresh(socket, tournament_id, invite),
    do: maybe_schedule_invite_refresh(socket, tournament_id, invite, 90)

  defp maybe_schedule_invite_refresh(socket, tournament_id, %{state: state}, retries_left)
       when state in ["creating", "pending"] and retries_left > 0 do
    Process.send_after(self(), {:refresh_invite, tournament_id, retries_left - 1}, 3_000)
    socket
  end

  defp maybe_schedule_invite_refresh(socket, tournament_id, %{state: "invited"}, retries_left) when retries_left > 0 do
    Process.send_after(self(), {:refresh_invite, tournament_id, retries_left - 1}, 3_000)
    socket
  end

  defp maybe_schedule_invite_refresh(socket, _tournament_id, _invite, _retries_left), do: socket
end
