defmodule CodebattleWeb.PublicApi.V1.ErrorJSON do
  @moduledoc ~s(Error format of the public API: `{"error": {"code": ..., "message": ...}}`.)

  import Plug.Conn

  def halt_with(conn, status, code, message, details \\ nil) do
    conn
    |> send_error(status, code, message, details)
    |> halt()
  end

  def send_error(conn, status, code, message, details \\ nil) do
    error = %{code: code, message: message}
    error = if details, do: Map.put(error, :details, details), else: error

    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(%{error: error}))
  end

  # Unrelated and missing objects look the same, so probing ids reveals nothing.
  def not_found(conn), do: send_error(conn, 404, "not_found", "Not found")
end
