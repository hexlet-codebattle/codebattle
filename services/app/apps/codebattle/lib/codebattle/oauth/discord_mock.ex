defmodule Codebattle.Oauth.DiscordMock do
  @moduledoc """
    This is a set up to mock (stub) our API requests to the discord API
    so that we can test all of our code in Codebattle.
    These are just functions that pattern match on the entries
    and return things in the way we expect,
    so that we can check the pipeline in discord_auth
  """

  @doc """
  `get/3` stubs the HTTPoison get! function when parameters match test vars.
  """
  @valid_body %{
    "accent_color" => nil,
    "avatar" => "12345",
    "avatar_decoration" => nil,
    "banner" => nil,
    "banner_color" => nil,
    "discriminator" => "0123",
    "display_name" => nil,
    "email" => "lol@kek.com",
    "flags" => 0,
    "id" => "1234567",
    "locale" => "ab",
    "premium_type" => 0,
    "public_flags" => 0,
    "username" => "test_name",
    "verified" => true
  }

  @body_email_nil %{
    "accent_color" => nil,
    "avatar" => "123456",
    "avatar_decoration" => nil,
    "banner" => nil,
    "banner_color" => nil,
    "discriminator" => "0023",
    "display_name" => nil,
    "email" => nil,
    "flags" => 0,
    "id" => "12345678",
    "locale" => "ab",
    "premium_type" => 0,
    "public_flags" => 0,
    "username" => "empty_name",
    "verified" => true
  }

  def get!(url, headers \\ [], options \\ [])

  def get!(
        "https://discord.com/api/users/@me",
        [
          {"User-Agent", "Codebattle"},
          {"Authorization", "Bearer 123"}
        ],
        _options
      ) do
    %{body: "{\"error\": \"test error\"}"}
  end

  def get!(
        "https://discord.com/api/users/@me",
        [
          {"User-Agent", "Codebattle"},
          {"Authorization", "Bearer 42"}
        ],
        _options
      ) do
    %{body: Jason.encode!(@body_email_nil)}
  end

  def get!("https://discord.com/api/users/@me", _headers, _options) do
    %{body: Jason.encode!(@valid_body)}
  end

  @doc """
  `post/3` stubs the HTTPoison post! function when parameters match test vars.
  """
  def post!(url, body, headers \\ [], options \\ [])

  def post!(
        "https://discord.com/login/oauth/access_token?client_id=TEST_ID&client_secret=TEST_SECRET&code=1234",
        _body,
        _headers,
        _options
      ) do
    %{body: Jason.encode!(%{error: "error"})}
  end

  def post!(_url, _body, _headers, _options) do
    %{body: Jason.encode!(%{access_token: "asfd"})}
  end
end
