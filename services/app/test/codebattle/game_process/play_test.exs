defmodule Codebattle.GameProcess.PlayTest do
  use Codebattle.IntegrationCase

  alias Codebattle.GameProcess.{Play, FsmHelpers}
  alias Codebattle.{Game}

  setup _ do
    insert(:task, %{level: "medium"})
    user1 = insert(:user, %{name: "first", email: "test1@test.test", github_id: 1, rating: 1000})
    user2 = insert(:user, %{name: "second", email: "test2@test.test", github_id: 2, rating: 1000})

    {:ok, fsm} =
      Play.create_game(%{
        user: user1,
        level: "medium",
        timeout_seconds: 60,
        type: "public"
      })

    game_id = FsmHelpers.get_game_id(fsm)

    %{user1: user1, user2: user2, game_id: game_id}
  end

  test "joins the game", %{user1: user1, user2: user2, game_id: game_id} do
    assert {:ok, fsm} = Play.join_game(game_id, user2)

    player_ids =
      fsm.data.players
      |> Enum.map(fn player -> player.id end)

    assert fsm.state == :playing
    assert player_ids == [user1.id, user2.id]
  end

  test "tries to join the missing game", %{user1: user1, user2: user2, game_id: game_id} do
    _ = Play.cancel_game(game_id, user1)

    assert {:error, :game_terminated} = Play.join_game(game_id, user2)
  end

  test "timeouts the game", %{user1: _, user2: user2, game_id: game_id} do
    assert {:ok, _fsm} = Play.join_game(game_id, user2)
    assert :ok = Play.timeout_game(game_id)
    game = Repo.get(Game, game_id)

    assert game.state == "timeout"
  end
end
