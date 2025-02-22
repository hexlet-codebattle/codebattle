defmodule Codebattle.Auth.GithubMock do
  @moduledoc """
    This is a set up to mock (stub) our API requests to the GitHub API
    so that we can test all of our code in Codebattle.
    These are just functions that pattern match on the entries
    and return things in the way we expect,
    so that we can check the pipeline in github_auth
  """

  @doc """
  `get/3` stubs the Req get! function when parameters match test vars.
  """
  @valid_body %{
    "access_token" => "12345",
    "login" => "test_user",
    "name" => "Testy McTestface",
    "email" => "test@gmail.com",
    "avatar_url" => "https://avatars3.githubusercontent.com/u/10835816",
    "id" => "19"
  }

  @body_email_nil %{
    "access_token" => "12345",
    "login" => "test_user",
    "name" => "Testy McTestface",
    "email" => nil,
    "avatar_url" => "https://avatars3.githubusercontent.com/u/10835816",
    "id" => "28"
  }

  @emails [
    %{
      "email" => "octocat@github.com",
      "verified" => true,
      "primary" => false,
      "visibility" => "private"
    },
    %{
      "email" => "private_email@gmail.com",
      "verified" => true,
      "primary" => true,
      "visibility" => "private"
    }
  ]

  def get!(url, headers \\ [], options \\ [])

  def get!("https://api.github.com/user", [{"User-Agent", "Codebattle"}, {"Authorization", "token 123"}], _options) do
    %{body: ~s({"error": "test error"})}
  end

  def get!("https://api.github.com/user", [{"User-Agent", "Codebattle"}, {"Authorization", "token 42"}], _options) do
    %{body: @body_email_nil}
  end

  # user emails
  def get!("https://api.github.com/user/emails", [{"User-Agent", "Codebattle"}, {"Authorization", "token 42"}], _options) do
    %{body: @emails}
  end

  def get!(_url, _headers, _options) do
    %{body: @valid_body}
  end

  @doc """
  `post/3` stubs the Req post! function when parameters match test vars.
  """
  def post!(url, body, headers \\ [], options \\ [])

  def post!(_url, _body, _headers, _options) do
    %{body: URI.encode_query(@valid_body)}
  end
end
