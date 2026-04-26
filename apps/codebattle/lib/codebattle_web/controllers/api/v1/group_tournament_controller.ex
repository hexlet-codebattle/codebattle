defmodule CodebattleWeb.Api.V1.GroupTournamentController do
  use CodebattleWeb, :controller

  alias Codebattle.GroupTask.Context, as: GroupTaskContext
  alias Codebattle.GroupTournament.Context
  alias Codebattle.GroupTournament.Server
  alias Codebattle.User
  alias Codebattle.UserGroupTournament.Context, as: UserGroupTournamentContext
  alias Runner.Languages

  def show(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user
    group_tournament = Context.get_current(id) || Context.get_group_tournament!(id)

    player_ids = Enum.map(group_tournament.players, & &1.user_id)

    latest_solutions =
      GroupTaskContext.list_latest_solutions(group_tournament.group_task_id, player_ids,
        group_tournament_id: group_tournament.id
      )

    external_setup = ensure_external_setup_if_needed(current_user, group_tournament)

    current_player = Enum.find(group_tournament.players, &(&1.user_id == current_user.id))

    current_user_solutions =
      GroupTaskContext.list_user_solutions(group_tournament.group_task_id, current_user.id,
        group_tournament_id: group_tournament.id
      )

    latest_solution = List.first(current_user_solutions)

    json(conn, %{
      group_tournament: serialize_group_tournament(group_tournament),
      current_player: serialize_player(current_player),
      players: Enum.map(group_tournament.players, &serialize_player/1),
      latest_solutions: Map.new(latest_solutions, &{&1.user_id, serialize_solution(&1)}),
      solution_history: Enum.map(current_user_solutions, &serialize_solution/1),
      latest_solution: serialize_solution(latest_solution),
      runs: Enum.map(Context.list_runs(group_tournament, limit: :infinity), &serialize_run/1),
      langs: Languages.get_langs(),
      can_moderate: can_moderate?(group_tournament, current_user),
      external_setup: serialize_external_setup(external_setup, current_user, group_tournament)
    })
  end

  def join(conn, %{"id" => id, "lang" => lang}) do
    current_user = conn.assigns.current_user

    case Server.join(id, current_user, lang) do
      {:ok, group_tournament} ->
        json(conn, %{
          ok: true,
          group_tournament: serialize_group_tournament(group_tournament)
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: translate_errors(changeset)})

      _ ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found"})
    end
  end

  def submit_solution(conn, %{"id" => id, "solution" => solution}) do
    current_user = conn.assigns.current_user
    group_tournament = Context.get_current(id) || Context.get_group_tournament!(id)
    :ok = Context.ensure_server_started(group_tournament)

    case Server.submit_solution(group_tournament.id, current_user, solution) do
      {:ok, submitted_solution} ->
        json(conn, %{ok: true, solution: serialize_solution(submitted_solution)})

      {:error, :join_tournament_first} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "join_tournament_first"})

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: translate_errors(changeset)})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found"})
    end
  end

  def confirm_invitation(conn, %{"id" => id}) do
    current_user = conn.assigns.current_user

    case Context.start_tournament(id, current_user) do
      {:ok, group_tournament} ->
        json(conn, %{ok: true, group_tournament: serialize_group_tournament(group_tournament)})

      {:error, :invitation_not_accepted} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "invitation_not_accepted"})

      {:error, :invitation_not_required} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "invitation_not_required"})

      {:error, :invalid_state} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "invalid_state"})

      _ ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found"})
    end
  end

  def create_token(conn, %{"id" => id, "user_id" => user_id}) do
    current_user = conn.assigns.current_user
    group_tournament = Context.get_group_tournament!(id)

    if can_moderate?(group_tournament, current_user) do
      create_token_for_user(conn, group_tournament, user_id)
    else
      conn
      |> put_status(:forbidden)
      |> json(%{error: "forbidden"})
    end
  end

  defp can_moderate?(group_tournament, user) do
    group_tournament.creator_id == user.id || User.admin_or_moderator?(user)
  end

  defp serialize_group_tournament(group_tournament) do
    %{
      id: group_tournament.id,
      name: group_tournament.name,
      slug: group_tournament.slug,
      description: group_tournament.description,
      state: group_tournament.state,
      starts_at: group_tournament.starts_at,
      started_at: group_tournament.started_at,
      finished_at: group_tournament.finished_at,
      current_round_position: group_tournament.current_round_position,
      rounds_count: group_tournament.rounds_count,
      round_timeout_seconds: group_tournament.round_timeout_seconds,
      include_bots: group_tournament.include_bots,
      last_round_started_at: group_tournament.last_round_started_at,
      last_round_ended_at: group_tournament.last_round_ended_at,
      players_count: group_tournament.players_count,
      group_task_id: group_tournament.group_task_id,
      group_task_slug: group_tournament.group_task && group_tournament.group_task.slug,
      template_id: Map.get(group_tournament, :template_id),
      meta: group_tournament.meta
    }
  end

  defp serialize_player(nil), do: nil

  defp serialize_player(player) do
    %{
      id: player.id,
      user_id: player.user_id,
      name: player.user && player.user.name,
      lang: player.lang,
      state: player.state,
      last_setup_at: player.last_setup_at,
      inserted_at: player.inserted_at
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

  defp serialize_run(run) do
    %{
      id: run.id,
      player_ids: run.player_ids,
      status: run.status,
      result: run.result,
      score: run.score,
      inserted_at: run.inserted_at
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

  defp parse_user_id(user_id) when is_integer(user_id) and user_id > 0, do: {:ok, user_id}

  defp parse_user_id(user_id) when is_binary(user_id) do
    case Integer.parse(String.trim(user_id)) do
      {parsed_user_id, ""} when parsed_user_id > 0 -> {:ok, parsed_user_id}
      _ -> :error
    end
  end

  defp parse_user_id(_user_id), do: :error

  defp create_token_for_user(conn, group_tournament, user_id) do
    case parse_user_id(user_id) do
      {:ok, parsed_user_id} ->
        persist_group_tournament_token(conn, group_tournament, parsed_user_id)

      :error ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: %{user_id: ["is invalid"]}})
    end
  end

  defp persist_group_tournament_token(conn, group_tournament, parsed_user_id) do
    case Context.create_or_rotate_token(group_tournament, parsed_user_id) do
      {:ok, token} ->
        json(conn, %{token: %{id: token.id, token: token.token, user_id: token.user_id}})

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{errors: translate_errors(changeset)})
    end
  end
end
