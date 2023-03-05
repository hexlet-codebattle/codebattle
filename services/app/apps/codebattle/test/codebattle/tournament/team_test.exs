defmodule Codebattle.Tournament.TeamTest do
  use Codebattle.IntegrationCase, async: false

  import Codebattle.Tournament.Helpers

  @module Codebattle.Tournament.Team

  describe "complete players" do
    test "add bots to complete teams" do
      user1 = insert(:user)
      user2 = insert(:user)

      tournament = insert(:team_tournament, state: "waiting_participants", creator_id: user1.id)

      tournament = @module.join(tournament, %{user: user1, team_id: 0})
      tournament = @module.join(tournament, %{user: user2, team_id: 0})
      tournament = @module.start(tournament, %{user: user1})

      assert players_count(tournament) == 4
    end
  end
end
