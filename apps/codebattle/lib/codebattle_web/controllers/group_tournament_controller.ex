defmodule CodebattleWeb.GroupTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTournament.Context
  alias Codebattle.User

  plug(CodebattleWeb.Plugs.RequireAuth)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def show(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)

    conn
    |> put_view(CodebattleWeb.GroupTournamentView)
    |> put_meta_tags(%{
      title: group_tournament.name,
      description: group_tournament.description,
      url: Routes.group_tournament_url(conn, :show, group_tournament.id)
    })
    |> render("show.html", group_tournament: group_tournament)
  end

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
    group_tournament.creator_id == user.id || User.admin?(user)
  end
end
