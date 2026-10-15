defmodule Codebattle.Bot.SocketJsonTest do
  use ExUnit.Case, async: true

  alias Codebattle.Bot.SocketJson

  test "uses the join ref that PhoenixClient sends on subsequent pushes" do
    join = SocketJson.encode!([nil, "7", "game:1", "phx_join", %{}])
    assert SocketJson.decode!(join) == ["7", "7", "game:1", "phx_join", %{}]

    push = ["7", "8", "game:1", "editor:data", %{"editor_text" => "hello"}]
    assert push |> SocketJson.encode!() |> SocketJson.decode!() == push
  end
end
