defmodule CodebattleWeb.PublicApi.V1.InviteController do
  use CodebattleWeb, :controller

  import CodebattleWeb.PublicApi.V1.Helpers

  alias Codebattle.ApiAuditEvent
  alias Codebattle.Invite
  alias Codebattle.Repo
  alias Codebattle.User
  alias CodebattleWeb.PublicApi.V1.ErrorJSON
  alias CodebattleWeb.PublicApi.V1.JSON
  alias CodebattleWeb.PublicApi.V1.Params

  @max_wait_seconds 30

  @create_spec %{
    "recipient_id" => {:integer, range: {1, 2_147_483_647}},
    "recipient_name" => {:string, length: {1, 100}},
    "level" => {{:enum, ~w(elementary easy medium hard)}, []},
    "task_id" => {:integer, range: {1, 2_147_483_647}},
    "task_name" => {:string, length: {1, 255}},
    "timeout_seconds" => {:integer, range: {60, 3600}}
  }

  plug(:require_scope, "read" when action in [:index])
  plug(:require_scope, "games:write" when action in [:create, :accept, :cancel])

  # Long polling: with `wait`, the request blocks until the invite list differs from `version`
  # (the value from the previous response) or `wait` seconds pass. Comparing versions instead
  # of only waiting for events means nothing is lost between two polls.
  def index(conn, params) do
    user = conn.assigns.current_user

    case parse_wait(params["wait"]) do
      {:ok, wait} ->
        if wait > 0 and params["version"] == version(user) do
          Codebattle.PubSub.subscribe("invites:#{user.id}")
          await_invite_event(wait * 1000)
        end

        invites = Invite.list_active_invites(user.id)

        conn
        |> no_store()
        |> json(%{
          invites: Enum.map(invites, &JSON.invite(&1, user.id)),
          version: version_of(invites),
          server_time: JSON.server_time()
        })

      {:error, errors} ->
        validation_failed(conn, errors)
    end
  end

  def create(conn, params) do
    user = conn.assigns.current_user

    with {:ok, body} <- Params.validate(Map.delete(params, "format"), @create_spec),
         {:ok, recipient_id} <- recipient_id(body),
         {:ok, task} <- fetch_task(user, body),
         :ok <- check_task_level(body["level"], task) do
      params = %{
        recipient_id: recipient_id,
        level: body["level"],
        timeout_seconds: body["timeout_seconds"],
        task_id: task && task.id
      }

      case Invite.Actions.create(user, params) do
        {:ok, invite} ->
          ApiAuditEvent.log!(user.id, conn.assigns.api_token.id, "invite.create", "invite", invite.id)
          conn |> put_status(:created) |> json(%{invite: JSON.invite(invite, user.id)})

        {:error, reason} when reason in [:invalid_recipient, :recipient_not_found] ->
          validation_failed(conn, %{"recipient" => message(reason)})

        {:error, reason} ->
          ErrorJSON.send_error(conn, 422, "validation_failed", message(reason))
      end
    else
      {:error, errors} -> validation_failed(conn, errors)
    end
  end

  def accept(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    with {:ok, id} <- parse_id(id),
         {:ok, invite} <- Invite.Actions.accept(id, user) do
      ApiAuditEvent.log!(user.id, conn.assigns.api_token.id, "invite.accept", "invite", id)
      json(conn, %{invite: JSON.invite(invite, user.id)})
    else
      {:error, :not_found} -> ErrorJSON.not_found(conn)
      :error -> ErrorJSON.not_found(conn)
      {:error, reason, _dropped} -> ErrorJSON.send_error(conn, 422, "validation_failed", message(reason))
      {:error, reason} -> ErrorJSON.send_error(conn, 422, "validation_failed", message(reason))
    end
  end

  def cancel(conn, %{"id" => id}) do
    user = conn.assigns.current_user

    with {:ok, id} <- parse_id(id),
         {:ok, invite} <- Invite.Actions.cancel(id, user) do
      ApiAuditEvent.log!(user.id, conn.assigns.api_token.id, "invite.cancel", "invite", id)
      json(conn, %{invite: JSON.invite(invite, user.id)})
    else
      {:error, :not_found} -> ErrorJSON.not_found(conn)
      :error -> ErrorJSON.not_found(conn)
      {:error, reason} -> ErrorJSON.send_error(conn, 422, "validation_failed", message(reason))
    end
  end

  defp recipient_id(%{"recipient_id" => id, "recipient_name" => _}) when is_integer(id),
    do: {:error, %{"recipient_name" => "pass either recipient_id or recipient_name"}}

  defp recipient_id(%{"recipient_id" => id}), do: {:ok, id}

  defp recipient_id(%{"recipient_name" => name}) do
    case Repo.get_by(User, name: name) do
      %User{id: id} -> {:ok, id}
      nil -> {:error, %{"recipient_name" => "no such user"}}
    end
  end

  defp recipient_id(_body), do: {:error, %{"recipient_id" => "recipient_id or recipient_name is required"}}

  defp parse_wait(nil), do: {:ok, 0}

  defp parse_wait(value) do
    case Integer.parse(value) do
      {wait, ""} when wait in 0..@max_wait_seconds -> {:ok, wait}
      _ -> {:error, %{"wait" => "must be an integer in 0..#{@max_wait_seconds}"}}
    end
  end

  defp await_invite_event(timeout_ms) do
    receive do
      %{topic: "invites:" <> _, event: "invites:" <> _} -> :ok
    after
      timeout_ms -> :timeout
    end
  end

  defp version(user), do: user.id |> Invite.list_active_invites() |> version_of()

  defp version_of(invites) do
    invites
    |> Enum.map(&{&1.id, &1.state})
    |> Enum.sort()
    |> :erlang.phash2()
    |> Integer.to_string(36)
  end

  defp message(:invalid_recipient), do: "can't invite yourself"
  defp message(:recipient_not_found), do: "no such user"
  defp message(:already_invited), do: "There is already a pending invite between you two"
  defp message(:invite_is_not_pending), do: "The invite is not pending anymore"
  defp message(:task_not_found), do: "no such task"
  defp message(:already_in_a_game), do: "One of the players is already in a game; the invite was dropped"
  defp message(reason), do: to_string(reason)
end
