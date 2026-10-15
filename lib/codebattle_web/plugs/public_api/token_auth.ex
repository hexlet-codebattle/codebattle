defmodule CodebattleWeb.Plugs.PublicApi.TokenAuth do
  @moduledoc """
  Authenticates `/public_api/v1` requests by `Authorization: Bearer cbp_...`.

  Every v1 endpoint requires a token (only the header is accepted, never a query param).
  Also handles the kill switches: `:public_api_disabled` and `:public_api_writes_disabled`.
  """
  import Plug.Conn

  alias Codebattle.UserApiToken
  alias CodebattleWeb.PublicApi.V1.ErrorJSON

  def init(opts), do: opts

  def call(conn, _opts) do
    cond do
      FunWithFlags.enabled?(:public_api_disabled) ->
        ErrorJSON.halt_with(conn, 503, "api_disabled", "The public API is temporarily disabled")

      conn.method != "GET" and FunWithFlags.enabled?(:public_api_writes_disabled) ->
        ErrorJSON.halt_with(conn, 503, "api_disabled", "Write operations are temporarily disabled")

      true ->
        authenticate(conn)
    end
  end

  defp authenticate(conn) do
    with ["Bearer " <> raw] <- get_req_header(conn, "authorization"),
         %UserApiToken{} = token <- UserApiToken.get_active_by_token(String.trim(raw)) do
      conn
      |> assign(:current_user, token.user)
      |> assign(:api_token, token)
    else
      [] ->
        conn
        |> put_resp_header("www-authenticate", ~s(Bearer realm="codebattle"))
        |> ErrorJSON.halt_with(401, "unauthorized", "Pass a personal API token: Authorization: Bearer <token>")

      _ ->
        conn
        |> put_resp_header("www-authenticate", ~s(Bearer error="invalid_token"))
        |> ErrorJSON.halt_with(401, "invalid_token", "The token is invalid, expired or revoked")
    end
  end
end
