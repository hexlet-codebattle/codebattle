defmodule CodebattleWeb.TournamentChannelAuthTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Tournament
  alias CodebattleWeb.TournamentChannel
  alias CodebattleWeb.UserSocket

  test "authorizes private tournament join by socket access token when join payload is empty" do
    creator = insert(:user)
    user = insert(:user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Private Tournament",
        "description" => "Private tournament description",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "access_type" => "token",
        "access_token" => "access_token",
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)

    assert {:ok, user_socket} =
             connect(UserSocket, %{"token" => user_token, "access_token" => tournament.access_token})

    assert {:ok, _response, _socket} =
             subscribe_and_join(user_socket, TournamentChannel, "tournament:#{tournament.id}", %{})
  end
end
