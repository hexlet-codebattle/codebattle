defmodule CodebattleWeb.PublicApi.V1.TournamentController do
  use CodebattleWeb, :controller

  import CodebattleWeb.PublicApi.V1.Helpers
  import Ecto.Query

  alias Codebattle.ApiAuditEvent
  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias Codebattle.Tournament.UserParams
  alias CodebattleWeb.PublicApi.V1.ErrorJSON
  alias CodebattleWeb.PublicApi.V1.JSON
  alias CodebattleWeb.PublicApi.V1.Params

  @schedule_days 14
  @schedule_states ~w(upcoming waiting_participants active)
  @editable_states ~w(upcoming waiting_participants)
  @participant_top 20

  @tournament_spec %{
    "name" => {:string, length: {3, 100}},
    "description" => {:string, length: {3, 2000}},
    "starts_at" => {:datetime, max_days_ahead: 30},
    "level" => {{:enum, ~w(elementary easy medium hard)}, []},
    "players_limit" => {:integer, range: {2, 64}},
    "rounds_limit" => {:integer, range: {1, 10}},
    "timeout_mode" => {{:enum, ~w(per_task per_round_fixed)}, []},
    "match_timeout_seconds" => {:integer, range: {60, 3600}},
    "round_timeout_seconds" => {:integer, range: {60, 3600}},
    "break_duration_seconds" => {:integer, range: {0, 600}},
    "use_chat" => {:boolean, []}
  }
  @create_required ~w(name description starts_at level)

  plug(:require_scope, "read" when action in [:schedule, :show, :ranking])
  plug(:require_scope, "tournaments:write" when action in [:create, :update, :start, :cancel])

  def schedule(conn, _params) do
    now = DateTime.utc_now()

    tournaments =
      from(t in Tournament,
        where: t.access_type == "public" and t.state in @schedule_states,
        where: t.starts_at >= ^DateTime.add(now, -1, :day) and t.starts_at <= ^DateTime.add(now, @schedule_days, :day),
        order_by: [asc: t.starts_at],
        limit: 100
      )
      |> Repo.all()
      |> Enum.map(&JSON.tournament(&1, nil))

    json(conn, %{tournaments: tournaments})
  end

  def show(conn, %{"id" => id}) do
    with_visible_tournament(conn, id, fn tournament ->
      json(conn, %{tournament: JSON.tournament(tournament, conn.assigns.current_user)})
    end)
  end

  def ranking(conn, %{"id" => id} = params) do
    user = conn.assigns.current_user

    with_related_tournament(conn, id, fn tournament ->
      if Helpers.can_moderate?(tournament, user) do
        page = params |> Map.get("page", "1") |> to_page()
        page_size = params |> Map.get("page_size", "50") |> to_page() |> min(100)
        ranking = Tournament.Ranking.get_page(tournament, page, page_size)

        json(conn, %{
          ranking: Enum.map(ranking.entries, &JSON.ranking_entry/1),
          page_info: %{page_number: page, page_size: page_size, total_entries: ranking.total_entries}
        })
      else
        top = Tournament.Ranking.get_first(tournament, @participant_top)
        me = Tournament.Ranking.get_by_id(tournament, user.id)

        json(conn, %{
          ranking: Enum.map(top, &JSON.ranking_entry/1),
          me: me && JSON.ranking_entry(me)
        })
      end
    end)
  end

  def create(conn, params) do
    user = conn.assigns.current_user
    body = Map.delete(params, "format")

    with {:ok, body} <- Params.validate(body, @tournament_spec),
         :ok <- require_fields(body, @create_required),
         :ok <- check_create_quota(user),
         {:ok, permitted} <- body |> to_tournament_params() |> UserParams.permit(user),
         {:ok, tournament} <- permitted |> Map.merge(forced_params(user)) |> Tournament.Context.create() do
      ApiAuditEvent.log!(user.id, conn.assigns.api_token.id, "tournament.create", "tournament", tournament.id)
      conn |> put_status(:created) |> json(%{tournament: JSON.tournament(tournament, user)})
    else
      {:quota, message} -> quota_exceeded(conn, message)
      {:error, %Ecto.Changeset{} = changeset} -> validation_failed(conn, changeset_errors(changeset))
      {:error, errors} when is_map(errors) -> validation_failed(conn, errors)
      {:error, reason} -> ErrorJSON.send_error(conn, 422, "validation_failed", to_string(reason))
    end
  end

  def update(conn, %{"id" => id} = params) do
    user = conn.assigns.current_user
    body = Map.drop(params, ["id", "format"])

    with_own_tournament(conn, id, fn tournament ->
      with true <- tournament.state in @editable_states || {:error, %{"state" => "already started"}},
           {:ok, body} <- Params.validate(body, @tournament_spec),
           {:ok, permitted} <- body |> to_tournament_params() |> UserParams.permit(user, tournament),
           {:ok, updated} <- Tournament.Context.update(tournament, Map.merge(keep_params(tournament), permitted)) do
        ApiAuditEvent.log!(user.id, conn.assigns.api_token.id, "tournament.update", "tournament", tournament.id)
        json(conn, %{tournament: JSON.tournament(updated, user)})
      else
        {:error, %Ecto.Changeset{} = changeset} -> validation_failed(conn, changeset_errors(changeset))
        {:error, errors} -> validation_failed(conn, errors)
      end
    end)
  end

  def start(conn, %{"id" => id}) do
    run_event(conn, id, :start, "tournament.start", "waiting_participants")
  end

  def cancel(conn, %{"id" => id}) do
    run_event(conn, id, :cancel, "tournament.cancel", nil)
  end

  defp run_event(conn, id, event, action, required_state) do
    user = conn.assigns.current_user

    with_own_tournament(conn, id, fn tournament ->
      if required_state && tournament.state != required_state do
        validation_failed(conn, %{"state" => "must be #{required_state}"})
      else
        Tournament.Context.handle_event(tournament.id, event, %{user: user})
        ApiAuditEvent.log!(user.id, conn.assigns.api_token.id, action, "tournament", tournament.id)
        json(conn, %{tournament: JSON.tournament(Tournament.Context.get!(tournament.id), user)})
      end
    end)
  end

  # Visible: related to the user, or public and in the schedule window.
  defp with_visible_tournament(conn, id, fun) do
    load(conn, id, fun, fn tournament, user ->
      related?(tournament, user) ||
        (tournament.access_type == "public" and tournament.state in @schedule_states)
    end)
  end

  defp with_related_tournament(conn, id, fun), do: load(conn, id, fun, &related?/2)

  # Writes through the API are for the creator only (moderators use the site).
  defp with_own_tournament(conn, id, fun), do: load(conn, id, fun, &(&1.creator_id == &2.id))

  defp load(conn, id, fun, allowed?) do
    with {:ok, id} <- parse_id(id),
         %Tournament{} = tournament <- Tournament.Context.get(id),
         true <- allowed?.(tournament, conn.assigns.current_user) do
      fun.(tournament)
    else
      _ -> ErrorJSON.not_found(conn)
    end
  end

  defp related?(tournament, user) do
    Helpers.can_moderate?(tournament, user) || Helpers.player?(tournament, user.id)
  end

  # API tournaments never touch seasons, events or task packs and are always private.
  defp forced_params(user) do
    %{
      "creator" => user,
      "type" => "swiss",
      "access_type" => "token",
      "grade" => "open",
      "task_provider" => "level",
      "user_timezone" => "Etc/UTC"
    }
  end

  # Context.update rebuilds these from params on every call (missing starts_at means
  # "in an hour", missing timeouts reset to defaults); carry the current values over.
  defp keep_params(tournament) do
    %{
      "access_type" => tournament.access_type,
      "type" => tournament.type,
      "user_timezone" => "Etc/UTC",
      "starts_at" => format_starts_at(tournament.starts_at),
      "timeout_mode" => tournament.timeout_mode,
      "match_timeout_seconds" => tournament.match_timeout_seconds,
      "round_timeout_seconds" => tournament.round_timeout_seconds,
      "tournament_timeout_seconds" => tournament.tournament_timeout_seconds,
      "show_results" => tournament.show_results,
      "meta" => tournament.meta
    }
  end

  defp to_tournament_params(body) do
    case body do
      %{"starts_at" => starts_at} ->
        {:ok, datetime, _offset} = DateTime.from_iso8601(starts_at)
        Map.put(body, "starts_at", format_starts_at(datetime))

      _ ->
        body
    end
  end

  # Tournament.Context expects "YYYY-MM-DDTHH:MM" plus user_timezone.
  defp format_starts_at(%DateTime{} = datetime),
    do: datetime |> DateTime.shift_zone!("Etc/UTC") |> Calendar.strftime("%Y-%m-%dT%H:%M")

  defp format_starts_at(%NaiveDateTime{} = naive), do: Calendar.strftime(naive, "%Y-%m-%dT%H:%M")

  defp require_fields(body, fields) do
    case Enum.reject(fields, &Map.has_key?(body, &1)) do
      [] -> :ok
      missing -> {:error, Map.new(missing, &{&1, "is required"})}
    end
  end

  defp check_create_quota(user) do
    {per_day, max_active} = Application.get_env(:codebattle, :public_api_tournament_quota, {5, 3})

    active_count =
      Repo.aggregate(
        from(t in Tournament,
          where: t.id in ^ApiAuditEvent.resource_ids(user.id, "tournament.create"),
          where: t.state in ["upcoming", "waiting_participants", "active"]
        ),
        :count
      )

    cond do
      ApiAuditEvent.count_since(user.id, "tournament.create", DateTime.add(DateTime.utc_now(), -1, :day)) >= per_day ->
        {:quota, "At most #{per_day} tournaments per day"}

      active_count >= max_active ->
        {:quota, "At most #{max_active} not finished tournaments created through the API"}

      true ->
        :ok
    end
  end

  defp to_page(value) do
    case Integer.parse(to_string(value)) do
      {page, ""} when page > 0 -> page
      _ -> 1
    end
  end

  defp changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
  end
end
