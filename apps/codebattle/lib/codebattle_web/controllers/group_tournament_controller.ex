defmodule CodebattleWeb.GroupTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.User
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  plug(CodebattleWeb.Plugs.RequireAuth)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def show(conn, %{"id" => id}) do
    group_tournament = GroupTournamentContext.get_group_tournament!(id)
    current_user = conn.assigns.current_user

    if has_access?(current_user, group_tournament) do
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
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html")
      |> halt()
    end
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
