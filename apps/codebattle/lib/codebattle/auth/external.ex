defmodule Codebattle.Auth.External do
  @moduledoc """
  Module that handles External OAuth
  """

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
        code: code,
        client_id: client_id(),
        client_secret: client_secret(),
        redirect_uri: redirect_uri
      })

    headers = [{"Content-Type", "application/x-www-form-urlencoded"}]

    opts =
      Keyword.merge(
        Application.get_env(:codebattle, :auth_req_options, []),
        body: body,
        headers: headers
      )

    external_auth_url()
    |> Req.post!(opts)
    |> Map.get(:body)
    |> check_authenticated()
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
        Application.get_env(:codebattle, :auth_req_options, []),
        :headers,
        authorization: "OAuth #{access_token}"
      )

    :codebattle
    |> Application.get_env(:oauth)
    |> Keyword.get(:external_user_info_url)
    |> Req.get!(opts)
    |> Map.get(:body)
    |> Map.take(["default_avatar_id", "id", "is_avatar_empty"])
    |> Runner.AtomizedMap.atomize()
  end
end
