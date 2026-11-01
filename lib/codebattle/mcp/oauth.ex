defmodule Codebattle.Mcp.Oauth do
  @moduledoc """
  MCP's deliberately narrow OAuth profile: public clients, authorization code with
  S256 PKCE, opaque tokens and rotating refresh tokens. No password, implicit or
  client-credentials grants. Browser sessions are used only to approve a connection.

  Every credential is stored as a SHA-256 hash. A connection lock serializes code
  redemption, refresh and revocation; replay revokes the entire token family.
  """
  import Ecto.Query

  alias Codebattle.Mcp.Oauth.Client
  alias Codebattle.Mcp.Oauth.Code
  alias Codebattle.Mcp.Oauth.Connection
  alias Codebattle.Mcp.Oauth.Token
  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserApiToken

  @access_ttl 900
  @refresh_ttl 30 * 86_400
  @code_ttl 120
  @scopes ~w(read games:write tournaments:write offline_access)

  def issuer, do: CodebattleWeb.Endpoint.url()
  def resource, do: issuer() <> "/mcp"
  def scopes, do: @scopes

  def register(params) do
    redirects = params["redirect_uris"]
    name = Map.get(params, "client_name", "MCP application")

    cond do
      not valid_redirects?(redirects) ->
        {:error, "invalid_redirect_uri"}

      not is_binary(name) or byte_size(name) not in 1..80 ->
        {:error, "invalid_client_metadata"}

      Map.get(params, "token_endpoint_auth_method", "none") != "none" ->
        {:error, "invalid_client_metadata"}

      Map.get(params, "response_types", ["code"]) != ["code"] ->
        {:error, "invalid_client_metadata"}

      not valid_grants?(Map.get(params, "grant_types", ["authorization_code", "refresh_token"])) ->
        {:error, "invalid_client_metadata"}

      true ->
        Repo.insert(%Client{name: name, redirect_uris: Enum.uniq(redirects)})
    end
  end

  # Validate before showing consent or redirecting anywhere. Untrusted redirect URIs
  # always produce a local error, never an OAuth redirect.
  def authorization(params) do
    with {:ok, client} <- fetch_client(params["client_id"]),
         true <- params["redirect_uri"] in client.redirect_uris,
         "code" <- params["response_type"],
         "S256" <- params["code_challenge_method"],
         true <- challenge?(params["code_challenge"]),
         true <- params["resource"] == resource(),
         {:ok, scopes} <- parse_scopes(Map.get(params, "scope", "read")),
         true <- valid_state?(params["state"]) do
      {:ok, %{client: client, scopes: scopes, params: Map.take(params, authorization_keys())}}
    else
      _ -> {:error, "invalid_request"}
    end
  end

  def permitted?(user, scopes) do
    active_user?(user) and
      Enum.all?(scopes, &(&1 == "offline_access" or UserApiToken.can_use_scope?(user, &1)))
  end

  def approve(user, params) do
    with {:ok, request} <- authorization(params),
         true <- permitted?(user, request.scopes) do
      Repo.transaction(fn ->
        connection =
          Repo.insert!(%Connection{
            user_id: user.id,
            client_id: request.client.id,
            scopes: request.scopes,
            resource: resource()
          })

        code = random("cbc_")

        Repo.insert!(%Code{
          connection_id: connection.id,
          code_hash: hash(code),
          redirect_uri: params["redirect_uri"],
          challenge: params["code_challenge"],
          expires_at: DateTime.add(now(), @code_ttl)
        })

        redirect_uri(request.params, %{"code" => code})
      end)
    else
      _ -> {:error, "access_denied"}
    end
  end

  def redirect_uri(params, response) do
    uri = URI.parse(params["redirect_uri"])
    query = URI.decode_query(uri.query || "")
    query = Map.drop(query, ~w(code error error_description state iss))
    query = query |> Map.merge(response) |> Map.put("iss", issuer())
    query = if params["state"], do: Map.put(query, "state", params["state"]), else: query
    URI.to_string(%{uri | query: URI.encode_query(query)})
  end

  def exchange(%{"grant_type" => "authorization_code"} = params) do
    with :ok <- token_request(params),
         true <- verifier?(params["code_verifier"]),
         %Code{} = code <- find_code(params["code"]) do
      transact(code.connection_id, fn connection ->
        code = Repo.one!(from(c in Code, where: c.id == ^code.id, lock: "FOR UPDATE"))
        redeem_code(connection, code, params)
      end)
    else
      {:error, _} = error -> error
      _ -> {:error, "invalid_grant"}
    end
  end

  def exchange(%{"grant_type" => "refresh_token"} = params) do
    with :ok <- token_request(params),
         %Token{} = token <- find_token(:refresh_hash, params["refresh_token"]) do
      transact(token.connection_id, fn connection ->
        token = Repo.one!(from(t in Token, where: t.id == ^token.id, lock: "FOR UPDATE"))
        refresh(connection, token, params)
      end)
    else
      {:error, _} = error -> error
      _ -> {:error, "invalid_grant"}
    end
  end

  def exchange(_params), do: {:error, "unsupported_grant_type"}

  def authenticate(raw) do
    with %Token{} = token <- find_token(:access_hash, raw),
         true <- future?(token.expires_at),
         %Connection{} = connection <- Repo.preload(token, connection: :user).connection,
         true <- valid_connection?(connection),
         true <- connection.resource == resource(),
         true <- permitted?(connection.user, token.scopes) do
      touch(connection)
      {:ok, %{user: connection.user, connection: connection, scopes: token.scopes}}
    else
      _ -> {:error, :invalid_token}
    end
  end

  @doc "Recheck the trusted request identity before dispatching an MCP operation."
  def connection_auth(id, user_id, scopes) when is_list(scopes) do
    with {:ok, id} <- Ecto.UUID.cast(id),
         %Connection{} = connection <- Repo.get(Connection, id),
         connection = Repo.preload(connection, :user),
         true <- connection.user_id == user_id and valid_connection?(connection),
         true <- Enum.all?(scopes, &(&1 in connection.scopes)) do
      {:ok, %{connection: connection, user: connection.user, scopes: scopes}}
    else
      _ -> {:error, :invalid_token}
    end
  end

  def connection_auth(_id, _user_id, _scopes), do: {:error, :invalid_token}

  # RFC 7009: unknown tokens receive the same response as revoked tokens.
  # Public clients must identify themselves; possession of the token is required.
  def revoke_token(params) do
    with {:ok, client} <- fetch_client(params["client_id"]),
         %Token{} = token <- find_token(:refresh_hash, params["token"]) || find_token(:access_hash, params["token"]) do
      transact(token.connection_id, fn connection ->
        revoke_for_client(connection, client.id)
        :ok
      end)
    end

    :ok
  end

  def connections(user_id) do
    active_tokens =
      from(t in Token, where: t.connection_id == parent_as(:connection).id and t.refresh_expires_at > ^now())

    active_codes =
      from(c in Code,
        where: c.connection_id == parent_as(:connection).id and is_nil(c.consumed_at) and c.expires_at > ^now()
      )

    Repo.all(
      from(c in Connection,
        as: :connection,
        where: c.user_id == ^user_id and is_nil(c.revoked_at),
        where: exists(subquery(active_tokens)) or exists(subquery(active_codes)),
        order_by: [desc: c.inserted_at],
        preload: [:client]
      )
    )
  end

  def disconnect(user_id, id) do
    with {:ok, id} <- Ecto.UUID.cast(id),
         %Connection{} = connection <- Repo.get_by(Connection, id: id, user_id: user_id) do
      transact(connection.id, fn connection ->
        revoke(connection)
        :ok
      end)
    else
      _ -> {:error, :not_found}
    end
  end

  def revoke_all(user_id) do
    Repo.update_all(from(c in Connection, where: c.user_id == ^user_id and is_nil(c.revoked_at)),
      set: [revoked_at: now(), updated_at: now()]
    )

    :ok
  end

  @doc "Drop expired token families and connections revoked more than a day ago."
  def purge_expired do
    # A code may be exchanged up to two minutes after consent. Retain consumed
    # credentials until the family's absolute expiry so replay remains detectable.
    expired_before = DateTime.add(now(), -(@refresh_ttl + @code_ttl))
    revoked_before = DateTime.add(now(), -86_400)

    Repo.delete_all(
      from(c in Connection,
        where: c.inserted_at < ^expired_before or c.revoked_at < ^revoked_before
      )
    )
  end

  defp redeem_code(connection, code, params) do
    cond do
      connection.client_id != params["client_id"] or code.redirect_uri != params["redirect_uri"] ->
        {:error, "invalid_grant"}

      not Plug.Crypto.secure_compare(code.challenge, challenge(params["code_verifier"])) ->
        {:error, "invalid_grant"}

      not is_nil(code.consumed_at) ->
        revoke(connection)
        {:error, "invalid_grant"}

      not valid_connection?(connection) or not future?(code.expires_at) ->
        {:error, "invalid_grant"}

      true ->
        code |> Ecto.Changeset.change(consumed_at: now()) |> Repo.update!()
        {:ok, issue(connection, connection.scopes, DateTime.add(now(), @refresh_ttl))}
    end
  end

  defp refresh(connection, token, params) do
    cond do
      connection.client_id != params["client_id"] ->
        {:error, "invalid_grant"}

      not is_nil(token.consumed_at) ->
        revoke(connection)
        {:error, "invalid_grant"}

      not valid_connection?(connection) or not future?(token.refresh_expires_at) ->
        {:error, "invalid_grant"}

      true ->
        with {:ok, scopes} <- refresh_scopes(params["scope"], token.scopes) do
          token |> Ecto.Changeset.change(consumed_at: now()) |> Repo.update!()
          {:ok, issue(connection, scopes, token.refresh_expires_at)}
        end
    end
  end

  defp issue(connection, scopes, refresh_expires_at) do
    access = random("cbm_")
    refresh = random("cbr_")

    Repo.insert!(%Token{
      connection_id: connection.id,
      access_hash: hash(access),
      refresh_hash: hash(refresh),
      scopes: scopes,
      expires_at: DateTime.add(now(), @access_ttl),
      refresh_expires_at: refresh_expires_at
    })

    %{
      access_token: access,
      refresh_token: refresh,
      token_type: "Bearer",
      expires_in: @access_ttl,
      scope: Enum.join(scopes, " ")
    }
  end

  # Commit security side effects (notably family revocation on replay) even when
  # the OAuth result is an error. Never Repo.rollback those revocations.
  defp transact(id, fun) do
    case Repo.transaction(fn -> with_locked_connection(id, fun) end) do
      {:ok, result} -> result
      {:error, _} -> {:error, "server_error"}
    end
  end

  defp with_locked_connection(id, fun) do
    case Repo.one(from(c in Connection, where: c.id == ^id, lock: "FOR UPDATE")) do
      nil -> {:error, "invalid_grant"}
      connection -> fun.(Repo.preload(connection, :user))
    end
  end

  defp revoke(connection) do
    connection |> Ecto.Changeset.change(revoked_at: now()) |> Repo.update!()
  end

  defp revoke_for_client(%Connection{client_id: client_id} = connection, client_id), do: revoke(connection)
  defp revoke_for_client(_connection, _client_id), do: :ok

  defp valid_connection?(connection) do
    is_nil(connection.revoked_at) and connection.resource == resource() and
      permitted?(connection.user, connection.scopes)
  end

  defp token_request(params) do
    cond do
      params["resource"] != resource() -> {:error, "invalid_target"}
      Map.has_key?(params, "client_secret") -> {:error, "invalid_client"}
      not match?({:ok, _}, fetch_client(params["client_id"])) -> {:error, "invalid_client"}
      true -> :ok
    end
  end

  defp fetch_client(id) do
    with {:ok, id} <- Ecto.UUID.cast(id), %Client{} = client <- Repo.get(Client, id) do
      {:ok, client}
    else
      _ -> {:error, "invalid_client"}
    end
  end

  defp parse_scopes(value) when is_binary(value) and byte_size(value) <= 256 do
    scopes = value |> String.split(" ", trim: true) |> Enum.uniq()
    if scopes != [] and Enum.all?(scopes, &(&1 in @scopes)), do: {:ok, scopes}, else: {:error, "invalid_scope"}
  end

  defp parse_scopes(_value), do: {:error, "invalid_scope"}

  defp refresh_scopes(nil, previous), do: {:ok, previous}

  defp refresh_scopes(value, previous) do
    with {:ok, scopes} <- parse_scopes(value), true <- Enum.all?(scopes, &(&1 in previous)) do
      {:ok, scopes}
    else
      _ -> {:error, "invalid_scope"}
    end
  end

  defp valid_redirects?(uris) when is_list(uris) and length(uris) in 1..10, do: Enum.all?(uris, &valid_redirect?/1)

  defp valid_redirects?(_uris), do: false

  defp valid_redirect?(value) when is_binary(value) and byte_size(value) in 1..2048 do
    case URI.new(value) do
      {:ok, %URI{scheme: scheme, host: host, userinfo: nil, fragment: nil}} when is_binary(host) and host != "" ->
        scheme == "https" or (scheme == "http" and host in ["localhost", "127.0.0.1", "::1"])

      _ ->
        false
    end
  end

  defp valid_redirect?(_value), do: false

  defp valid_grants?(grants) when is_list(grants),
    do: "authorization_code" in grants and Enum.all?(grants, &(&1 in ~w(authorization_code refresh_token)))

  defp valid_grants?(_grants), do: false
  defp valid_state?(nil), do: true
  defp valid_state?(state), do: is_binary(state) and byte_size(state) <= 1024
  defp challenge?(value), do: is_binary(value) and Regex.match?(~r/\A[A-Za-z0-9_-]{43}\z/, value)
  defp verifier?(value), do: is_binary(value) and Regex.match?(~r/\A[A-Za-z0-9._~-]{43,128}\z/, value)
  defp challenge(verifier), do: verifier |> hash() |> Base.url_encode64(padding: false)
  defp active_user?(%User{} = user), do: not user.is_guest and User.active?(user) and user.subscription_type != :banned
  defp active_user?(_user), do: false
  defp future?(time), do: DateTime.after?(time, now())
  defp now, do: DateTime.utc_now(:second)
  defp hash(value), do: :crypto.hash(:sha256, value)
  defp random(prefix), do: prefix <> Base.url_encode64(:crypto.strong_rand_bytes(32), padding: false)

  defp find_code(raw) when is_binary(raw) and byte_size(raw) <= 256, do: Repo.get_by(Code, code_hash: hash(raw))
  defp find_code(_raw), do: nil

  defp find_token(field, raw) when is_binary(raw) and byte_size(raw) <= 256,
    do: Repo.one(from(t in Token, where: field(t, ^field) == ^hash(raw)))

  defp find_token(_field, _raw), do: nil

  defp touch(connection) do
    if is_nil(connection.last_used_at) or DateTime.diff(now(), connection.last_used_at) >= 300 do
      Repo.update_all(from(c in Connection, where: c.id == ^connection.id), set: [last_used_at: now()])
    end
  end

  defp authorization_keys,
    do: ~w(client_id redirect_uri response_type code_challenge code_challenge_method resource scope state)
end
