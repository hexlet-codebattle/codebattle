defmodule Codebattle.ExternalPlatform do
  @moduledoc false

  require Logger

  @http_timeout_ms 7_000
  @invite_timeout_ms 35_000
  @lookup_path "/v1/users/id"
  @invite_path "/orgs"

  defp adapter do
    Application.get_env(:codebattle, :external_platform_adapter)
  end

  def get_user_by_login(login) when is_binary(login) do
    login = String.trim(login)

    if login == "" do
      nil
    else
      case adapter() do
        nil -> do_get_user_by_login(login)
        mod -> mod.get_user_by_login(login)
      end
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
  Checks whether an invite has been accepted on the external platform by fetching
  the invite by its platform ID via GET /v1/invites/{invite_id}.

  Returns `{:ok, body}` when the platform reports status "accepted",
  `{:error, :not_accepted}` otherwise.
  """
  @spec check_invite(String.t()) :: {:ok, map()} | {:error, :not_accepted}
  def check_invite(invite_id) when is_binary(invite_id) and invite_id != "" do
    case get_invite(invite_id) do
      {:ok, %{"status" => "accepted"} = body} -> {:ok, body}
      {:ok, _} -> {:error, :not_accepted}
      {:error, _} -> {:error, :not_accepted}
    end
  end

  def check_invite(_), do: {:error, :not_accepted}

  def create_invite(alias_name, opts \\ [])

  def create_invite(alias_name, opts) when is_binary(alias_name) do
    alias_name = String.trim(alias_name)

    if alias_name == "" do
      {:error, :empty_alias}
    else
      case adapter() do
        nil ->
          org_slug = Keyword.get(opts, :org_slug, default_org_slug())
          ttl_in_days = Keyword.get(opts, :ttl_in_days)
          do_create_invite(org_slug, alias_name, ttl_in_days)

        mod ->
          mod.create_invite(alias_name, opts)
      end
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
    result = safe_request(:post, url, opts)
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
    case adapter() do
      nil -> do_poll_invite_status(operation_id)
      mod -> mod.poll_invite_status(operation_id)
    end
  end

  def poll_invite_status(_), do: {:error, :invalid_operation_id}

  defp do_poll_invite_status(operation_id) do
    url = "#{external_platform_service_url()}#{@operations_path}:#{operation_id}"

    opts =
      Keyword.merge(
        request_opts(),
        connect_options: [timeout: @invite_timeout_ms],
        receive_timeout: @invite_timeout_ms
      )

    Logger.info("ExternalPlatform.poll_invite_status START method=GET url=#{url} operation_id=#{operation_id}")

    started_at = System.monotonic_time(:millisecond)
    result = safe_request(:get, url, opts)
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

  @doc """
  Fetches an organization invite by its ID.
  Hits the local sc proxy: GET /v1/invites/{invite_id}
  The org is configured server-side (single-org deployment).
  Returns the invite payload (including `status` field: "creating" | "pending" | "accepted" | "rejected").
  """
  @spec get_invite(String.t()) :: {:ok, map()} | {:error, term()}
  def get_invite(invite_id) when is_binary(invite_id) and invite_id != "" do
    case adapter() do
      nil -> do_get_invite(invite_id)
      mod -> mod.get_invite(invite_id)
    end
  end

  def get_invite(_), do: {:error, :invalid_invite_id}

  defp do_get_invite(invite_id) do
    url = "#{external_platform_service_url()}/v1/invites/#{invite_id}"

    opts =
      Keyword.merge(
        request_opts(),
        connect_options: [timeout: @http_timeout_ms],
        receive_timeout: @http_timeout_ms
      )

    Logger.info("ExternalPlatform.get_invite START method=GET url=#{url} invite_id=#{invite_id}")

    started_at = System.monotonic_time(:millisecond)
    result = safe_request(:get, url, opts)
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

  @doc """
  Creates a repository in the target organization from a template repository.
  POST /orgs/{org_slug}/repos
  """
  @spec create_repo_from_template(String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def create_repo_from_template(target_org_slug, opts \\ []) do
    case adapter() do
      nil ->
        with :ok <- validate_required_string(target_org_slug, :invalid_org_slug),
             :ok <- validate_required_string(opts[:slug], :invalid_repo_slug),
             :ok <- validate_required_string(opts[:template_id], :invalid_template_id) do
          do_create_repo_from_template(String.trim(target_org_slug), opts)
        end

      mod ->
        mod.create_repo_from_template(target_org_slug, opts)
    end
  end

  defp validate_required_string(value, error) do
    if is_binary(value) && String.trim(value) != "", do: :ok, else: {:error, error}
  end

  defp do_create_repo_from_template(target_org_slug, opts) do
    slug = String.trim(opts[:slug])
    template_id = String.trim(opts[:template_id])

    body =
      %{
        name: Keyword.get(opts, :name, slug),
        slug: slug,
        description: opts[:description],
        visibility: Keyword.get(opts, :visibility, "public"),
        templating_options: %{template_id: template_id}
      }
      |> Enum.reject(fn {_key, value} -> is_nil(value) end)
      |> Map.new()

    url = "#{external_platform_service_url()}/orgs/#{target_org_slug}/repos"

    req_opts =
      Keyword.merge(
        request_opts(),
        json: body,
        connect_options: [timeout: @invite_timeout_ms],
        receive_timeout: @invite_timeout_ms
      )

    Logger.info("ExternalPlatform.create_repo_from_template START method=POST url=#{url} body=#{inspect(body)}")

    started_at = System.monotonic_time(:millisecond)
    result = safe_request(:post, url, req_opts)
    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, %{status: status, body: resp_body}} when status in [200, 201] ->
        Logger.info(
          "ExternalPlatform.create_repo_from_template OK url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(resp_body)}"
        )

        {:ok, resp_body}

      {:ok, %{status: status, body: resp_body}} ->
        Logger.warning(
          "ExternalPlatform.create_repo_from_template FAIL url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(resp_body)}"
        )

        {:error, resp_body}

      {:error, reason} ->
        Logger.warning(
          "ExternalPlatform.create_repo_from_template ERROR url=#{url} duration_ms=#{duration_ms} reason=#{inspect(reason)}"
        )

        {:error, reason}
    end
  end

  @doc """
  Adds a role for a user on a repository.
  POST /repos/{org_slug}/{repo_slug}/roles
  """
  @spec add_repo_role(String.t(), String.t(), String.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def add_repo_role(org_slug, repo_slug, user_id, role, opts \\ []) do
    case adapter() do
      nil -> do_add_repo_role(org_slug, repo_slug, user_id, role)
      mod -> mod.add_repo_role(org_slug, repo_slug, user_id, role, opts)
    end
  end

  defp do_add_repo_role(org_slug, repo_slug, user_id, role) do
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
    result = safe_request(:post, url, req_opts)
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

  @doc """
  Creates or updates a repository secret.
  PUT /repos/{org_slug}/{repo_slug}/secrets/{key}
  """
  def upsert_secret(org_slug, repo_slug, key, value, opts \\ [])

  @spec upsert_secret(String.t(), String.t(), String.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def upsert_secret(org_slug, repo_slug, key, value, opts)
      when is_binary(org_slug) and is_binary(repo_slug) and is_binary(key) and is_binary(value) do
    case adapter() do
      nil -> do_upsert_secret(org_slug, repo_slug, key, value, opts)
      mod -> mod.upsert_secret(org_slug, repo_slug, key, value, opts)
    end
  end

  def upsert_secret(_, _, _, _, _), do: {:error, :invalid_secret_request}

  defp do_upsert_secret(org_slug, repo_slug, key, value, opts) do
    body = %{value: value}

    url = "#{external_platform_service_url()}/repos/#{org_slug}/#{repo_slug}/secrets/#{key}"
    url = maybe_put_secret_group(url, Keyword.get(opts, :secret_group))

    req_opts =
      Keyword.merge(
        request_opts(),
        json: body,
        connect_options: [timeout: @http_timeout_ms],
        receive_timeout: @http_timeout_ms
      )

    Logger.info("ExternalPlatform.upsert_secret START method=PUT url=#{url} key=#{key}")

    started_at = System.monotonic_time(:millisecond)
    result = safe_request(:put, url, req_opts)
    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, %{status: status, body: resp_body}} when status in [200, 201, 202] ->
        Logger.info(
          "ExternalPlatform.upsert_secret OK url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(resp_body)}"
        )

        {:ok, resp_body}

      {:ok, %{status: status, body: resp_body}} ->
        Logger.warning(
          "ExternalPlatform.upsert_secret FAIL url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(resp_body)}"
        )

        {:error, resp_body}

      {:error, reason} ->
        Logger.warning(
          "ExternalPlatform.upsert_secret ERROR url=#{url} duration_ms=#{duration_ms} reason=#{inspect(reason)}"
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
    result = safe_request(:get, url, opts)
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

  defp safe_request(:get, url, opts) do
    Req.get(url, opts)
  rescue
    exception ->
      {:error, {:request_exception, Exception.message(exception)}}
  end

  defp safe_request(:post, url, opts) do
    Req.post(url, opts)
  rescue
    exception ->
      {:error, {:request_exception, Exception.message(exception)}}
  end

  defp safe_request(:put, url, opts) do
    Req.put(url, opts)
  rescue
    exception ->
      {:error, {:request_exception, Exception.message(exception)}}
  end

  defp maybe_put_secret_group(url, nil), do: url
  defp maybe_put_secret_group(url, ""), do: url

  defp maybe_put_secret_group(url, secret_group) do
    separator = if String.contains?(url, "?"), do: "&", else: "?"
    url <> "#{separator}secret_group=#{URI.encode_www_form(secret_group)}"
  end

  defp normalize_login(login) when is_binary(login) and login != "", do: login
  defp normalize_login(_), do: nil
end
