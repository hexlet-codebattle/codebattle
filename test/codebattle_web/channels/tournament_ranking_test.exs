defmodule CodebattleWeb.TournamentRankingTest do
  use CodebattleWeb.ChannelCase

  alias Codebattle.Tournament
  alias CodebattleWeb.TournamentChannel
  alias CodebattleWeb.UserSocket

  setup context do
    creator = insert(:admin)
    players = insert_list(22, :user)

    {:ok, tournament} =
      Tournament.Context.create(%{
        "starts_at" => "2022-02-24T06:00",
        "name" => "Ranking tournament",
        "description" => "Live ranking updates",
        "user_timezone" => "Etc/UTC",
        "creator" => creator,
        "type" => "swiss",
        "players_limit" => 100,
        "use_async_ranking" => context[:async_ranking] || false
      })

    Enum.each(players, &Tournament.Context.handle_event(tournament.id, :join, %{user: &1}))

    {:ok, socket} = connect(UserSocket, %{"token" => user_socket_token(creator)})

    {:ok, reply, socket} =
      subscribe_and_join(socket, TournamentChannel, "tournament:#{tournament.id}", %{})

    %{tournament: tournament, players: players, socket: socket, reply: reply}
  end

  test "pushes all standings immediately on join, leave and round updates", context do
    %{tournament: tournament, players: [first | _], reply: reply} = context
    assert reply.tournament.use_async_ranking == false
    assert length(reply.ranking.entries) == 22
    assert reply.ranking.total_entries == 22

    Tournament.Context.handle_event(tournament.id, :leave, %{user_id: first.id})
    assert_push "tournament:player:left", %{player_id: player_id}
    assert player_id == first.id
    assert_push "tournament:ranking_update", %{ranking: ranking}, 500
    assert ranking.total_entries == 21
    assert length(ranking.entries) == 21
    refute Enum.any?(ranking.entries, &(&1.id == first.id))

    Tournament.Context.handle_event(tournament.id, :join, %{user: first})
    assert_push "tournament:player:joined", _
    assert_push "tournament:ranking_update", %{ranking: ranking}, 500
    assert length(ranking.entries) == 22
    assert Enum.any?(ranking.entries, &(&1.id == first.id))

    live = Tournament.Context.get!(tournament.id)
    Codebattle.PubSub.broadcast("tournament:round_finished", %{tournament: live})
    assert_push "tournament:round_finished", _
    assert_push "tournament:ranking_update", %{ranking: %{total_entries: 22}}, 500
  end

  @tag async_ranking: true
  test "heavy tournaments keep paged joins and batch registration updates", context do
    %{tournament: tournament, players: [first, second | _], reply: reply} = context
    assert reply.tournament.use_async_ranking
    assert length(reply.ranking.entries) == 16
    assert reply.ranking.total_entries == 22

    Tournament.Context.handle_event(tournament.id, :leave, %{user_id: first.id})
    Tournament.Context.handle_event(tournament.id, :leave, %{user_id: second.id})
    assert_push "tournament:player:left", _
    assert_push "tournament:player:left", _
    refute_push "tournament:ranking_update", _, 200
    assert_push "tournament:ranking_update", %{ranking: %{total_entries: 20, page_size: 16}}, 2500
    refute_push "tournament:ranking_update", _, 200
  end

  @tag async_ranking: true
  test "switching to immediate ranking replaces pending delayed pages", context do
    %{tournament: tournament, players: [first | _]} = context
    Tournament.Context.handle_event(tournament.id, :leave, %{user_id: first.id})
    assert_push "tournament:player:left", _

    {:ok, _} = Tournament.Context.update(tournament, %{"use_async_ranking" => false})
    assert_push "tournament:update", %{tournament: %{use_async_ranking: false}}
    assert_push "tournament:ranking_update", %{ranking: %{entries: entries, total_entries: 21}}, 500
    assert length(entries) == 21
    refute_push "tournament:ranking_update", _, 2200
  end
end
