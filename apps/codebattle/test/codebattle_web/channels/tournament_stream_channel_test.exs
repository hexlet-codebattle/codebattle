defmodule CodebattleWeb.TournamentStreamChannelTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Tournament
  alias CodebattleWeb.TournamentAdminChannel
  alias CodebattleWeb.TournamentStreamChannel
  alias CodebattleWeb.UserSocket

  defp create_tournament(creator, attrs \\ %{}) do
    base = %{
      "starts_at" => "2026-02-24T06:00",
      "name" => "Stream Tournament",
      "description" => "Stream Tournament",
      "user_timezone" => "Etc/UTC",
      "level" => "easy",
      "creator" => creator,
      "break_duration_seconds" => 0,
      "type" => "swiss",
      "state" => "waiting_participants",
      "players_limit" => 200
    }

    {:ok, tournament} = Tournament.Context.create(Map.merge(base, attrs))
    tournament
  end

  defp connect_user(user) do
    token = Phoenix.Token.sign(socket(UserSocket), "user_token", user.id)
    {:ok, socket} = connect(UserSocket, %{"token" => token})
    socket
  end

  describe "join/3" do
    test "allows tournament creator to join" do
      creator = insert(:user)
      tournament = create_tournament(creator)
      socket = connect_user(creator)

      assert {:ok, payload, _socket} =
               subscribe_and_join(
                 socket,
                 TournamentStreamChannel,
                 "stream:#{tournament.id}",
                 %{}
               )

      assert %{tournament: _, active_game_id: nil} = payload
    end

    test "allows tournament moderator to join" do
      creator = insert(:user)
      moderator = insert(:user)
      tournament = create_tournament(creator, %{"moderator_ids" => [moderator.id]})
      socket = connect_user(moderator)

      assert {:ok, _payload, _socket} =
               subscribe_and_join(
                 socket,
                 TournamentStreamChannel,
                 "stream:#{tournament.id}",
                 %{}
               )
    end

    test "rejects non-moderator user" do
      creator = insert(:user)
      user = insert(:user)
      tournament = create_tournament(creator)
      socket = connect_user(user)

      assert {:error, %{reason: "not_found"}} =
               subscribe_and_join(
                 socket,
                 TournamentStreamChannel,
                 "stream:#{tournament.id}",
                 %{}
               )
    end

    test "includes admin-selected active_game_id in join payload" do
      creator = insert(:user)
      tournament = create_tournament(creator)
      TournamentAdminChannel.store_active_game(tournament.id, 4242)
      socket = connect_user(creator)

      assert {:ok, %{active_game_id: 4242}, _socket} =
               subscribe_and_join(
                 socket,
                 TournamentStreamChannel,
                 "stream:#{tournament.id}",
                 %{}
               )
    end
  end

  describe "handle_info/2" do
    setup do
      creator = insert(:user)
      tournament = create_tournament(creator)
      socket = connect_user(creator)

      {:ok, _payload, channel_socket} =
        subscribe_and_join(
          socket,
          TournamentStreamChannel,
          "stream:#{tournament.id}",
          %{}
        )

      %{tournament: tournament, socket: channel_socket}
    end

    test "pushes active_game_selected on tournament:stream:active_game", %{socket: socket} do
      send(socket.channel_pid, %{event: "tournament:stream:active_game", payload: %{game_id: 99}})

      assert_push("stream:active_game_selected", %{id: 99})
    end

    test "pushes active_game_selected on tournament:updated when admin selected a game", %{
      tournament: tournament,
      socket: socket
    } do
      TournamentAdminChannel.store_active_game(tournament.id, 777)

      send(socket.channel_pid, %{event: "tournament:updated"})

      assert_push("stream:active_game_selected", %{id: 777})
    end

    test "ignores unknown events", %{socket: socket} do
      send(socket.channel_pid, %{event: "tournament:unknown"})

      refute_push("stream:active_game_selected", _)
    end
  end

  describe "handle_in/3" do
    test "ignores all incoming messages from FE" do
      creator = insert(:user)
      tournament = create_tournament(creator)
      socket = connect_user(creator)

      {:ok, _payload, channel_socket} =
        subscribe_and_join(
          socket,
          TournamentStreamChannel,
          "stream:#{tournament.id}",
          %{}
        )

      ref = push(channel_socket, "any_topic", %{"foo" => "bar"})
      refute_reply(ref, _, _)
    end
  end
end
