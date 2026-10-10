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

  # `message` names every failed field so a client that logs only the message still sees what
  # to fix; `details` keeps the same errors machine-readable.
  def validation_failed(conn, errors) do
    ErrorJSON.send_error(conn, 422, "validation_failed", "Invalid parameters: " <> describe_errors(errors), errors)
  end

  def describe_errors(errors) do
    errors
    |> flatten_errors(nil)
    |> Enum.sort()
    |> Enum.map_join("; ", fn {field, message} -> "#{field} #{message}" end)
  end

  defp flatten_errors(errors, prefix) when is_map(errors) do
    Enum.flat_map(errors, fn {field, value} ->
      flatten_errors(value, if(prefix, do: "#{prefix}.#{field}", else: to_string(field)))
    end)
  end

  defp flatten_errors(messages, field) when is_list(messages), do: [{field, Enum.join(messages, ", ")}]
  defp flatten_errors(message, field), do: [{field, to_string(message)}]

  def quota_exceeded(conn, message), do: ErrorJSON.send_error(conn, 429, "quota_exceeded", message)

  def no_store(conn), do: put_resp_header(conn, "cache-control", "no-store")
end
