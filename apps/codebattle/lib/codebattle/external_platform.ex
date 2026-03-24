defmodule Codebattle.ExternalPlatform do
  @moduledoc false

  require Logger

  @http_timeout_ms 7_000
  @lookup_path "/v1/users/id"

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
