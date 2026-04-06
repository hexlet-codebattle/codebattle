defmodule CodebattleWeb.TournamentAdminChannelAuthTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Tournament.Context
  alias CodebattleWeb.TournamentAdminChannel
  alias CodebattleWeb.UserSocket

  test "authorizes tournament creator to join admin channel" do
    creator = insert(:user)

    {:ok, tournament} =
      Context.create(%{
        "starts_at" => "2026-02-24T06:00",
        "name" => "Creator Admin Access",
        "description" => "Creator Admin Access",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    creator_token = Phoenix.Token.sign(socket(UserSocket), "user_token", creator.id)
    {:ok, creator_socket} = connect(UserSocket, %{"token" => creator_token})

    assert {:ok, _response, _socket} =
             subscribe_and_join(
               creator_socket,
               TournamentAdminChannel,
               "tournament_admin:#{tournament.id}",
               %{}
             )
  end

  test "authorizes tournament moderator to join admin channel" do
    creator = insert(:user)
    moderator = insert(:user)

    {:ok, tournament} =
      Context.create(%{
        "starts_at" => "2026-02-24T06:00",
        "name" => "Moderator Admin Access",
        "description" => "Moderator Admin Access",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "moderator_ids" => [moderator.id],
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    moderator_token = Phoenix.Token.sign(socket(UserSocket), "user_token", moderator.id)
    {:ok, moderator_socket} = connect(UserSocket, %{"token" => moderator_token})

    assert {:ok, _response, _socket} =
             subscribe_and_join(
               moderator_socket,
               TournamentAdminChannel,
               "tournament_admin:#{tournament.id}",
               %{}
             )
  end
end
