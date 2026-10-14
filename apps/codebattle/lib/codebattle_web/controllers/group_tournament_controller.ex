defmodule CodebattleWeb.GroupTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTournament.Context, as: GroupTournamentContext
  alias Codebattle.GroupTournament.Server
  alias Codebattle.User
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  plug(CodebattleWeb.Plugs.RequireAuth when action not in [:my_tournament])
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :app})

  def show(conn, %{"id" => id}) do
    group_tournament = GroupTournamentContext.get_group_tournament!(id)
    current_user = conn.assigns.current_user

    if has_access?(current_user, group_tournament) do
      conn
      |> put_meta_tags(%{
        title: group_tournament.name,
        description: group_tournament.description,
        url: Routes.group_tournament_url(conn, :show, group_tournament.id)
      })
      |> CodebattleWeb.Frontend.put_layout()
      |> render_inertia("GroupTournament", %{
        "group_tournament_id" => group_tournament.id,
        "name" => group_tournament.name,
        "description" => group_tournament.description,
        "task_description" => group_tournament.task_description,
        "meta" => group_tournament.meta || %{}
      })
    else
      conn
      |> put_status(:not_found)
      |> put_view(CodebattleWeb.ErrorView)
      |> render("404.html")
      |> halt()
    end
  end

  def my_tournament(conn, params) do
    current_user = conn.assigns.current_user

    if current_user.is_guest do
      redirect(conn, to: "/")
    else
      current_user.id
      |> UserGroupTournamentContext.get_latest_for_user()
      |> handle_my_tournament(conn, params)
    end
  end

  defp handle_my_tournament(%{group_tournament: %{state: "canceled"}}, conn, _params) do
    redirect(conn, to: "/")
  end

  defp handle_my_tournament(%{group_tournament: %{state: "waiting_participants", id: id}} = record, conn, %{
         "start" => "true"
       }) do
    if external_setup_ready?(record) do
      :ok = GroupTournamentContext.ensure_server_started(id)
      Server.start_now(id)
    end

    redirect(conn, to: Routes.group_tournament_path(conn, :show, id))
  end

  defp handle_my_tournament(%{group_tournament: %{id: id}}, conn, _params) do
    redirect(conn, to: Routes.group_tournament_path(conn, :show, id))
  end

  defp handle_my_tournament(_record, conn, _params) do
    redirect(conn, to: "/")
  end

  def admin(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user
    group_tournament = GroupTournamentContext.get_group_tournament!(id)

    # The player page is the only group-tournament page here; moderation lives in the admin app.
    if can_moderate?(group_tournament, current_user) do
      redirect(conn, to: "/admin/group_tournaments/#{group_tournament.id}")
    else
      conn
      |> put_status(:not_found)
      |> json(%{error: "NOT_FOUND"})
      |> halt()
    end
  end

  defp external_setup_ready?(%{group_tournament: %{run_on_external_platform: false}}), do: true

  defp external_setup_ready?(%{repo_state: "completed", role_state: "completed", secret_state: "completed"}), do: true

  defp external_setup_ready?(_record), do: false

  defp has_access?(user, group_tournament) do
    can_moderate?(group_tournament, user) ||
      (group_tournament.visible_to_users &&
         UserGroupTournamentContext.get(user.id, group_tournament.id) != nil)
  end

  defp can_moderate?(group_tournament, user) do
    group_tournament.creator_id == user.id || User.admin_or_moderator?(user)
  end
end
