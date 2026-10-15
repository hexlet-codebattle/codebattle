defmodule CodebattleWeb.Plugs.PublicApi.RequireJson do
  @moduledoc """
  Request bodies must be JSON. Without `Content-Type: application/json` (Ruby's Net::HTTP and
  curl `-d` default to form encoding) Plug parses the JSON text as one form field name, and
  strict validation would answer a baffling `{"{\\"name\\": ...}": "is not allowed"}`.
  """
  import Plug.Conn

  alias CodebattleWeb.PublicApi.V1.ErrorJSON

  def init(opts), do: opts

  def call(%{body_params: params} = conn, _opts) when is_map(params) and map_size(params) > 0 do
    if json?(conn) do
      conn
    else
      ErrorJSON.halt_with(
        conn,
        415,
        "unsupported_media_type",
        "Send the request body as JSON with the header Content-Type: application/json"
      )
    end
  end

  def call(conn, _opts), do: conn

  defp json?(conn) do
    case get_req_header(conn, "content-type") do
      [type | _] -> type |> String.downcase() |> String.starts_with?("application/json")
      [] -> false
    end
  end
end
