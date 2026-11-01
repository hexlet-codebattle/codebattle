defmodule CodebattleWeb.Mcp.OauthControllerTest do
  use CodebattleWeb.ConnCase, async: false

  import Inertia.Testing

  alias Codebattle.Mcp.Oauth
  alias Codebattle.Mcp.Oauth.Code
  alias Codebattle.Mcp.Oauth.Connection
  alias Codebattle.Mcp.Oauth.Token

  setup do
    Cachex.clear(:anonymous_rate_limit_cache)
    Cachex.clear(:public_api_rate_limit_cache)
    FunWithFlags.disable(:public_api_disabled)

    {:ok, client} =
      Oauth.register(%{"client_name" => "Test client", "redirect_uris" => ["http://127.0.0.1:8765/callback"]})

    verifier = Base.url_encode64(:crypto.strong_rand_bytes(32), padding: false)

    params = %{
      "client_id" => client.id,
      "redirect_uri" => hd(client.redirect_uris),
      "response_type" => "code",
      "code_challenge" => verifier |> then(&:crypto.hash(:sha256, &1)) |> Base.url_encode64(padding: false),
      "code_challenge_method" => "S256",
      "resource" => Oauth.resource(),
      "scope" => "read",
      "state" => "client-state"
    }

    user = insert(:user, inserted_at: NaiveDateTime.add(NaiveDateTime.utc_now(), -30, :day))
    %{client: client, verifier: verifier, params: params, user: user}
  end

  defp code(user, params) do
    {:ok, uri} = Oauth.approve(user, params)
    URI.decode_query(URI.parse(uri).query)["code"]
  end

  defp exchange_params(context) do
    %{
      "grant_type" => "authorization_code",
      "code" => code(context.user, context.params),
      "client_id" => context.client.id,
      "redirect_uri" => context.params["redirect_uri"],
      "resource" => Oauth.resource(),
      "code_verifier" => context.verifier
    }
  end

  defp tokens(context) do
    {:ok, tokens} = Oauth.exchange(exchange_params(context))
    tokens
  end

  defp refresh_params(context, tokens) do
    %{
      "grant_type" => "refresh_token",
      "refresh_token" => tokens.refresh_token,
      "client_id" => context.client.id,
      "resource" => Oauth.resource()
    }
  end

  defp rpc(conn, token, body, session \\ nil) do
    conn =
      conn
      |> put_req_header("authorization", "Bearer " <> token)
      |> put_req_header("content-type", "application/json")
      |> put_req_header("accept", "application/json, text/event-stream")

    conn = if session, do: put_req_header(conn, "mcp-session-id", session), else: conn
    post(conn, "/mcp", body)
  end

  defp initialize(conn, token) do
    rpc(conn, token, %{
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: %{protocolVersion: "2025-03-26", capabilities: %{}, clientInfo: %{name: "test", version: "1"}}
    })
  end

  test "advertises discovery endpoints and only supported grants", %{conn: conn} do
    metadata = conn |> get("/.well-known/oauth-authorization-server") |> json_response(200)
    assert metadata["issuer"] == Oauth.issuer()
    assert metadata["code_challenge_methods_supported"] == ["S256"]
    assert metadata["token_endpoint_auth_methods_supported"] == ["none"]
    assert metadata["authorization_response_iss_parameter_supported"]
    resource = conn |> get("/.well-known/oauth-protected-resource/mcp") |> json_response(200)
    assert resource["resource"] == Oauth.resource()
    assert resource["scopes_supported"] == ["read"]
  end

  test "registers public clients without secrets", %{conn: conn} do
    result =
      conn
      |> post("/oauth/register", %{client_name: "My client", redirect_uris: ["https://client.example/callback"]})
      |> json_response(201)

    assert result["token_endpoint_auth_method"] == "none"
    refute Map.has_key?(result, "client_secret")
  end

  test "rejects unsafe redirect URIs and unsupported client metadata" do
    for uri <- [
          "http://evil.example/callback",
          "https://user:password@client.example/cb",
          "https://client.example/cb#fragment",
          "javascript:alert(1)",
          "//evil.example/callback"
        ] do
      assert {:error, "invalid_redirect_uri"} = Oauth.register(%{"redirect_uris" => [uri]})
    end

    assert {:error, "invalid_client_metadata"} =
             Oauth.register(%{"redirect_uris" => ["https://client.example"], "grant_types" => ["password"]})
  end

  test "limits automatic registration independently of cookies", %{conn: conn} do
    for _ <- 1..10 do
      assert conn |> post("/oauth/register", %{redirect_uris: ["https://client.example/cb"]}) |> json_response(201)
    end

    assert %{"error" => "slow_down"} =
             conn |> post("/oauth/register", %{redirect_uris: ["https://client.example/cb"]}) |> json_response(429)
  end

  test "returns guests to authorization after sign-in", context do
    conn = get(context.conn, "/oauth/authorize", context.params)
    assert redirected_to(conn) =~ "/session/new?next="
    assert get_session(conn, :mcp_return_to) =~ "/oauth/authorize?"
    assert Repo.aggregate(Connection, :count) == 0
  end

  test "renders consent, preserves state and issues a code only after approval", context do
    conn = context.conn |> log_in_user(context.user) |> get("/oauth/authorize", context.params)
    assert inertia_component(conn) == "McpConsent"
    props = inertia_props(conn)
    assert props["client_name"] == context.client.name
    assert props["scopes"] == ["read"]
    assert Repo.aggregate(Code, :count) == 0

    approved = post(recycle(conn), "/oauth/authorize", %{request: props["request"], decision: "allow"})
    response = approved |> redirected_to() |> URI.parse() |> Map.fetch!(:query) |> URI.decode_query()
    assert response["state"] == "client-state"
    assert response["iss"] == Oauth.issuer()
    assert is_binary(response["code"])
    assert get_resp_header(approved, "cache-control") == ["no-store"]
  end

  test "denial creates no connection", context do
    conn = context.conn |> log_in_user(context.user) |> get("/oauth/authorize", context.params)
    denied = post(recycle(conn), "/oauth/authorize", %{request: inertia_props(conn)["request"], decision: "deny"})
    assert redirected_to(denied) =~ "error=access_denied"
    assert redirected_to(denied) =~ "state=client-state"
    assert Repo.aggregate(Connection, :count) == 0
  end

  test "consent cannot be tampered with or approved by a different account", context do
    conn = context.conn |> log_in_user(context.user) |> get("/oauth/authorize", context.params)
    signed = inertia_props(conn)["request"]

    assert conn
           |> recycle()
           |> post("/oauth/authorize", %{request: signed <> "x", decision: "allow"})
           |> json_response(400)

    assert context.conn
           |> log_in_user(insert(:user))
           |> post("/oauth/authorize", %{request: signed, decision: "allow"})
           |> json_response(400)

    assert Repo.aggregate(Connection, :count) == 0
  end

  test "invalid redirects, resource, scopes and PKCE never redirect the browser", context do
    for override <- [
          %{"redirect_uri" => "https://attacker.example/cb"},
          %{"resource" => "https://other.example/mcp"},
          %{"scope" => "admin"},
          %{"code_challenge_method" => "plain"},
          %{"code_challenge" => nil},
          %{"client_id" => "not-a-uuid"}
        ] do
      conn = get(context.conn, "/oauth/authorize", Map.merge(context.params, override))
      assert %{"error" => "invalid_request"} = json_response(conn, 400)
      assert get_resp_header(conn, "location") == []
    end
  end

  test "young accounts cannot grant write scopes", context do
    user = insert(:user)
    params = Map.put(context.params, "scope", "read games:write")
    assert {:error, "access_denied"} = Oauth.approve(user, params)
  end

  test "code exchange binds client, redirect, resource and verifier; tokens are hashed", context do
    params = exchange_params(context)
    {:ok, other} = Oauth.register(%{"redirect_uris" => ["https://other.example/cb"]})

    for override <- [
          %{"client_id" => other.id},
          %{"redirect_uri" => "https://other.example/cb"},
          %{"code_verifier" => String.duplicate("x", 43)}
        ] do
      assert {:error, "invalid_grant"} = Oauth.exchange(Map.merge(params, override))
    end

    assert {:error, "invalid_target"} = Oauth.exchange(Map.put(params, "resource", "https://other.example/mcp"))
    assert {:ok, tokens} = Oauth.exchange(params)
    stored = Repo.one!(Token)
    refute stored.access_hash == tokens.access_token
    assert stored.access_hash == :crypto.hash(:sha256, tokens.access_token)
    assert stored.refresh_hash == :crypto.hash(:sha256, tokens.refresh_token)
    assert Repo.one!(Code).code_hash == :crypto.hash(:sha256, params["code"])
    assert {:ok, auth} = Oauth.authenticate(tokens.access_token)
    assert auth.user.id == context.user.id
    assert {:error, :invalid_token} = Oauth.authenticate(tokens.refresh_token)
    assert {:error, "invalid_grant"} = Oauth.exchange(params)
    assert {:error, :invalid_token} = Oauth.authenticate(tokens.access_token)
  end

  test "refresh rotates credentials and replay revokes the entire connection", context do
    tokens = tokens(context)
    params = refresh_params(context, tokens)
    assert {:ok, next} = Oauth.exchange(params)
    refute next.refresh_token == tokens.refresh_token
    assert {:ok, _} = Oauth.authenticate(next.access_token)
    assert {:error, "invalid_grant"} = Oauth.exchange(params)
    assert {:error, :invalid_token} = Oauth.authenticate(next.access_token)
    assert {:error, "invalid_grant"} = Oauth.exchange(refresh_params(context, next))
  end

  test "refresh cannot expand scopes or change audience", context do
    tokens = tokens(context)
    params = refresh_params(context, tokens)
    assert {:error, "invalid_scope"} = Oauth.exchange(Map.put(params, "scope", "read games:write"))
    assert {:error, "invalid_target"} = Oauth.exchange(Map.put(params, "resource", "https://other.example/mcp"))
    assert {:ok, _} = Oauth.exchange(params)
  end

  test "expired codes and access and refresh tokens are rejected", context do
    params = exchange_params(context)
    past = DateTime.add(DateTime.utc_now(:second), -1)
    Code |> Repo.one!() |> Ecto.Changeset.change(expires_at: past) |> Repo.update!()
    assert {:error, "invalid_grant"} = Oauth.exchange(params)
    tokens = tokens(context)
    Token |> Repo.one!() |> Ecto.Changeset.change(expires_at: past, refresh_expires_at: past) |> Repo.update!()
    assert {:error, :invalid_token} = Oauth.authenticate(tokens.access_token)
    assert {:error, "invalid_grant"} = Oauth.exchange(refresh_params(context, tokens))
  end

  test "account bans block both access and refresh", context do
    tokens = tokens(context)
    context.user |> Ecto.Changeset.change(subscription_type: :banned) |> Repo.update!()
    assert {:error, :invalid_token} = Oauth.authenticate(tokens.access_token)
    assert {:error, "invalid_grant"} = Oauth.exchange(refresh_params(context, tokens))
  end

  test "disconnect is owner-scoped and immediately revokes access and refresh", context do
    tokens = tokens(context)
    [connection] = Oauth.connections(context.user.id)
    other = insert(:user)

    assert context.conn
           |> log_in_user(other)
           |> delete("/api/v1/settings/connections/#{connection.id}")
           |> json_response(404)

    assert context.conn
           |> log_in_user(context.user)
           |> delete("/api/v1/settings/connections/#{connection.id}")
           |> json_response(200)

    assert {:error, :invalid_token} = Oauth.authenticate(tokens.access_token)
    assert {:error, "invalid_grant"} = Oauth.exchange(refresh_params(context, tokens))
  end

  test "revocation endpoint revokes only the identified client's tokens", context do
    tokens = tokens(context)
    {:ok, other} = Oauth.register(%{"redirect_uris" => ["https://other.example/cb"]})

    assert context.conn |> post("/oauth/revoke", %{client_id: other.id, token: tokens.refresh_token}) |> response(200) ==
             ""

    assert {:ok, _} = Oauth.authenticate(tokens.access_token)

    assert context.conn
           |> post("/oauth/revoke", %{client_id: context.client.id, token: tokens.refresh_token})
           |> response(200) == ""

    assert {:error, :invalid_token} = Oauth.authenticate(tokens.access_token)
    assert context.conn |> post("/oauth/revoke", %{client_id: context.client.id, token: "unknown"}) |> response(200) == ""
  end

  test "form token exchange has no browser-session dependency and is not cached", context do
    params = exchange_params(context)
    conn = post(context.conn, "/oauth/token", params)
    assert %{"access_token" => _, "refresh_token" => _, "expires_in" => 900} = json_response(conn, 200)
    assert get_resp_header(conn, "cache-control") == ["no-store"]
  end

  test "MCP rejects browser cookies and API tokens and advertises discovery", context do
    conn = context.conn |> log_in_user(context.user) |> post("/mcp", %{jsonrpc: "2.0", id: 1, method: "initialize"})
    assert json_response(conn, 401)
    assert hd(get_resp_header(conn, "www-authenticate")) =~ "resource_metadata="
    {:ok, _, personal} = Codebattle.UserApiToken.create(context.user, %{name: "test"})
    assert context.conn |> initialize(personal) |> json_response(401)
  end

  test "MCP authenticates each request and binds sessions to connections", context do
    tokens = tokens(context)
    initialized = initialize(context.conn, tokens.access_token)
    assert %{"result" => %{"serverInfo" => %{"name" => "Codebattle"}}} = json_response(initialized, 200)
    [session] = get_resp_header(initialized, "mcp-session-id")

    assert context.conn
           |> rpc(tokens.access_token, %{jsonrpc: "2.0", method: "notifications/initialized"}, session)
           |> response(202)

    result =
      rpc(
        context.conn,
        tokens.access_token,
        %{jsonrpc: "2.0", id: 2, method: "tools/call", params: %{name: "get_me", arguments: %{}}},
        session
      )

    assert %{"result" => %{"content" => [%{"text" => text}]}} = json_response(result, 200)
    assert Jason.decode!(text)["user"]["id"] == context.user.id

    other_tokens = tokens(%{context | user: insert(:user)})

    assert context.conn
           |> rpc(other_tokens.access_token, %{jsonrpc: "2.0", id: 3, method: "tools/list"}, session)
           |> response(404) == ""

    assert Oauth.revoke_all(context.user.id) == :ok

    assert context.conn
           |> rpc(tokens.access_token, %{jsonrpc: "2.0", id: 4, method: "tools/list"}, session)
           |> json_response(401)
  end

  test "untrusted browser origins cannot call MCP", context do
    tokens = tokens(context)

    assert context.conn
           |> put_req_header("origin", "https://attacker.example")
           |> initialize(tokens.access_token)
           |> response(403) == ""
  end

  test "a forged consent POST cannot bypass CSRF protection", context do
    conn = context.conn |> log_in_user(context.user) |> get("/oauth/authorize", context.params)
    params = %{request: inertia_props(conn)["request"], decision: "allow"}
    conn = conn |> recycle() |> put_private(:plug_skip_csrf_protection, false)
    assert_error_sent 403, fn -> post(conn, "/oauth/authorize", params) end
    assert Repo.aggregate(Connection, :count) == 0
  end

  test "password reset revokes OAuth connections", context do
    tokens = tokens(context)
    User.create_password_hash(context.user, "a new password")
    assert {:error, :invalid_token} = Oauth.authenticate(tokens.access_token)
    assert {:error, "invalid_grant"} = Oauth.exchange(refresh_params(context, tokens))
  end

  test "archived accounts cannot refresh or authenticate", context do
    tokens = tokens(context)
    context.user |> Ecto.Changeset.change(archived_at: DateTime.utc_now(:second)) |> Repo.update!()
    assert {:error, :invalid_token} = Oauth.authenticate(tokens.access_token)
    assert {:error, "invalid_grant"} = Oauth.exchange(refresh_params(context, tokens))
  end

  test "signing out of the website does not disconnect an application", context do
    tokens = tokens(context)
    context.conn |> log_in_user(context.user) |> delete("/session")
    assert {:ok, _} = Oauth.authenticate(tokens.access_token)
  end

  test "MCP scopes are checked even when a token and session are valid", context do
    tokens = tokens(%{context | params: Map.put(context.params, "scope", "games:write")})
    initialized = initialize(context.conn, tokens.access_token)
    assert json_response(initialized, 200)
    [session] = get_resp_header(initialized, "mcp-session-id")

    assert %{"error" => "insufficient_scope"} =
             context.conn
             |> rpc(
               tokens.access_token,
               %{jsonrpc: "2.0", id: 2, method: "tools/call", params: %{name: "get_me", arguments: %{}}},
               session
             )
             |> json_response(403)
  end

  test "expired consent and forged transport sessions are rejected", context do
    signed =
      Phoenix.Token.sign(CodebattleWeb.Endpoint, "mcp-oauth-consent", %{user_id: context.user.id, params: context.params},
        signed_at: System.system_time(:second) - 601
      )

    assert context.conn
           |> log_in_user(context.user)
           |> post("/oauth/authorize", %{request: signed, decision: "allow"})
           |> json_response(400)

    tokens = tokens(context)

    assert context.conn
           |> rpc(tokens.access_token, %{jsonrpc: "2.0", id: 1, method: "tools/list"}, "forged-session")
           |> response(404) == ""
  end

  test "the read-only MCP server keeps working when API writes are disabled", context do
    tokens = tokens(context)
    FunWithFlags.enable(:public_api_writes_disabled)
    on_exit(fn -> FunWithFlags.disable(:public_api_writes_disabled) end)
    assert context.conn |> initialize(tokens.access_token) |> json_response(200)
    FunWithFlags.enable(:public_api_disabled)
    on_exit(fn -> FunWithFlags.disable(:public_api_disabled) end)
    assert context.conn |> initialize(tokens.access_token) |> json_response(503)
  end

  test "expired connections disappear from settings and purge cascades to credentials", context do
    tokens = tokens(context)
    [connection] = Oauth.connections(context.user.id)
    props = context.conn |> log_in_user(context.user) |> get("/settings") |> inertia_props()
    assert length(props["oauth_connections"]) == 1
    past = DateTime.add(DateTime.utc_now(:second), -1)
    Token |> Repo.one!() |> Ecto.Changeset.change(refresh_expires_at: past) |> Repo.update!()
    assert Oauth.connections(context.user.id) == []
    old = DateTime.add(DateTime.utc_now(:second), -32 * 86_400)
    connection |> Ecto.Changeset.change(inserted_at: old) |> Repo.update!()
    assert {1, _} = Oauth.purge_expired()
    assert Repo.aggregate(Token, :count) == 0
    assert Repo.aggregate(Code, :count) == 0
    assert {:error, :invalid_token} = Oauth.authenticate(tokens.access_token)
  end
end
