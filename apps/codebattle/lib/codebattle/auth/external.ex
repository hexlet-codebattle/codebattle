defmodule Codebattle.Auth.External do
  @moduledoc """
  Module that handles External OAuth
  """

  @http_timeout_ms 7_000

  def client_id do
    Application.get_env(:codebattle, :oauth)[:external_client_id]
  end

  def client_secret do
    Application.get_env(:codebattle, :oauth)[:external_client_secret]
  end

  def external_auth(code, redirect_uri) do
    body =
      URI.encode_query(%{
        grant_type: "authorization_code",
        response_type: "code",
        force_confirm: "yes",
        code: code,
        client_id: client_id(),
        client_secret: client_secret(),
        redirect_uri: redirect_uri
      })

    headers = [{"Content-Type", "application/x-www-form-urlencoded"}]

    opts =
      Keyword.merge(
        request_opts(),
        body: body,
        headers: headers
      )

    case Req.post(external_auth_url(), opts) do
      {:ok, %{status: status, body: response_body}} when status in 200..299 ->
        check_authenticated(response_body)

      {:ok, %{status: status, body: response_body}} ->
        {:error, {:external_auth_failed, status, response_body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp external_auth_url do
    Application.get_env(:codebattle, :oauth)[:external_auth_url]
  end

  defp check_authenticated(%{"access_token" => access_token}) do
    get_user_details(access_token)
  end

  defp check_authenticated(error), do: {:error, error}

  defp get_user_details(access_token) do
    opts =
      Keyword.put(
        request_opts(),
        :headers,
        authorization: "OAuth #{access_token}"
      )

    case Req.get(external_user_info_url(), opts) do
      {:ok, %{status: status, body: response_body}} when status in 200..299 ->
        response_body
        |> Map.take(["default_avatar_id", "id", "is_avatar_empty", "login"])
        |> Runner.AtomizedMap.atomize()
        |> then(&{:ok, &1})

      {:ok, %{status: status, body: response_body}} ->
        {:error, {:external_user_info_failed, status, response_body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp external_user_info_url do
    :codebattle
    |> Application.get_env(:oauth)
    |> Keyword.get(:external_user_info_url)
  end

  defp request_opts do
    Keyword.merge(
      Application.get_env(:codebattle, :auth_req_options, []),
      connect_options: [timeout: @http_timeout_ms],
      receive_timeout: @http_timeout_ms
    )
  end
end
