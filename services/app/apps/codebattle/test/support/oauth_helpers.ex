defmodule Codebattle.OauthTestHelpers do
  @moduledoc false
  @valid_github_body %{
    "access_token" => "12345",
    "login" => "test_user",
    "name" => "Testy McTestface",
    "email" => "test@gmail.com",
    "avatar_url" => "https://avatars3.githubusercontent.com/u/10835816",
    "id" => "19"
  }

  @valid_discord_body %{
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

  def stub_github_oauth_requests do
    Req.Test.stub(Codebattle.Auth, fn req ->
      case req do
        %{request_path: "/login/oauth/access_token", method: "POST", host: "github.com"} ->
          Req.Test.text(req, URI.encode_query(@valid_github_body))

        %{request_path: "/user", method: "GET", host: "api.github.com"} ->
          Req.Test.json(req, @valid_github_body)
      end
    end)
  end

  def stub_discord_oauth_requests do
    Req.Test.stub(Codebattle.Auth, fn req ->
      case req do
        %{request_path: "/api/v10/oauth2/token", method: "POST", host: "discord.com"} ->
          Req.Test.json(req, %{"access_token" => "asfd"})

        %{request_path: "/api/users/@me", method: "GET", host: "discord.com"} ->
          Req.Test.json(req, @valid_discord_body)
      end
    end)
  end
end
