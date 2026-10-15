defmodule CodebattleWeb.Admin.GroupTournamentJsonController do
  @moduledoc """
  Token-authed (or admin-session) JSON read endpoints for group tournaments.

  Auth mirrors `CodebattleWeb.Tournament.StreamController.json_state/2` —
  same api_key from `Application.get_env(:codebattle, :api_key)`, same param
  names (`auth_token` / `auth-key` query, or `x-auth-key` header).
  """

  use CodebattleWeb, :controller

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserGroupTournamentRun

  @doc """
  Serve the most recent run's `history` blob for the given group tournament.

  Picks the latest slice run if one exists, otherwise falls back to the
  latest user run. Returns the raw `result["history"]` JSON (the same payload
  served by `/admin/group_tasks/:id/runs/:run_id/history`).
  """
  def history(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]

    with {:ok, group_tournament_id} <- parse_id(id),
         true <- authorized?(conn, current_user),
         %UserGroupTournamentRun{} = run <- latest_run(group_tournament_id) do
      data = Map.get(run.result || %{}, "history", %{})

      conn
      |> put_resp_content_type("application/json")
      |> put_resp_header(
        "content-disposition",
        ~s(attachment; filename="group_tournament_#{group_tournament_id}_history.json")
      )
      |> send_resp(200, Jason.encode_to_iodata!(data, pretty: true))
    else
      false ->
        conn |> put_status(:not_found) |> json(%{error: "NOT_FOUND"}) |> halt()

      _ ->
        conn |> put_status(:not_found) |> json(%{error: "NOT_FOUND"}) |> halt()
    end
  end

  # Prefer the most recent slice run; fall back to the most recent user run.
  defp latest_run(group_tournament_id) do
    case fetch_latest_run(group_tournament_id, "slice") do
      %UserGroupTournamentRun{} = run -> run
      nil -> fetch_latest_run(group_tournament_id, "user")
    end
  end

  defp fetch_latest_run(group_tournament_id, kind) do
    UserGroupTournamentRun
    |> where([r], r.group_tournament_id == ^group_tournament_id and r.kind == ^kind)
    |> order_by([r], desc: r.inserted_at, desc: r.id)
    |> limit(1)
    |> Repo.one()
  end

  defp authorized?(conn, current_user) do
    User.admin_or_moderator?(current_user) or valid_api_token?(conn)
  end

  defp valid_api_token?(conn) do
    expected = Application.get_env(:codebattle, :api_key)
    provided = extract_api_token(conn)
    is_binary(expected) and expected != "" and expected == provided
  end

  defp extract_api_token(conn) do
    case Plug.Conn.get_req_header(conn, "x-auth-key") do
      [header_key | _] -> header_key
      _ -> conn.params["auth-key"] || conn.params["auth_token"]
    end
  end

  defp parse_id(id) when is_integer(id) and id > 0, do: {:ok, id}

  defp parse_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {n, ""} when n > 0 -> {:ok, n}
      _ -> :error
    end
  end

  defp parse_id(_), do: :error
end
