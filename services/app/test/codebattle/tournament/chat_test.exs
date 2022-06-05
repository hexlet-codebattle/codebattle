defmodule Codebattle.Tournament.ChatTest do
  use Codebattle.IntegrationCase, async: false

  @module Codebattle.Tournament.Individual
  import Codebattle.Tournament.Helpers

  describe "chat" do
    test "works" do
      user = insert(:user)
      player = struct(Codebattle.Tournament.Types.Player, Map.from_struct(user))

      tournament =
        insert(:tournament,
          state: "waiting_participants",
          creator_id: user.id,
          data: %{players: [player]},
          players_count: nil
        )

      new_tournament = @module.start(tournament, %{user: user})
      assert new_tournament.players_count == 2
      assert players_count(new_tournament) == 2
    end
  end
end
