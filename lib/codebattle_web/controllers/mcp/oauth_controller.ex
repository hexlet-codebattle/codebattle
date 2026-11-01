defmodule CodebattleWeb.Mcp.OauthController do
  use CodebattleWeb, :controller

  alias Codebattle.Mcp.Oauth
  alias CodebattleWeb.Frontend

  @consent_salt "mcp-oauth-consent"

  plug(:no_store)

  def metadata(conn, _params) do
    json(conn, %{
      issuer: Oauth.issuer(),
      authorization_endpoint: Oauth.issuer() <> "/oauth/authorize",
      token_endpoint: Oauth.issuer() <> "/oauth/token",
      registration_endpoint: Oauth.issuer() <> "/oauth/register",
      revocation_endpoint: Oauth.issuer() <> "/oauth/revoke",
      scopes_supported: Oauth.scopes(),
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      revocation_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      authorization_response_iss_parameter_supported: true
    })
  end

  def resource_metadata(conn, _params) do
    json(conn, %{
      resource: Oauth.resource(),
      authorization_servers: [Oauth.issuer()],
      scopes_supported: ["read"],
      bearer_methods_supported: ["header"],
      resource_name: "Codebattle MCP"
    })
  end

  def register(conn, params) do
    case Oauth.register(params) do
      {:ok, client} ->
        conn
        |> put_status(:created)
        |> json(%{
          client_id: client.id,
          client_id_issued_at: DateTime.to_unix(client.inserted_at),
          client_name: client.name,
          redirect_uris: client.redirect_uris,
          token_endpoint_auth_method: "none",
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"]
        })

      {:error, error} ->
        oauth_error(conn, error)
    end
  end

  def authorize(conn, params) do
    case Oauth.authorization(params) do
      {:ok, request} -> show_consent(conn, request)
      {:error, error} -> oauth_error(conn, error)
    end
  end

  def consent(conn, %{"request" => signed_request, "decision" => decision}) when is_binary(signed_request) do
    user = conn.assigns.current_user

    with {:ok, %{user_id: user_id, params: params}} <-
           Phoenix.Token.verify(CodebattleWeb.Endpoint, @consent_salt, signed_request, max_age: 600),
         true <- user_id == user.id,
         {:ok, _request} <- Oauth.authorization(params) do
      decide(conn, user, params, decision)
    else
      _ -> oauth_error(conn, "invalid_request")
    end
  end

  def consent(conn, _params), do: oauth_error(conn, "invalid_request")

  defp decide(conn, user, params, "allow") do
    case Oauth.approve(user, params) do
      {:ok, uri} -> redirect(conn, external: uri)
      {:error, error} -> oauth_error(conn, error)
    end
  end

  defp decide(conn, _user, params, "deny"),
    do: redirect(conn, external: Oauth.redirect_uri(params, %{"error" => "access_denied"}))

  defp decide(conn, _user, _params, _decision), do: oauth_error(conn, "invalid_request")

  def token(conn, params) do
    if get_req_header(conn, "authorization") == [] do
      case Oauth.exchange(params) do
        {:ok, response} -> json(conn, response)
        {:error, error} -> oauth_error(conn, error)
      end
    else
      oauth_error(conn, "invalid_client")
    end
  end

  def revoke(conn, params) do
    Oauth.revoke_token(params)
    send_resp(conn, :ok, "")
  end

  defp show_consent(%{assigns: %{current_user: %{is_guest: true}}} = conn, _request) do
    next = conn.request_path <> if(conn.query_string == "", do: "", else: "?" <> conn.query_string)

    conn
    |> put_session(:mcp_return_to, next)
    |> redirect(to: "/session/new?" <> URI.encode_query(%{"next" => next}))
  end

  defp show_consent(conn, request) do
    user = conn.assigns.current_user

    if Oauth.permitted?(user, request.scopes) do
      signed = Phoenix.Token.sign(CodebattleWeb.Endpoint, @consent_salt, %{user_id: user.id, params: request.params})

      conn
      |> delete_session(:mcp_return_to)
      |> Frontend.put_layout()
      |> render_inertia("McpConsent", %{
        "client_name" => request.client.name,
        "redirect_origin" => redirect_origin(request.params["redirect_uri"]),
        "scopes" => request.scopes,
        "request" => signed
      })
    else
      oauth_error(conn, "access_denied")
    end
  end

  defp redirect_origin(uri) do
    uri |> URI.parse() |> Map.merge(%{path: nil, query: nil}) |> URI.to_string()
  end

  defp oauth_error(conn, error), do: conn |> put_status(:bad_request) |> json(%{error: error})

  defp no_store(conn, _opts) do
    conn
    |> put_resp_header("cache-control", "no-store")
    |> put_resp_header("pragma", "no-cache")
    |> put_resp_header("referrer-policy", "no-referrer")
  end
end
