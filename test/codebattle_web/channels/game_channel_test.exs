defmodule CodebattleWeb.GameChannelTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.GameChannel

  setup do
    user = insert(:user)
    channel_id = "lobby"
    {:ok, _, socket} =
      socket("user_id", %{user_id: user.id})
      |> subscribe_and_join(GameChannel, "game:" <> channel_id)

    {:ok, socket: socket}
  end

  test "ping replies with status ok", %{socket: socket} do
    ref = push socket, "ping", %{"hello" => "there"}
    assert_reply ref, :ok, %{"hello" => "there"}
  end

  test "broadcasts are pushed to the client", %{socket: socket} do
    broadcast_from! socket, "broadcast", %{"some" => "data"}
    assert_push "broadcast", %{"some" => "data"}
  end
end
