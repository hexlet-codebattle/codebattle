defmodule CodebattleWeb.PublicApi.V1.Helpers do
  @moduledoc false

  import Plug.Conn

  alias CodebattleWeb.PublicApi.V1.ErrorJSON

  @doc "Function plug: `plug :require_scope, \"read\" when action in [...]`."
  def require_scope(conn, scope) do
    if scope in conn.assigns.api_token.scopes do
      conn
    else
      ErrorJSON.halt_with(conn, 403, "insufficient_scope", "The token lacks the #{scope} scope")
    end
  end

  def parse_id(id) do
    case Integer.parse(to_string(id)) do
      {id, ""} when id > 0 -> {:ok, id}
      _ -> :error
    end
  end

  def validation_failed(conn, errors) do
    ErrorJSON.send_error(conn, 422, "validation_failed", "Invalid parameters", errors)
  end

  def quota_exceeded(conn, message), do: ErrorJSON.send_error(conn, 429, "quota_exceeded", message)

  def no_store(conn), do: put_resp_header(conn, "cache-control", "no-store")
end
