defmodule Codebattle.Game.TimeoutServerTest do
  use ExUnit.Case

  import Mock
  alias Codebattle.Game.{Context, TimeoutServer}

  @game_id 100
  @game2_id 101

  test "starts server" do
    assert TimeoutServer.start_link(@game_id)
  end

  test "calls Context.timeout when it's time" do
    TimeoutServer.start_link(@game_id)
    TimeoutServer.start_link(@game2_id)

    with_mock(Context,
      trigger_timeout: fn game_id -> game_id end
    ) do
      TimeoutServer.start_timer(@game_id, 0)
      TimeoutServer.start_timer(@game2_id, 100)

      assert called(Context.trigger_timeout(@game_id))
      assert !called(Context.trigger_timeout(@game2_id))
    end
  end
end
