defmodule Codebattle.Tournament.BaseTest do
  use Codebattle.IntegrationCase, async: false

  @module Codebattle.Tournament.Individual
  import Codebattle.Tournament.Helpers

  describe "starts a tournament with completed players_count" do
    test "join to upcoming and waiting_participants" do
      user = insert(:user)
      insert(:task, level: "elementary")
      tournament = insert(:tournament, creator_id: user.id, state: "upcoming")

      updated = @module.join(tournament, %{user: user})
      assert get_intended_player_ids(updated) == [user.id]
      assert get_players(updated) == []

      updated = @module.start(updated, %{user: user})

      updated = @module.join(updated, %{user: user})
      assert get_intended_player_ids(updated) == [user.id]
      assert get_player_ids(updated) == [user.id]

      updated = @module.leave(updated, %{user: user})
      assert get_intended_player_ids(updated) == []
      assert get_player_ids(updated) == []

      updated = @module.back(updated, %{user: user})

      updated = @module.leave(updated, %{user: user})
      assert get_intended_player_ids(updated) == []
      assert get_player_ids(updated) == []
    end
  end
end
