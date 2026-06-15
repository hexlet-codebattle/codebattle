defmodule CodebattleWeb.Admin.GroupTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTournament
  alias Codebattle.GroupTournament.Context
  alias Codebattle.GroupTournament.LeaderboardStore
  alias Codebattle.GroupTournament.Server
  alias Codebattle.GroupTournament.SliceRunner
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

  @start_timer_duration_seconds 5 * 60

  def start_timer(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)

    if group_tournament.state == "waiting_participants" do
      new_starts_at = DateTime.add(DateTime.utc_now(), @start_timer_duration_seconds, :second)

      case Context.update_group_tournament(group_tournament, %{"starts_at" => new_starts_at}) do
        {:ok, _updated} ->
          conn
          |> put_flash(:info, "Start timer set — tournament will begin in 5 minutes.")
          |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

        {:error, _changeset} ->
          conn
          |> put_flash(:error, "Failed to set start timer.")
          |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
      end
    else
      conn
      |> put_flash(:error, "Start timer can only be set while waiting for participants.")
      |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
    end
  end

  def smooth_start(conn, %{"id" => id}) do
    :ok = Context.ensure_server_started(id)

    case Server.smooth_start(id) do
      {:ok, group_tournament} ->
        conn
        |> put_flash(:info, "Group tournament started — status update will roll out to players over 60 seconds.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:error, :invalid_state} ->
        conn
        |> put_flash(:error, "Smooth start is only available while waiting for participants.")
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

  def force_finish_break(conn, %{"id" => id}) do
    :ok = Context.ensure_server_started(id)

    case Server.force_finish_break(id) do
      {:ok, group_tournament} ->
        conn
        |> put_flash(:info, "Break finished — next round started with the same slices.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:error, :not_in_break} ->
        conn
        |> put_flash(:error, "Tournament is not currently in a break.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, id))

      {:error, :invalid_state} ->
        conn
        |> put_flash(:error, "Break can only be force-finished while the tournament is active.")
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
           include_bots: group_tournament.include_bots,
           round: group_tournament.current_round_position || 1
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

  def run_all_slices(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)

    results = SliceRunner.run_all_slices(group_tournament)

    {ok, skipped, errored} =
      Enum.reduce(results, {0, 0, 0}, fn
        {_idx, :ok, _}, {o, s, e} -> {o + 1, s, e}
        {_idx, :skipped, _}, {o, s, e} -> {o, s + 1, e}
        {_idx, {:error, _}, _}, {o, s, e} -> {o, s, e + 1}
      end)

    flash_msg = "Ran slices: #{ok} ok, #{skipped} skipped, #{errored} errored."

    conn
    |> put_flash(if(errored == 0, do: :info, else: :error), flash_msg)
    |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
  end

  def toggle_leaderboard(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)
    next_value = !group_tournament.show_leaderboard

    case Context.update_group_tournament(group_tournament, %{"show_leaderboard" => next_value}) do
      {:ok, _updated} ->
        msg = if next_value, do: "Leaderboard shown to players.", else: "Leaderboard hidden from players."

        conn
        |> put_flash(:info, msg)
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:error, _changeset} ->
        conn
        |> put_flash(:error, "Failed to toggle leaderboard visibility.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
    end
  end

  def hide_repos(conn, %{"id" => id} = params), do: enqueue_bulk_op(conn, id, params, :hide)
  def unveil_repos(conn, %{"id" => id} = params), do: enqueue_bulk_op(conn, id, params, :unveil)
  def delete_repos(conn, %{"id" => id} = params), do: enqueue_bulk_op(conn, id, params, :delete)
  def occupy_seats(conn, %{"id" => id} = params), do: enqueue_bulk_op(conn, id, params, :occupy_seats)
  def release_seats(conn, %{"id" => id} = params), do: enqueue_bulk_op(conn, id, params, :release_seats)
  def remove_dev_roles(conn, %{"id" => id} = params), do: enqueue_bulk_op(conn, id, params, :remove_dev_roles)
  def add_viewer_roles(conn, %{"id" => id} = params), do: enqueue_bulk_op(conn, id, params, :add_viewer_roles)

  defp enqueue_bulk_op(conn, id, params, action) do
    group_tournament = Context.get_group_tournament!(id)
    batch_size = parse_bulk_op_batch_size(action, get_in(params, ["bulk_repo", "batch_size"]))
    {label, unit, enqueued, rate_note} = run_bulk_op(action, group_tournament, batch_size)
    {kind, message} = bulk_op_flash(label, unit, enqueued, rate_note)

    conn
    |> put_flash(kind, message)
    |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
  end

  @bulk_per_user_ops %{
    delete: {"delete", &UserGroupTournamentContext.enqueue_bulk_delete/2},
    occupy_seats: {"occupy-seat", &UserGroupTournamentContext.enqueue_bulk_occupy_seats/2},
    release_seats: {"release-seat", &UserGroupTournamentContext.enqueue_bulk_release_seats/2},
    remove_dev_roles: {"remove-dev-role", &UserGroupTournamentContext.enqueue_bulk_remove_dev_roles/2},
    add_viewer_roles: {"add-viewer-role", &UserGroupTournamentContext.enqueue_bulk_add_viewer_roles/2}
  }

  defp run_bulk_op(:hide, gt, chunk_size),
    do: {"hide", "repos", UserGroupTournamentContext.enqueue_bulk_hide(gt, chunk_size), {:chunked, chunk_size}}

  defp run_bulk_op(:unveil, gt, chunk_size),
    do: {"unveil", "repos", UserGroupTournamentContext.enqueue_bulk_unveil(gt, chunk_size), {:chunked, chunk_size}}

  defp run_bulk_op(action, gt, batch_size) do
    {label, fun} = Map.fetch!(@bulk_per_user_ops, action)
    {label, "users", fun.(gt, batch_size), batch_size}
  end

  defp bulk_op_flash(label, _unit, 0, _rate_note), do: {:error, "Nothing to enqueue for #{label}."}

  defp bulk_op_flash(label, unit, enqueued, {:chunked, chunk_size}),
    do: {:info, "Enqueued #{label} jobs covering #{enqueued} #{unit} (chunks of #{chunk_size} per bulk call)."}

  defp bulk_op_flash(label, unit, enqueued, batch_size),
    do: {:info, "Enqueued #{label} jobs for #{enqueued} #{unit} (rate: #{batch_size} jobs/sec)."}

  def broadcast_redirect(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)
    url = Routes.group_tournament_path(conn, :show, group_tournament)

    Codebattle.PubSub.broadcast("main:redirect", %{
      url: url,
      group_tournament_id: group_tournament.id
    })

    conn
    |> put_flash(:info, "Redirect broadcast sent to all non-admin users on the main channel.")
    |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
  end

  def toggle_visibility(conn, %{"id" => id}) do
    group_tournament = Context.get_group_tournament!(id)
    next_value = !group_tournament.visible_to_users

    case Context.update_group_tournament(group_tournament, %{"visible_to_users" => next_value}) do
      {:ok, _updated} ->
        msg =
          if next_value,
            do: "Tournament is now visible to players.",
            else: "Tournament is now hidden — only admins/moderators can access it."

        conn
        |> put_flash(:info, msg)
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))

      {:error, _changeset} ->
        conn
        |> put_flash(:error, "Failed to toggle tournament visibility.")
        |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
    end
  end

  def leaderboard(conn, %{"id" => id} = params) do
    group_tournament = Context.get_group_tournament!(id)
    :ok = Context.ensure_server_started(group_tournament)
    view = parse_leaderboard_view(params["view"], group_tournament.rounds_count)

    render(conn, "leaderboard.html",
      group_tournament: group_tournament,
      leaderboard: LeaderboardStore.list(group_tournament.id),
      view: view,
      user: conn.assigns.current_user
    )
  end

  defp parse_leaderboard_view(nil, _rounds_count), do: :rating
  defp parse_leaderboard_view("rating", _rounds_count), do: :rating

  defp parse_leaderboard_view(value, rounds_count) when is_binary(value) do
    case Integer.parse(value) do
      {n, ""} when n >= 1 and (is_nil(rounds_count) or n <= rounds_count) -> {:round, n}
      _ -> :rating
    end
  end

  defp parse_leaderboard_view(_, _), do: :rating

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

  def bulk_add_users(conn, %{"id" => id} = params) do
    group_tournament = Context.get_group_tournament!(id)
    user_ids = parse_bulk_user_ids(get_in(params, ["bulk_add_users", "user_ids"]))

    {added, missing} =
      Enum.reduce(user_ids, {0, []}, fn user_id, {ok_count, missing_acc} ->
        case Codebattle.Repo.get(Codebattle.User, user_id) do
          nil ->
            {ok_count, [user_id | missing_acc]}

          user ->
            UserGroupTournamentContext.get_or_create(user, group_tournament)
            Context.create_or_update_player(group_tournament, user.id, %{lang: "js", state: "active"})
            {ok_count + 1, missing_acc}
        end
      end)

    missing = Enum.reverse(missing)

    flash =
      cond do
        user_ids == [] ->
          {:error, "No valid user IDs provided."}

        missing == [] ->
          {:info, "Added #{added} users to the tournament."}

        true ->
          {:info, "Added #{added} users. Missing user IDs: #{Enum.join(missing, ", ")}"}
      end

    {kind, message} = flash

    conn
    |> put_flash(kind, message)
    |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
  end

  def bulk_external_setup(conn, %{"id" => id} = params) do
    group_tournament = Context.get_group_tournament!(id)
    bulk_params = Map.get(params, "bulk_setup", %{})
    user_ids = parse_bulk_user_ids(bulk_params["user_ids"])
    batch_size = parse_batch_size(bulk_params["batch_size"])

    {enqueued, missing} =
      user_ids
      |> Enum.with_index()
      |> Enum.reduce({0, []}, fn {user_id, idx}, {ok_count, missing_acc} ->
        case Codebattle.Repo.get(Codebattle.User, user_id) do
          nil ->
            {ok_count, [user_id | missing_acc]}

          user ->
            UserGroupTournamentContext.get_or_create(user, group_tournament)

            %{user_id: user.id, group_tournament_id: group_tournament.id}
            |> Codebattle.Workers.ExternalSetupWorker.new(schedule_in: div(idx, batch_size))
            |> Oban.insert()

            {ok_count + 1, missing_acc}
        end
      end)

    missing = Enum.reverse(missing)

    flash =
      if user_ids == [] do
        {:error, "No valid user IDs provided."}
      else
        msg = "Enqueued external setup for #{enqueued} users (rate: #{batch_size} jobs/sec)."
        msg = if missing == [], do: msg, else: msg <> " Missing user IDs: #{Enum.join(missing, ", ")}"
        {:info, msg}
      end

    {kind, message} = flash

    conn
    |> put_flash(kind, message)
    |> redirect(to: Routes.admin_group_tournament_path(conn, :show, group_tournament))
  end

  defp parse_bulk_user_ids(nil), do: []

  defp parse_bulk_user_ids(input) when is_binary(input) do
    input
    |> String.split([",", "\n", "\r", " ", "\t", ";"], trim: true)
    |> Enum.flat_map(fn token ->
      case token |> String.trim() |> Integer.parse() do
        {n, ""} when n > 0 -> [n]
        _ -> []
      end
    end)
    |> Enum.uniq()
  end

  defp parse_bulk_user_ids(_), do: []

  # Default 50 jobs/sec keeps us comfortably below the external service's 100 RPS cap
  # even with concurrent runs from other tournaments.
  @default_batch_size 50
  @max_batch_size 100
  @default_repo_chunk_size 500
  @repo_chunk_sizes [1, 10, 100, 500]

  defp parse_bulk_op_batch_size(action, value) when action in [:hide, :unveil], do: parse_repo_chunk_size(value)
  defp parse_bulk_op_batch_size(_action, value), do: parse_batch_size(value)

  defp parse_batch_size(nil), do: @default_batch_size

  defp parse_batch_size(value) when is_binary(value) do
    case value |> String.trim() |> Integer.parse() do
      {n, ""} when n >= 1 and n <= @max_batch_size -> n
      _ -> @default_batch_size
    end
  end

  defp parse_batch_size(value) when is_integer(value) and value >= 1 and value <= @max_batch_size, do: value
  defp parse_batch_size(_), do: @default_batch_size

  defp parse_repo_chunk_size(nil), do: @default_repo_chunk_size

  defp parse_repo_chunk_size(value) when is_binary(value) do
    case value |> String.trim() |> Integer.parse() do
      {n, ""} when n in @repo_chunk_sizes -> n
      _ -> @default_repo_chunk_size
    end
  end

  defp parse_repo_chunk_size(value) when value in @repo_chunk_sizes, do: value
  defp parse_repo_chunk_size(_), do: @default_repo_chunk_size

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
