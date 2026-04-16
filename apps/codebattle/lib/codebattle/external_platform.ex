defmodule Codebattle.ExternalPlatform do
  @moduledoc false

  require Logger

  @http_timeout_ms 7_000
  @invite_timeout_ms 35_000
  @lookup_path "/v1/users/id"
  @invite_path "/orgs"

  def get_user_by_login(login) when is_binary(login) do
    login = String.trim(login)

    if login == "" do
      nil
    else
      do_get_user_by_login(login)
    end
  end

  def get_user_by_login(_), do: nil

  def get_user_id_by_login(login) when is_binary(login) do
    case get_user_by_login(login) do
      %{id: id} -> id
      _ -> nil
    end
  end

  def get_user_id_by_login(_), do: nil

  @doc """
  Polls the external platform to check whether the user has accepted an invitation.
  Returns `{:ok, user_data}` if the invite was accepted, `{:error, :not_accepted}` otherwise.
  """
  @spec check_invite(String.t()) :: {:ok, map()} | {:error, :not_accepted}
  def check_invite(login) when is_binary(login) do
    case get_user_by_login(login) do
      %{id: _} = user_data -> {:ok, user_data}
      _ -> {:error, :not_accepted}
    end
  end

  def check_invite(_), do: {:error, :not_accepted}

  def create_invite(alias_name, opts \\ [])

  def create_invite(alias_name, opts) when is_binary(alias_name) do
    alias_name = String.trim(alias_name)

    if alias_name == "" do
      {:error, :empty_alias}
    else
      org_slug = Keyword.get(opts, :org_slug, default_org_slug())
      ttl_in_days = Keyword.get(opts, :ttl_in_days)
      do_create_invite(org_slug, alias_name, ttl_in_days)
    end
  end

  def create_invite(_, _), do: {:error, :invalid_alias}

  defp do_create_invite(org_slug, alias_name, ttl_in_days) do
    body = %{invitees: [%{alias: alias_name}]}
    body = if ttl_in_days, do: Map.put(body, :ttl_in_days, ttl_in_days), else: body

    url = "#{external_platform_service_url()}#{@invite_path}/#{org_slug}/invites"

    opts =
      Keyword.merge(
        request_opts(),
        json: body,
        connect_options: [timeout: @invite_timeout_ms],
        receive_timeout: @invite_timeout_ms
      )

    Logger.info(
      "ExternalPlatform.create_invite START method=POST url=#{url} org=#{org_slug} alias=#{alias_name} body=#{inspect(body)}"
    )

    started_at = System.monotonic_time(:millisecond)
    result = Req.post(url, opts)
    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, %{status: status, body: resp_body}} when status in [200, 202] ->
        Logger.info(
          "ExternalPlatform.create_invite OK url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(resp_body)}"
        )

        {:ok, resp_body}

      {:ok, %{status: status, body: resp_body}} ->
        Logger.warning(
          "ExternalPlatform.create_invite FAIL url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(resp_body)}"
        )

        {:error, resp_body}

      {:error, reason} ->
        Logger.warning(
          "ExternalPlatform.create_invite ERROR url=#{url} duration_ms=#{duration_ms} reason=#{inspect(reason)}"
        )

        {:error, reason}
    end
  end

  @operations_path "/operations/create-invites/id"

  @doc """
  Polls invite operation status by operation_id.
  GET /operations/create-invites/id:{operation_id}
  Returns `{:ok, body}` with the full operation response, or `{:error, reason}`.
  """
  @spec poll_invite_status(String.t()) :: {:ok, map()} | {:error, term()}
  def poll_invite_status(operation_id) when is_binary(operation_id) and operation_id != "" do
    url = "#{external_platform_service_url()}#{@operations_path}:#{operation_id}"

    opts =
      Keyword.merge(
        request_opts(),
        connect_options: [timeout: @invite_timeout_ms],
        receive_timeout: @invite_timeout_ms
      )

    Logger.info("ExternalPlatform.poll_invite_status START method=GET url=#{url} operation_id=#{operation_id}")

    started_at = System.monotonic_time(:millisecond)
    result = Req.get(url, opts)
    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, %{status: 200, body: body}} ->
        Logger.info("ExternalPlatform.poll_invite_status OK url=#{url} duration_ms=#{duration_ms} body=#{inspect(body)}")

        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        Logger.warning(
          "ExternalPlatform.poll_invite_status FAIL url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(body)}"
        )

        {:error, body}

      {:error, reason} ->
        Logger.warning(
          "ExternalPlatform.poll_invite_status ERROR url=#{url} duration_ms=#{duration_ms} reason=#{inspect(reason)}"
        )

        {:error, reason}
    end
  end

  def poll_invite_status(_), do: {:error, :invalid_operation_id}

  @doc """
  Fetches an organization invite by its ID.
  Hits the local sc proxy: GET /v1/invites/{invite_id}
  The org is configured server-side (single-org deployment).
  Returns the invite payload (including `status` field: "creating" | "pending" | "accepted" | "rejected").
  """
  @spec get_invite(String.t()) :: {:ok, map()} | {:error, term()}
  def get_invite(invite_id) when is_binary(invite_id) and invite_id != "" do
    url = "#{external_platform_service_url()}/v1/invites/#{invite_id}"

    opts =
      Keyword.merge(
        request_opts(),
        connect_options: [timeout: @http_timeout_ms],
        receive_timeout: @http_timeout_ms
      )

    Logger.info("ExternalPlatform.get_invite START method=GET url=#{url} invite_id=#{invite_id}")

    started_at = System.monotonic_time(:millisecond)
    result = Req.get(url, opts)
    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, %{status: 200, body: body}} ->
        Logger.info("ExternalPlatform.get_invite OK url=#{url} duration_ms=#{duration_ms} body=#{inspect(body)}")
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        Logger.warning(
          "ExternalPlatform.get_invite FAIL url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(body)}"
        )

        {:error, body}

      {:error, reason} ->
        Logger.warning(
          "ExternalPlatform.get_invite ERROR url=#{url} duration_ms=#{duration_ms} reason=#{inspect(reason)}"
        )

        {:error, reason}
    end
  end

  def get_invite(_), do: {:error, :invalid_invite_id}

  @doc """
  Forks a repository into the target organization.
  POST /repos/{org_slug}/{repo_slug}/fork
  """
  @spec fork_repo(String.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def fork_repo(repo_slug, target_org_slug, opts \\ []) do
    source_org_slug = Keyword.get(opts, :source_org_slug, default_org_slug())

    body = %{org_slug: target_org_slug}
    body = if opts[:slug], do: Map.put(body, :slug, opts[:slug]), else: body

    body =
      if Keyword.has_key?(opts, :default_branch_only),
        do: Map.put(body, :default_branch_only, opts[:default_branch_only]),
        else: body

    url = "#{external_platform_service_url()}/repos/#{source_org_slug}/#{repo_slug}/fork"

    req_opts =
      Keyword.merge(
        request_opts(),
        json: body,
        connect_options: [timeout: @invite_timeout_ms],
        receive_timeout: @invite_timeout_ms
      )

    Logger.info("ExternalPlatform.fork_repo START method=POST url=#{url} body=#{inspect(body)}")

    started_at = System.monotonic_time(:millisecond)
    result = Req.post(url, req_opts)
    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, %{status: status, body: resp_body}} when status in [200, 201] ->
        Logger.info(
          "ExternalPlatform.fork_repo OK url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(resp_body)}"
        )

        {:ok, resp_body}

      {:ok, %{status: status, body: resp_body}} ->
        Logger.warning(
          "ExternalPlatform.fork_repo FAIL url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(resp_body)}"
        )

        {:error, resp_body}

      {:error, reason} ->
        Logger.warning("ExternalPlatform.fork_repo ERROR url=#{url} duration_ms=#{duration_ms} reason=#{inspect(reason)}")

        {:error, reason}
    end
  end

  @doc """
  Adds a role for a user on a repository.
  POST /repos/{org_slug}/{repo_slug}/roles
  """
  @spec add_repo_role(String.t(), String.t(), String.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def add_repo_role(org_slug, repo_slug, user_id, role, _opts \\ []) do
    body = %{
      subject_roles: [
        %{
          role: role,
          subject: %{type: "user", id: user_id}
        }
      ]
    }

    url = "#{external_platform_service_url()}/repos/#{org_slug}/#{repo_slug}/roles"

    req_opts =
      Keyword.merge(
        request_opts(),
        json: body,
        connect_options: [timeout: @http_timeout_ms],
        receive_timeout: @http_timeout_ms
      )

    Logger.info("ExternalPlatform.add_repo_role START method=POST url=#{url} body=#{inspect(body)}")

    started_at = System.monotonic_time(:millisecond)
    result = Req.post(url, req_opts)
    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, %{status: 200, body: resp_body}} ->
        Logger.info("ExternalPlatform.add_repo_role OK url=#{url} duration_ms=#{duration_ms} body=#{inspect(resp_body)}")

        {:ok, resp_body}

      {:ok, %{status: status, body: resp_body}} ->
        Logger.warning(
          "ExternalPlatform.add_repo_role FAIL url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(resp_body)}"
        )

        {:error, resp_body}

      {:error, reason} ->
        Logger.warning(
          "ExternalPlatform.add_repo_role ERROR url=#{url} duration_ms=#{duration_ms} reason=#{inspect(reason)}"
        )

        {:error, reason}
    end
  end

  defp do_get_user_by_login(login) do
    url = external_platform_service_url() <> @lookup_path

    opts =
      Keyword.put(
        request_opts(),
        :params,
        login: login
      )

    Logger.info("ExternalPlatform.get_user_by_login START method=GET url=#{url} login=#{login}")

    started_at = System.monotonic_time(:millisecond)
    result = Req.get(url, opts)
    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, %{status: 200, body: %{"id" => id} = body}} when is_binary(id) and id != "" ->
        Logger.info(
          "ExternalPlatform.get_user_by_login OK url=#{url} duration_ms=#{duration_ms} id=#{id} body=#{inspect(body)}"
        )

        %{
          id: id,
          login: normalize_login(Map.get(body, "login"))
        }

      {:ok, %{status: 200, body: body}} ->
        Logger.warning(
          "ExternalPlatform.get_user_by_login INVALID url=#{url} duration_ms=#{duration_ms} body=#{inspect(body)}"
        )

        nil

      {:ok, %{status: status}} when status in [400, 404] ->
        Logger.info("ExternalPlatform.get_user_by_login NOT_FOUND url=#{url} status=#{status} duration_ms=#{duration_ms}")
        nil

      {:ok, %{status: status, body: body}} ->
        Logger.warning(
          "ExternalPlatform.get_user_by_login FAIL url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(body)}"
        )

        nil

      {:error, reason} ->
        Logger.warning(
          "ExternalPlatform.get_user_by_login ERROR url=#{url} duration_ms=#{duration_ms} reason=#{inspect(reason)}"
        )

        nil
    end
  end

  defp external_platform_service_url do
    Application.get_env(:codebattle, :external_platform_service_url)
  end

  defp default_org_slug do
    Application.get_env(:codebattle, :external_platform_org_slug)
  end

  defp request_opts do
    Keyword.merge(
      Application.get_env(:codebattle, :auth_req_options, []),
      connect_options: [timeout: @http_timeout_ms],
      receive_timeout: @http_timeout_ms
    )
  end

  defp normalize_login(login) when is_binary(login) and login != "", do: login
  defp normalize_login(_), do: nil
end
