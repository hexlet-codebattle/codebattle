defmodule CodebattleWeb.TournamentChannelAuthTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Repo
  alias Codebattle.Tournament
  alias Codebattle.Tournament.TournamentUserResult
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

  test "returns clan name in the finished leaderboard payload" do
    clan = insert(:clan, name: "hexlet", long_name: "Hexlet Community")
    creator = insert(:user)
    user = insert(:user, clan_id: clan.id)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Tournament with clan leaderboard",
        "description" => "Clan leaderboard payload",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    Repo.insert!(%TournamentUserResult{
      tournament_id: tournament.id,
      user_id: user.id,
      user_name: user.name,
      user_lang: user.lang,
      clan_id: clan.id,
      clan_name: clan.name,
      place: 1,
      score: 100,
      games_count: 1,
      wins_count: 1,
      total_time: 10,
      avg_result_percent: Decimal.new("100.0")
    })

    user_token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    assert {:ok, user_socket} = connect(UserSocket, %{"token" => user_token})

    assert {:ok, _response, channel_socket} =
             subscribe_and_join(user_socket, TournamentChannel, "tournament:#{tournament.id}", %{})

    ref = push(channel_socket, "tournament:get_results", %{"params" => %{"type" => "leaderboard"}})

    assert_reply(ref, :ok, %{results: [%{clan_id: clan_id, clan_name: "hexlet"}]})
    assert clan_id == clan.id
  end
end
