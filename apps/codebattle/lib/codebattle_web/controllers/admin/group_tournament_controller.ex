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

  def index(conn, params) do
    sort_by = parse_sort_by(params["sort_by"])
    sort_dir = parse_sort_dir(params["sort_dir"])

    render(conn, "index.html",
      group_tournaments: Context.list_group_tournaments(sort_by: sort_by, sort_dir: sort_dir),
      sort_by: sort_by,
      sort_dir: sort_dir,
      user: conn.assigns.current_user
    )
  end

  defp parse_sort_by(p) when p in ~w(id starts_at finished_at), do: String.to_existing_atom(p)
  defp parse_sort_by(_), do: :id

  defp parse_sort_dir("asc"), do: :asc
  defp parse_sort_dir(_), do: :desc

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

  def show(conn, %{"id" => id} = params) do
    group_tournament = Context.get_group_tournament!(id)
    :ok = Context.ensure_server_started(group_tournament)

    render_paginated(conn, group_tournament, params, token_changeset(%{}))
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

  def retry(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)

    case Context.retry_group_tournament(group_tournament) do
      {:ok, updated_group_tournament} ->
        conn
        |> put_flash(:info, "Group tournament reset to waiting participants with scores cleared.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, updated_group_tournament))

      {:error, _reason} ->
        conn
        |> put_flash(:error, "Failed to retry group tournament.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
    end
  end

  def solution_tester(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)
    tokens = Context.list_tokens(group_tournament)

    render(conn, "solution_tester.html",
      group_tournament: group_tournament,
      tokens: tokens,
      user: conn.assigns.current_user
    )
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
            Context.create_or_update_player(group_tournament, user.id, %{lang: "js", state: "active"})

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
    |> render_paginated(group_tournament, conn.params, token_changeset)
  end

  @page_size 30

  defp render_paginated(conn, group_tournament, params, token_changeset) do
    players_page = parse_page(params["players_page"])
    runs_page = parse_page(params["runs_page"])
    slice_runs_page = parse_page(params["slice_runs_page"])
    solutions_page = parse_page(params["solutions_page"])
    slice_filter = parse_slice(params["slice"])

    players_total = Context.count_players(group_tournament.id, slice_index: slice_filter)
    runs_total = Context.count_runs(group_tournament.id, kind: :user)
    slice_runs_total = Context.count_runs(group_tournament.id, kind: :slice)
    solutions_total = Context.count_latest_solutions(group_tournament.id, group_tournament.group_task_id)

    render(conn, "show.html",
      group_tournament: group_tournament,
      slice_filter: slice_filter,
      slice_summaries: Context.list_slice_summaries(group_tournament.id),
      players:
        Context.list_players(group_tournament.id,
          slice_index: slice_filter,
          limit: @page_size,
          offset: (players_page - 1) * @page_size
        ),
      players_page: players_page,
      players_total: players_total,
      players_pages: page_count(players_total, @page_size),
      runs:
        Context.list_runs(group_tournament.id,
          kind: :user,
          limit: @page_size,
          offset: (runs_page - 1) * @page_size
        ),
      runs_page: runs_page,
      runs_total: runs_total,
      runs_pages: page_count(runs_total, @page_size),
      slice_runs:
        Context.list_runs(group_tournament.id,
          kind: :slice,
          limit: @page_size,
          offset: (slice_runs_page - 1) * @page_size
        ),
      slice_runs_page: slice_runs_page,
      slice_runs_total: slice_runs_total,
      slice_runs_pages: page_count(slice_runs_total, @page_size),
      solutions:
        Context.list_paginated_solutions(group_tournament.id, group_tournament.group_task_id,
          limit: @page_size,
          offset: (solutions_page - 1) * @page_size
        ),
      solutions_page: solutions_page,
      solutions_total: solutions_total,
      solutions_pages: page_count(solutions_total, @page_size),
      page_size: @page_size,
      tournament_users: UserGroupTournamentContext.list_users(group_tournament.id),
      token_changeset: token_changeset,
      user: conn.assigns.current_user
    )
  end

  defp parse_page(nil), do: 1

  defp parse_page(value) when is_binary(value) do
    case Integer.parse(value) do
      {n, ""} when n >= 1 -> n
      _ -> 1
    end
  end

  defp parse_page(value) when is_integer(value) and value >= 1, do: value
  defp parse_page(_), do: 1

  defp parse_slice(nil), do: nil
  defp parse_slice(""), do: nil
  defp parse_slice("all"), do: nil
  defp parse_slice("unassigned"), do: :unassigned

  defp parse_slice(value) when is_binary(value) do
    case Integer.parse(value) do
      {n, ""} when n >= 0 -> n
      _ -> nil
    end
  end

  defp parse_slice(value) when is_integer(value) and value >= 0, do: value
  defp parse_slice(_), do: nil

  defp page_count(0, _size), do: 1
  defp page_count(total, size) when total > 0, do: div(total - 1, size) + 1

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
