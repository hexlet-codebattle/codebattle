defmodule CodebattleWeb.GroupTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.ExternalPlatform
  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.User
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  plug(CodebattleWeb.Plugs.RequireAuth)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def show(conn, %{"id" => id}) do
    group_tournament = GroupTournamentContext.get_group_tournament!(id)
    current_user = conn.assigns.current_user

    if has_access?(current_user, group_tournament) do
      render_show(conn, group_tournament, current_user)
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html")
      |> halt()
    end
  end

  defp render_show(conn, group_tournament, current_user) do
    cond do
      group_tournament.run_on_external_platform && !can_lookup_platform_identity?(current_user) ->
        render_requires_external_platform(conn, group_tournament)

      group_tournament.require_invitation && !invite_accepted?(current_user, group_tournament) ->
        render_invitation_flow(conn, group_tournament, current_user)

      true ->
        _external_setup = ensure_external_setup_if_needed(current_user, group_tournament)

        conn
        |> put_view(CodebattleWeb.GroupTournamentView)
        |> put_meta_tags(%{
          title: group_tournament.name,
          description: group_tournament.description,
          url: Routes.group_tournament_url(conn, :show, group_tournament.id)
        })
        |> render("show.html", group_tournament: group_tournament)
    end
  end

  # Legacy endpoint kept for templates that still POST here.
  def request_invite(conn, %{"id" => id}) do
    group_tournament = GroupTournamentContext.get_group_tournament!(id)
    current_user = conn.assigns.current_user

    alias_name = current_user.external_oauth_login || current_user.name

    case ExternalPlatform.create_invite(alias_name) do
      {:ok, body} ->
        invite_link = extract_invite_link(body)

        if invite_link do
          redirect(conn, external: invite_link)
        else
          conn
          |> put_flash(:info, "Invite created! Sign in to the external platform to accept it.")
          |> redirect(to: Routes.group_tournament_path(conn, :show, group_tournament.id))
        end

      {:error, _reason} ->
        conn
        |> put_flash(:error, "Failed to create invite. Please try again later.")
        |> redirect(to: Routes.group_tournament_path(conn, :show, group_tournament.id))
    end
  end

  defp render_requires_external_platform(conn, group_tournament) do
    conn
    |> put_view(CodebattleWeb.GroupTournamentView)
    |> put_meta_tags(%{
      title: group_tournament.name,
      description: group_tournament.description
    })
    |> render("requires_external_platform.html",
      group_tournament: group_tournament,
      external_platform_name: Application.get_env(:codebattle, :external_platform_name),
      external_platform_login_url: Application.get_env(:codebattle, :external_platform_login_url)
    )
  end

  defp render_invitation_flow(conn, group_tournament, current_user) do
    alias_name = invite_alias(current_user)
    invite = InviteContext.get_or_create_invite(current_user.id, group_tournament.id)

    # Advance the state machine based on current state — this is what makes the page "auto-progress".
    invite = advance_invite(invite, alias_name, current_user)

    # If we transitioned to accepted inside advance_invite, show the tournament directly.
    if invite.state == "accepted" do
      _external_setup = ensure_external_setup_if_needed(current_user, group_tournament)

      conn
      |> put_view(CodebattleWeb.GroupTournamentView)
      |> put_meta_tags(%{
        title: group_tournament.name,
        description: group_tournament.description,
        url: Routes.group_tournament_url(conn, :show, group_tournament.id)
      })
      |> render("show.html", group_tournament: group_tournament)
    else
      conn
      |> put_view(CodebattleWeb.GroupTournamentView)
      |> put_meta_tags(%{
        title: group_tournament.name,
        description: group_tournament.description
      })
      |> render("requires_invitation.html",
        group_tournament: group_tournament,
        invite: invite,
        external_platform_name: Application.get_env(:codebattle, :external_platform_name)
      )
    end
  end

  # Auto-progress state machine:
  #   pending  -> send_invite  -> creating
  #   creating -> poll_status  -> invited | failed
  #   invited  -> check_accepted -> accepted (if user finished) | stay invited
  defp advance_invite(%{state: "pending"} = invite, alias_name, _user) do
    case InviteContext.send_invite(invite, alias_name) do
      {:ok, updated} -> updated
      {:error, _} -> invite
    end
  end

  defp advance_invite(%{state: "creating"} = invite, _alias_name, _user) do
    case InviteContext.poll_status(invite) do
      {:ok, updated} -> updated
      {:error, _} -> invite
    end
  end

  defp advance_invite(%{state: "invited"} = invite, _alias_name, user) do
    case InviteContext.check_accepted(invite, invite_login(user)) do
      {:ok, updated} -> updated
      {:error, _} -> invite
    end
  end

  defp advance_invite(invite, _alias_name, _user), do: invite

  defp invite_accepted?(user, group_tournament) do
    case InviteContext.get_invite(user.id, group_tournament.id) do
      %{state: "accepted"} -> true
      _ -> false
    end
  end

  defp invite_alias(%{external_oauth_login: login}) when is_binary(login) and login != "", do: login
  defp invite_alias(%{name: name}) when is_binary(name) and name != "", do: name
  defp invite_alias(_), do: ""

  defp invite_login(%{external_platform_login: login}) when is_binary(login) and login != "", do: login
  defp invite_login(%{external_oauth_login: login}) when is_binary(login) and login != "", do: login
  defp invite_login(%{name: name}) when is_binary(name) and name != "", do: name
  defp invite_login(_), do: ""

  defp extract_invite_link(%{"response" => %{"invites" => [%{"invite_link" => link} | _]}})
       when is_binary(link) and link != "", do: link

  defp extract_invite_link(_), do: nil

  defp ensure_external_setup_if_needed(_user, %{run_on_external_platform: false}), do: nil

  defp ensure_external_setup_if_needed(user, group_tournament) do
    if can_lookup_platform_identity?(user) do
      case UserGroupTournamentContext.ensure_external_setup(user, group_tournament) do
        {:ok, record} -> record
        {:error, _reason, record} -> record
      end
    end
  end

  defp can_lookup_platform_identity?(user) do
    UserGroupTournamentContext.can_lookup_platform_identity?(user)
  end

  def admin(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user
    group_tournament = GroupTournamentContext.get_group_tournament!(id)

    if can_moderate?(group_tournament, current_user) do
      conn
      |> put_view(CodebattleWeb.GroupTournamentView)
      |> put_meta_tags(%{title: "Admin #{group_tournament.name}"})
      |> render("admin.html", group_tournament: group_tournament)
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
      |> halt()
    end
  end

  defp has_access?(user, group_tournament) do
    can_moderate?(group_tournament, user) ||
      UserGroupTournamentContext.get(user.id, group_tournament.id) != nil
  end

  defp can_moderate?(group_tournament, user) do
    group_tournament.creator_id == user.id || User.admin_or_moderator?(user)
  end
end
