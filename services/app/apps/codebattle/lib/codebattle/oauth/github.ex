defmodule Codebattle.Oauth.Github do
  @moduledoc """
  Module that handles GitHub OAuth
  Origin from here: https://github.com/dwyl/elixir-auth-github
  """

  @github_url "https://github.com/login/oauth/"
  @github_auth_url @github_url <> "access_token?"

  @http_client (Application.compile_env(:codebattle, :oauth)[:mock_clinet] &&
                  Codebattle.Oauth.GithubMock) || HTTPoison

  @doc """
  `http_client/0` injects a TestDouble of HTTPoison in Test
  """
  def http_client, do: @http_client

  @doc """
  `client_id/0` returns a `String` of the `GITHUB_CLIENT_ID`
  """
  def client_id do
    Application.get_env(:codebattle, :oauth)[:github_client_id]
  end

  @doc """
  `client_secret/0` returns a `String` of the `GITHUB_CLIENT_SECRET`
  """
  def client_secret do
    Application.get_env(:codebattle, :oauth)[:github_client_secret]
  end

  @doc """
  `login_url/1` returns a `String` URL to be used as the initial OAuth redirect.
  """
  def login_url(%{redirect_uri: redirect_uri}) do
    query =
      URI.encode_query(%{
        client_id: client_id(),
        redirect_uri: redirect_uri,
        scope: "user:email"
      })

    @github_url <> "authorize?" <> query
  end

  @doc """
  When called with a valid OAuth callback code, `github_auth/1` makes a number of
  authentication requests to GitHub and returns a tuple with `:ok` and a map with
  GitHub user details and an access_token.

  Bad authentication codes will return a tuple with `:error` and an error map.
  """
  def github_auth(code) do
    query =
      URI.encode_query(%{
        "client_id" => client_id(),
        "client_secret" => client_secret(),
        "code" => code
      })

    http_client().post!(@github_auth_url <> query, "")
    |> Map.get(:body)
    |> URI.decode_query()
    |> check_authenticated
  end

  defp check_authenticated(%{"access_token" => access_token}) do
    access_token
    |> get_user_details
  end

  defp check_authenticated(error), do: {:error, error}

  defp get_user_details(access_token) do
    http_client().get!("https://api.github.com/user", [
      #  https://developer.github.com/v3/#user-agent-required
      {"User-Agent", "Codebattle"},
      {"Authorization", "token #{access_token}"}
    ])
    |> Map.get(:body)
    |> Jason.decode!()
    |> set_user_details(access_token)
  end

  defp get_primary_email(access_token) do
    http_client().get!("https://api.github.com/user/emails", [
      #  https://developer.github.com/v3/#user-agent-required
      {"User-Agent", "Codebattle"},
      {"Authorization", "token #{access_token}"}
    ])
    |> Map.get(:body)
    |> Jason.decode!()
    |> Enum.find_value(&if &1["primary"], do: &1["email"])
  end

  defp set_user_email(user, nil, access_token) do
    email = get_primary_email(access_token)
    Map.put(user, "email", email)
  end

  defp set_user_email(user, email, _access_token), do: Map.put(user, "email", email)

  defp set_user_details(user = %{"login" => _name, "email" => email}, access_token) do
    user =
      user
      |> Map.put("access_token", access_token)
      |> set_user_email(email, access_token)

    # transform map with keys as strings into keys as atoms!
    # https://stackoverflow.com/questions/31990134
    atom_key_map = for {key, val} <- user, into: %{}, do: {String.to_atom(key), val}
    {:ok, atom_key_map}
  end

  defp set_user_details(error, _token), do: {:error, error}
end
