defmodule Codebattle.Chat.ServerTest do
  use ExUnit.Case
  alias Codebattle.Chat.Server

  test ".get_messages with correct order" do
    assert Server.get_messages(:lobby) == []

    :ok = Server.add_message(:lobby, %{name: "alice", text: "oi"})
    :ok = Server.add_message(:lobby, %{name: "bob", text: "blz"})

    assert Server.get_messages(:lobby) == [
             %{name: "alice", text: "oi"},
             %{name: "bob", text: "blz"}
           ]
  end

  test ".ban_user" do
    assert Server.get_messages(:lobby) == []

    :ok = Server.add_message(:lobby, %{name: "alice", text: "oi"})
    :ok = Server.add_message(:lobby, %{name: "bob", text: "blz"})
    :ok = Server.add_message(:lobby, %{name: "alice", text: "bom dia"})


    Server.command(:lobby, %{name: "vtm", command: "ban" }) == []


    /ban name:alice duration:infinity
  end
end
