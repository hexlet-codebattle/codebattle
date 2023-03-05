defmodule Codebattle.Tournament.BaseTest do
  use Codebattle.IntegrationCase, async: false

  @module Codebattle.Tournament.Individual
  import Codebattle.Tournament.Helpers

  describe "starts a tournament with completed players_limit" do
    test "join to waiting_participants" do
      user = insert(:user)
      insert(:task, level: "elementary")
      tournament = insert(:tournament, creator_id: user.id, state: "waiting_participants")

      updated = @module.join(tournament, %{user: user})
      assert get_players(updated) == []

      updated = @module.start(updated, %{user: user})

      updated = @module.join(updated, %{user: user})
      assert get_player_ids(updated) == [user.id]

      updated = @module.leave(updated, %{user: user})
      assert get_player_ids(updated) == []

      updated = @module.back(updated, %{user: user})

      updated = @module.leave(updated, %{user: user})
      assert get_player_ids(updated) == []
    end
  end
end
