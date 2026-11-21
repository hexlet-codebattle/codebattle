defmodule Codebattle.ExternalPlatform do
  @moduledoc false

  require Logger

  @http_timeout_ms 7_000
  @invite_timeout_ms 35_000
  @users_path "/v1/users"
  @invite_path "/orgs"

  defp adapter do
    Application.get_env(:codebattle, :external_platform_adapter)
  end

  @doc """
  Fetches the platform user profile by ID and returns `%{id, login}` (login is the platform `username`).
  Used after an invite is accepted to mirror the platform identity onto our User record.
  """
  @spec get_user_by_id(String.t()) :: %{id: String.t(), login: String.t() | nil} | nil
  def get_user_by_id(user_id) when is_binary(user_id) do
    user_id = String.trim(user_id)

    if user_id == "" do
      nil
    else
      case adapter() do
        nil -> do_get_user_by_id(user_id)
        mod -> mod.get_user_by_id(user_id)
      end
    end
  end

  def get_user_by_id(_), do: nil

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

  defp do_get_user_by_id(user_id) do
    url = external_platform_service_url() <> @users_path <> "/#{user_id}"

    Logger.info("ExternalPlatform.get_user_by_id START method=GET url=#{url} user_id=#{user_id}")

    started_at = System.monotonic_time(:millisecond)
    result = safe_request(:get, url, request_opts())
    duration_ms = System.monotonic_time(:millisecond) - started_at

    case result do
      {:ok, %{status: 200, body: %{"id" => id} = body}} when is_binary(id) and id != "" ->
        Logger.info(
          "ExternalPlatform.get_user_by_id OK url=#{url} duration_ms=#{duration_ms} id=#{id} body=#{inspect(body)}"
        )

        %{id: id, login: normalize_login(Map.get(body, "username") || Map.get(body, "login"))}

      {:ok, %{status: status}} when status in [400, 404] ->
        Logger.info("ExternalPlatform.get_user_by_id NOT_FOUND url=#{url} status=#{status} duration_ms=#{duration_ms}")
        nil

      {:ok, %{status: status, body: body}} ->
        Logger.warning(
          "ExternalPlatform.get_user_by_id FAIL url=#{url} status=#{status} duration_ms=#{duration_ms} body=#{inspect(body)}"
        )

        nil

      {:error, reason} ->
        Logger.warning(
          "ExternalPlatform.get_user_by_id ERROR url=#{url} duration_ms=#{duration_ms} reason=#{inspect(reason)}"
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

  defp normalize_login(login) when is_binary(login) and login != "", do: login
  defp normalize_login(_), do: nil
end
