defmodule CodebattleWeb.TournamentAdminChannelTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Tournament
  alias Codebattle.Tournament.Helpers
  alias CodebattleWeb.TournamentAdminChannel
  alias CodebattleWeb.UserSocket

  defp create_tournament(creator) do
    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2026-02-24T06:00",
        "name" => "Admin Stream Active Game",
        "description" => "desc",
        "user_timezone" => "Etc/UTC",
        "level" => "easy",
        "creator" => creator,
        "break_duration_seconds" => 0,
        "type" => "swiss",
        "state" => "waiting_participants",
        "players_limit" => 200
      })

    tournament
  end

  defp join_admin(user, tournament_id) do
    token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => token})

    {:ok, _payload, channel_socket} =
      subscribe_and_join(
        socket,
        TournamentAdminChannel,
        "tournament_admin:#{tournament_id}",
        %{}
      )

    channel_socket
  end

  describe "tournament:player:kick handle_in" do
    test "removes a player from the tournament" do
      creator = insert(:user)
      player = insert(:user)
      tournament = create_tournament(creator)
      socket = join_admin(creator, tournament.id)

      Tournament.Context.handle_event(tournament.id, :join, %{user: player})
      tournament_info = Tournament.Context.get_tournament_info(tournament.id)

      assert Helpers.get_player(tournament_info, player.id)

      ref = push(socket, "tournament:player:kick", %{"user_id" => player.id})

      assert_reply(ref, :ok, %{ranking: %{entries: _entries}})
      assert_push("tournament:player:left", %{player_id: player_id})

      tournament_info = Tournament.Context.get_tournament_info(tournament.id)

      assert player_id == player.id
      refute Helpers.get_player(tournament_info, player.id)
      assert tournament_info.players_count == 0
    end
  end

  describe "tournament:stream:active_game handle_in" do
    test "stores active game when payload uses snake_case game_id" do
      creator = insert(:user)
      tournament = create_tournament(creator)
      socket = join_admin(creator, tournament.id)

      push(socket, "tournament:stream:active_game", %{"game_id" => 42})

      assert_push("tournament:stream:active_game", %{game_id: 42})
      assert TournamentAdminChannel.get_active_game(tournament.id) == 42
    end

    test "stores active game when payload uses camelCase gameId" do
      creator = insert(:user)
      tournament = create_tournament(creator)
      socket = join_admin(creator, tournament.id)

      push(socket, "tournament:stream:active_game", %{"gameId" => 77})

      assert_push("tournament:stream:active_game", %{game_id: 77})
      assert TournamentAdminChannel.get_active_game(tournament.id) == 77
    end

    test "broadcasts to other admin clients" do
      creator = insert(:user)
      moderator = insert(:user)

      {:ok, tournament} =
        Tournament.Context.create(%{
          "starts_at" => "2026-02-24T06:00",
          "name" => "Stream Sync",
          "description" => "desc",
          "user_timezone" => "Etc/UTC",
          "level" => "easy",
          "creator" => creator,
          "moderator_ids" => [moderator.id],
          "break_duration_seconds" => 0,
          "type" => "swiss",
          "state" => "waiting_participants",
          "players_limit" => 200
        })

      _creator_socket = join_admin(creator, tournament.id)
      _moderator_socket = join_admin(moderator, tournament.id)

      Codebattle.PubSub.broadcast("tournament:stream:active_game", %{
        tournament_id: tournament.id,
        game_id: 555
      })

      assert_push("tournament:stream:active_game", %{game_id: 555})
    end

    test "clearing active game broadcasts nil game_id" do
      creator = insert(:user)
      tournament = create_tournament(creator)
      socket = join_admin(creator, tournament.id)

      TournamentAdminChannel.store_active_game(tournament.id, 99)

      push(socket, "tournament:stream:active_game", %{"game_id" => nil})
      assert_push("tournament:stream:active_game", %{game_id: nil})
    end
  end

  describe "agent helpers" do
    test "store_active_game and get_active_game roundtrip" do
      TournamentAdminChannel.store_active_game(99_999, 12_345)
      assert TournamentAdminChannel.get_active_game(99_999) == 12_345
    end

    test "get_active_game returns nil for unknown tournament" do
      assert TournamentAdminChannel.get_active_game(123_456_789) == nil
    end
  end
end
