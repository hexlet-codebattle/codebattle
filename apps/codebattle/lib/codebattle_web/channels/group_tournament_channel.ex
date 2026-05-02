defmodule CodebattleWeb.GroupTournamentChannel do
  @moduledoc false
  use CodebattleWeb, :channel

  alias Codebattle.ExternalPlatformInvite.Advancer, as: InviteAdvancer
  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.GroupTournament.Server, as: GroupTournamentServer
  alias Codebattle.PubSub.Message
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext
  alias Codebattle.Workers.PlatformInviteAdvancerWorker

  def join("group_tournament:" <> tournament_id, _payload, socket) do
    case parse_tournament_id(tournament_id) do
      {:ok, parsed_tournament_id} ->
        current_user = socket.assigns.current_user
        group_tournament = GroupTournamentContext.get_group_tournament!(parsed_tournament_id)

        if has_access?(current_user, group_tournament) do
          subscribe_to_group_tournament(parsed_tournament_id, current_user)
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
    else
      Codebattle.PubSub.subscribe("group_tournament:#{tournament_id}:user:#{current_user.id}")
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

    PlatformInviteAdvancerWorker.enqueue(invite)

    {:ok,
     %{
       status: group_tournament.state,
       invite: serialize_invite(invite),
       require_invitation: true,
       run_on_external_platform: group_tournament.run_on_external_platform,
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
       run_on_external_platform: group_tournament.run_on_external_platform,
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

  def handle_in("group_tournament:submit_solution", %{"solution" => solution} = payload, socket)
      when is_binary(solution) do
    current_user = socket.assigns.current_user
    lang = payload["lang"]

    case extract_tournament_id(socket.topic) do
      nil -> {:reply, {:error, %{reason: "invalid_tournament_id"}}, socket}
      tournament_id -> attempt_submit_solution(tournament_id, current_user, lang, solution, socket)
    end
  end

  def handle_in("group_tournament:submit_solution", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
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

  def handle_info(%Message{event: "group_tournament:invite_updated"}, socket) do
    current_user = socket.assigns.current_user

    case extract_tournament_id(socket.topic) do
      nil ->
        {:noreply, socket}

      tournament_id ->
        group_tournament = GroupTournamentContext.get_group_tournament!(tournament_id)
        invite = InviteContext.get_or_create_invite(current_user.id, tournament_id)
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

  def handle_info(%Message{event: "group_tournament:status_updated", payload: payload}, socket) do
    case extract_tournament_id(socket.topic) do
      nil ->
        push(socket, "group_tournament:status_updated", %{status: payload.status})

      tournament_id ->
        group_tournament = GroupTournamentContext.get_group_tournament!(tournament_id)

        push(socket, "group_tournament:status_updated", %{
          status: payload.status,
          group_tournament: GroupTournamentContext.serialize_group_tournament(group_tournament)
        })
    end

    {:noreply, socket}
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

    PlatformInviteAdvancerWorker.enqueue(invite)

    socket =
      if invite.state == "accepted" do
        assign(socket, :current_user, user)
      else
        socket
      end

    {:reply, {:ok, response}, socket}
  end

  defp attempt_submit_solution(tournament_id, current_user, lang, solution, socket) do
    group_tournament = GroupTournamentContext.get_group_tournament!(tournament_id)

    cond do
      group_tournament.run_on_external_platform ->
        {:reply, {:error, %{reason: "external_platform_only"}}, socket}

      not is_binary(lang) or lang == "" ->
        {:reply, {:error, %{reason: "lang_required"}}, socket}

      true ->
        do_submit_solution(group_tournament, current_user, lang, solution, socket)
    end
  end

  defp do_submit_solution(group_tournament, current_user, lang, solution, socket) do
    :ok = GroupTournamentContext.ensure_server_started(group_tournament)

    with {:ok, _} <- GroupTournamentServer.join(group_tournament.id, current_user, lang),
         {:ok, submitted_solution} <-
           GroupTournamentServer.submit_solution(group_tournament.id, current_user, solution) do
      {:reply, {:ok, %{solution: serialize_solution(submitted_solution)}}, socket}
    else
      {:error, reason} when is_atom(reason) ->
        {:reply, {:error, %{reason: to_string(reason)}}, socket}

      {:error, _} ->
        {:reply, {:error, %{reason: "submit_failed"}}, socket}
    end
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

  defp serialize_solution(nil), do: nil

  defp serialize_solution(solution) do
    %{
      id: solution.id,
      user_id: solution.user_id,
      lang: solution.lang,
      solution: solution.solution,
      inserted_at: solution.inserted_at
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
end
