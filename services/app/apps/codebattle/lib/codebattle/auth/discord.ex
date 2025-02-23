defmodule Codebattle.Auth.Discord do
  @moduledoc """
  Module that handles Discord OAuth
  Origin from here: https://discord.com/developers/docs/topics/oauth2
  """

  @discord_auth_url "https://discord.com/oauth2/authorize"
  @discord_token_url "https://discord.com/api/v10/oauth2/token"
  @discord_user_url "https://discord.com/api/users/@me"

  @doc """
  `client_id/0` returns a `String` of the `DISCORD_CLIENT_ID`
  """
  def client_id do
    Application.get_env(:codebattle, :oauth)[:discord_client_id]
  end

  @doc """
  `client_secret/0` returns a `String` of the `DISCORD_CLIENT_SECRET`
  """
  def client_secret do
    Application.get_env(:codebattle, :oauth)[:discord_client_secret]
  end

  @doc """
  `login_url/1` returns a `String` URL to be used as the initial OAuth redirect.
  """

  def login_url(%{redirect_uri: redirect_uri}) do
    query =
      URI.encode_query(%{
        client_id: client_id(),
        redirect_uri: redirect_uri,
        response_type: "code",
        scope: "identify email"
      })

    @discord_auth_url <> "?" <> query
  end

  @doc """
  When called with a valid OAuth callback code, `discord_auth/1` makes a number of
  authentication requests to GitHub and returns a tuple with `:ok` and a map with
  GitHub user details and an access_token.

  Bad authentication codes will return a tuple with `:error` and an error map.
  """
  def discord_auth(code, redirect_uri) do
    opts =
      Keyword.put(
        Application.get_env(:codebattle, :auth_req_options, []),
        :form,
        %{
          client_id: client_id(),
          client_secret: client_secret(),
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirect_uri
        }
      )

    @discord_token_url
    |> Req.post!(opts)
    |> Map.get(:body)
    |> URI.decode_query()
    |> check_authenticated()
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
        "user-agent": "Codebattle",
        authorization: "Bearer #{access_token}"
      )

    @discord_user_url
    |> Req.get!(opts)
    |> Map.get(:body)
    |> set_user_details()
  end

  defp set_user_details(profile) do
    atom_key_map = for {key, val} <- profile, into: %{}, do: {String.to_atom(key), val}

    {:ok, atom_key_map}
  end
end
