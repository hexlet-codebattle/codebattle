defmodule CodebattleWeb.GroupTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.ExternalPlatform
  alias Codebattle.GroupTournament.Context
  alias Codebattle.User

  plug(CodebattleWeb.Plugs.RequireAuth)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def show(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)
    current_user = conn.assigns.current_user

    if group_tournament.run_on_external_platform && !has_external_platform_login?(current_user) do
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
    else
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

  def request_invite(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)
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

  defp extract_invite_link(%{"response" => %{"invites" => [%{"invite_link" => link} | _]}})
       when is_binary(link) and link != "", do: link

  defp extract_invite_link(_), do: nil

  defp has_external_platform_login?(%{external_platform_login: login}) when is_binary(login) and login != "", do: true
  defp has_external_platform_login?(_), do: false

  def admin(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user
    group_tournament = Context.get_group_tournament!(id)

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

  defp can_moderate?(group_tournament, user) do
    group_tournament.creator_id == user.id || User.admin_or_moderator?(user)
  end
end
