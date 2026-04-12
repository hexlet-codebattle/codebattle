defmodule Codebattle.ExternalPlatform do
  @moduledoc false

  require Logger

  @http_timeout_ms 7_000
  @invite_timeout_ms 35_000
  @lookup_path "/v1/users/id"
  @invite_path "/v1/invites"

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

  def create_invite(alias_name) when is_binary(alias_name) do
    alias_name = String.trim(alias_name)

    if alias_name == "" do
      {:error, :empty_alias}
    else
      do_create_invite(alias_name)
    end
  end

  def create_invite(_), do: {:error, :invalid_alias}

  defp do_create_invite(alias_name) do
    opts =
      Keyword.merge(
        request_opts(),
        json: %{alias: alias_name},
        connect_options: [timeout: @invite_timeout_ms],
        receive_timeout: @invite_timeout_ms
      )

    case Req.post(external_platform_service_url() <> @invite_path, opts) do
      {:ok, %{status: 200, body: body}} ->
        Logger.info("External platform invite created alias=#{alias_name} body=#{inspect(body)}")
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        Logger.warning("External platform invite failed alias=#{alias_name} status=#{status} body=#{inspect(body)}")
        {:error, body}

      {:error, reason} ->
        Logger.warning("External platform invite request failed alias=#{alias_name} reason=#{inspect(reason)}")
        {:error, reason}
    end
  end

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
