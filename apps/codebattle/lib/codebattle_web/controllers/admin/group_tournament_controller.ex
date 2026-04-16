defmodule CodebattleWeb.Admin.GroupTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Context
  alias Codebattle.GroupTournament.Server
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext

  plug(CodebattleWeb.Plugs.AdminOnly)
  plug(:put_view, CodebattleWeb.Admin.GroupTournamentView)
  plug(:put_layout, html: {CodebattleWeb.LayoutView, :admin})

  def index(conn, _params) do
    render(conn, "index.html",
      group_tournaments: Context.list_group_tournaments(),
      user: conn.assigns.current_user
    )
  end

  def new(conn, _params) do
    render(conn, "new.html",
      changeset: Context.change_group_tournament(%GroupTournament{}),
      group_tasks: GroupTaskContext.list_group_tasks(),
      user: conn.assigns.current_user
    )
  end

  def create(conn, %{"group_tournament" => params}) do
    params = Map.put_new(params, "creator_id", conn.assigns.current_user.id)

    case Context.create_group_tournament(params) do
      {:ok, group_tournament} ->
        conn
        |> put_flash(:info, "Group tournament created successfully.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "new.html",
          changeset: changeset,
          group_tasks: GroupTaskContext.list_group_tasks(),
          user: conn.assigns.current_user
        )
    end
  end

  def show(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)
    :ok = Context.ensure_server_started(group_tournament)

    render(conn, "show.html",
      group_tournament: group_tournament,
      runs: Context.list_runs(group_tournament),
      solutions: latest_solutions(group_tournament),
      tokens: Context.list_tokens(group_tournament),
      tournament_users: UserGroupTournamentContext.list_users(group_tournament.id),
      token_changeset: token_changeset(%{}),
      user: conn.assigns.current_user
    )
  end

  def edit(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)

    render(conn, "edit.html",
      group_tournament: group_tournament,
      changeset: Context.change_group_tournament(group_tournament),
      group_tasks: GroupTaskContext.list_group_tasks(),
      user: conn.assigns.current_user
    )
  end

  def update(conn, %{"id" => id, "group_tournament" => params}) do
    group_tournament = Context.get_group_tournament!(id)

    case Context.update_group_tournament(group_tournament, params) do
      {:ok, group_tournament} ->
        conn
        |> put_flash(:info, "Group tournament updated successfully.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, "edit.html",
          group_tournament: group_tournament,
          changeset: changeset,
          group_tasks: GroupTaskContext.list_group_tasks(),
          user: conn.assigns.current_user
        )
    end
  end

  def delete(conn, %{"id" => id}) do
    id
    |> Context.get_group_tournament!()
    |> Context.delete_group_tournament()

    conn
    |> put_flash(:info, "Group tournament deleted successfully.")
    |> redirect(to: Routes.admin_group_tournament_path(conn, :index))
  end

  def start(conn, %{"id" => id}) do
    :ok = Context.ensure_server_started(id)

    case Server.start_now(id) do
      {:ok, group_tournament} ->
        conn
        |> put_flash(:info, "Group tournament started.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:error, :invalid_state} ->
        conn
        |> put_flash(:error, "Group tournament can't be started in the current state.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, id))

      _ ->
        conn
        |> put_flash(:error, "Group tournament not found.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :index))
    end
  end

  def finish(conn, %{"id" => id}) do
    :ok = Context.ensure_server_started(id)

    case Server.finish_tournament(id) do
      {:ok, group_tournament} ->
        conn
        |> put_flash(:info, "Group tournament finished.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:error, :invalid_state} ->
        conn
        |> put_flash(:error, "Group tournament can't be finished in the current state.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, id))

      _ ->
        conn
        |> put_flash(:error, "Group tournament not found.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :index))
    end
  end

  def cancel(conn, %{"id" => id}) do
    :ok = Context.ensure_server_started(id)

    case Server.cancel_tournament(id) do
      {:ok, group_tournament} ->
        conn
        |> put_flash(:info, "Group tournament canceled.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      _ ->
        conn
        |> put_flash(:error, "Group tournament not found.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :index))
    end
  end

  def check(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)
    player_ids = Enum.map(group_tournament.players, & &1.user_id)

    case GroupTaskContext.run_group_task(group_tournament.group_task, player_ids, %{
           group_tournament_id: group_tournament.id,
           include_bots: group_tournament.include_bots
         }) do
      {:ok, %{status: "success"}} ->
        conn
        |> put_flash(:info, "Group tournament checker finished.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:ok, %{status: "error"}} ->
        conn
        |> put_flash(:error, "Group tournament checker failed.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_flash(:error, "Group tournament checker failed: #{inspect(changeset.errors)}")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
    end
  end

  def reset(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)

    case Context.reset_group_tournament(group_tournament) do
      {:ok, updated_group_tournament} ->
        conn
        |> put_flash(:info, "Group tournament restarted and cleared.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, updated_group_tournament))

      {:error, _reason} ->
        conn
        |> put_flash(:error, "Failed to restart group tournament.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
    end
  end

  def add_user(conn, %{"id" => id, "add_user" => %{"user_id" => user_id_param}}) do
    group_tournament = Context.get_group_tournament!(id)

    case parse_user_id(user_id_param) do
      {:ok, user_id} ->
        case Codebattle.Repo.get(Codebattle.User, user_id) do
          nil ->
            conn
            |> put_flash(:error, "User with ID #{user_id} not found.")
            |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

          user ->
            UserGroupTournamentContext.get_or_create(user, group_tournament)

            conn
            |> put_flash(:info, "User #{user.name} (ID: #{user.id}) added to tournament.")
            |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
        end

      :error ->
        conn
        |> put_flash(:error, "Invalid user ID.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
    end
  end

  def create_token(conn, %{"id" => id, "group_tournament_token" => token_params}) do
    group_tournament = Context.get_group_tournament!(id)

    case parse_user_id(token_params["user_id"]) do
      {:ok, user_id} ->
        case Context.create_or_rotate_token(group_tournament, user_id) do
          {:ok, _token} ->
            conn
            |> put_flash(:info, "Group tournament token generated successfully.")
            |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

          {:error, %Ecto.Changeset{} = changeset} ->
            render_show(conn, group_tournament, changeset)
        end

      :error ->
        render_show(
          conn,
          group_tournament,
          %{}
          |> token_changeset()
          |> Ecto.Changeset.add_error(:user_id, "is invalid")
          |> Map.put(:action, :insert)
        )
    end
  end

  defp render_show(conn, group_tournament, token_changeset) do
    conn
    |> put_status(:unprocessable_entity)
    |> render("show.html",
      group_tournament: group_tournament,
      runs: Context.list_runs(group_tournament),
      solutions: latest_solutions(group_tournament),
      tokens: Context.list_tokens(group_tournament),
      tournament_users: UserGroupTournamentContext.list_users(group_tournament.id),
      token_changeset: token_changeset,
      user: conn.assigns.current_user
    )
  end

  defp latest_solutions(group_tournament) do
    player_ids = Enum.map(group_tournament.players, & &1.user_id)
    GroupTaskContext.list_latest_solutions(group_tournament.group_task_id, player_ids)
  end

  defp parse_user_id(user_id) when is_integer(user_id) and user_id > 0, do: {:ok, user_id}

  defp parse_user_id(user_id) when is_binary(user_id) do
    case Integer.parse(String.trim(user_id)) do
      {parsed_user_id, ""} when parsed_user_id > 0 -> {:ok, parsed_user_id}
      _ -> :error
    end
  end

  defp parse_user_id(_user_id), do: :error

  defp token_changeset(attrs) do
    types = %{user_id: :integer}

    {%{}, types}
    |> Ecto.Changeset.cast(attrs, Map.keys(types))
    |> Ecto.Changeset.validate_required([:user_id])
    |> Ecto.Changeset.validate_number(:user_id, greater_than: 0)
  end
end
