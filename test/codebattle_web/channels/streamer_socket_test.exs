defmodule CodebattleWeb.StreamerSocketTest do
  use CodebattleWeb.ChannelCase

  alias CodebattleWeb.StreamerSocket

  describe "connect/2" do
    test "accepts connection with valid token and integer tournament_id (string)" do
      assert {:ok, socket} = connect(StreamerSocket, %{"token" => "x-key", "tournament_id" => "42"})
      assert socket.assigns.streamer? == true
      assert socket.assigns.tournament_id == 42
    end

    test "accepts connection when tournament_id is already an integer" do
      assert {:ok, socket} = connect(StreamerSocket, %{"token" => "x-key", "tournament_id" => 7})
      assert socket.assigns.tournament_id == 7
    end

    test "rejects connection with a wrong token" do
      assert :error = connect(StreamerSocket, %{"token" => "nope", "tournament_id" => "1"})
    end

    test "rejects connection with no tournament_id" do
      assert :error = connect(StreamerSocket, %{"token" => "x-key"})
    end

    test "rejects connection with non-numeric tournament_id" do
      assert :error = connect(StreamerSocket, %{"token" => "x-key", "tournament_id" => "abc"})
    end

    test "rejects connection with no params" do
      assert :error = connect(StreamerSocket, %{})
    end
  end
end
