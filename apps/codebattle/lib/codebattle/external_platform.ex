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

    case Req.post(url, opts) do
      {:ok, %{status: 200, body: resp_body}} ->
        Logger.info("External platform invite created org=#{org_slug} alias=#{alias_name} body=#{inspect(resp_body)}")
        {:ok, resp_body}

      {:ok, %{status: status, body: resp_body}} ->
        Logger.warning(
          "External platform invite failed org=#{org_slug} alias=#{alias_name} status=#{status} body=#{inspect(resp_body)}"
        )

        {:error, resp_body}

      {:error, reason} ->
        Logger.warning(
          "External platform invite request failed org=#{org_slug} alias=#{alias_name} reason=#{inspect(reason)}"
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

    case Req.get(url, opts) do
      {:ok, %{status: 200, body: body}} ->
        Logger.info("External platform invite poll operation_id=#{operation_id} body=#{inspect(body)}")
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        Logger.warning(
          "External platform invite poll failed operation_id=#{operation_id} status=#{status} body=#{inspect(body)}"
        )

        {:error, body}

      {:error, reason} ->
        Logger.warning(
          "External platform invite poll request failed operation_id=#{operation_id} reason=#{inspect(reason)}"
        )

        {:error, reason}
    end
  end

  def poll_invite_status(_), do: {:error, :invalid_operation_id}

  defp do_get_user_by_login(login) do
    opts =
      Keyword.put(
        request_opts(),
        :params,
        login: login
      )

    case Req.get(external_platform_service_url() <> @lookup_path, opts) do
      {:ok, %{status: 200, body: %{"id" => id} = body}} when is_binary(id) and id != "" ->
        %{
          id: id,
          login: normalize_login(Map.get(body, "login"))
        }

      {:ok, %{status: 200, body: body}} ->
        Logger.warning("External platform lookup returned invalid body=#{inspect(body)}")
        nil

      {:ok, %{status: status}} when status in [400, 404] ->
        nil

      {:ok, %{status: status, body: body}} ->
        Logger.warning("External platform lookup failed status=#{status} body=#{inspect(body)}")
        nil

      {:error, reason} ->
        Logger.warning("External platform lookup failed reason=#{inspect(reason)}")
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
