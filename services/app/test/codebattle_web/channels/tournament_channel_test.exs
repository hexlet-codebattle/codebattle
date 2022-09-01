# defmodule CodebattleWeb.TournamentChannelTest do
#   use CodebattleWeb.ChannelCase, async: false

#   alias CodebattleWeb.TournamentChannel
#   alias Codebattle.Tournament.GlobalSupervisor
#   alias CodebattleWeb.UserSocket

#   import Codebattle.Tournament.Helpers

#   setup do
#     creator = insert(:user, name: "alice")
#     participant = insert(:user, name: "bob")
#     insert(:task, level: "elementary")

#     player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(creator))

#     tournament =
#       insert(:tournament,
#         creator_id: creator.id,
#         data: %{players: [player]},
#         players_count: nil
#       )

#     creator_token = Phoenix.Token.sign(socket(UserSocket), "user_token", creator.id)
#     {:ok, creator_socket} = connect(UserSocket, %{"token" => creator_token})

#     participant_token = Phoenix.Token.sign(socket(UserSocket), "user_token", participant.id)
#     {:ok, participant_socket} = connect(UserSocket, %{"token" => participant_token})

#     {:ok,
#      %{
#        participant: participant,
#        creator: creator,
#        tournament: tournament,
#        participant_socket: participant_socket,
#        creator_socket: creator_socket
#      }}
#   end

#   test "sends tournament info when user join", %{
#     participant_socket: participant_socket,
#     tournament: tournament
#   } do
#     GlobalSupervisor.start_tournament(tournament)
#     topic = get_tournament_topic(tournament.id)

#     {:ok, response, _socket} = subscribe_and_join(participant_socket, TournamentChannel, topic)

#     assert %{tournament: _tournament = %Codebattle.Tournament{}, statistics: %{}} = response
#   end

#   test "broadcasts a new tournament after a participant joins and leaves the tournament", %{
#     participant_socket: participant_socket,
#     tournament: tournament
#   } do
#     GlobalSupervisor.start_tournament(tournament)
#     topic = get_tournament_topic(tournament.id)

#     {:ok, _response, participant_socket} =
#       subscribe_and_join(participant_socket, TournamentChannel, topic)

#     push(participant_socket, "tournament:join", %{})

#     assert_receive %Phoenix.Socket.Broadcast{
#       topic: ^topic,
#       event: "tournament:update",
#       payload: %{tournament: tournament = %Codebattle.Tournament{}, statistics: %{}}
#     }

#     assert players_count(tournament) == 2

#     push(participant_socket, "tournament:leave", %{})

#     assert_receive %Phoenix.Socket.Broadcast{
#       topic: ^topic,
#       event: "tournament:update",
#       payload: %{tournament: tournament = %Codebattle.Tournament{}, statistics: %{}}
#     }

#     assert players_count(tournament) == 1
#   end

#   test "cancels tournament and broadcasts", %{
#     creator_socket: creator_socket,
#     tournament: tournament
#   } do
#     GlobalSupervisor.start_tournament(tournament)
#     topic = get_tournament_topic(tournament.id)

#     {:ok, _response, creator_socket} =
#       subscribe_and_join(creator_socket, TournamentChannel, topic)

#     push(creator_socket, "tournament:cancel", %{})

#     assert_receive %Phoenix.Socket.Broadcast{
#       topic: ^topic,
#       event: "tournament:update",
#       payload: %{tournament: tournament = %Codebattle.Tournament{}, statistics: %{}}
#     }

#     assert is_canceled?(tournament)
#   end

#   def get_tournament_topic(id), do: "tournament:#{id}"
# end
