defmodule Codebattle.Tournament.StairwayTest do
  use Codebattle.IntegrationCase, async: false

  alias Codebattle.Tournament.Helpers
  @module Codebattle.Tournament.Stairway

  def build_player(user, params \\ %{}) do
    struct(Codebattle.Tournament.Types.Player, Map.from_struct(user)) |> Map.merge(params)
  end

  def get_matches_states(tournament), do: tournament.data.matches |> Enum.map(fn x -> x.state end)

  test ".start_step! for round 0 picks task from task_pack and starts games" do
    user1 = insert(:user)
    user2 = insert(:user)

    player1 = build_player(user1)
    player2 = build_player(user2)
    tasks = insert_list(3, :task)
    task_ids = tasks |> Enum.map(& &1.id)
    task_pack = insert(:task_pack, task_ids: task_ids)

    tournament =
      insert(:team_tournament,
        state: "waiting_participants",
        step: 0,
        creator_id: user1.id,
        task_pack_id: task_pack.id,
        task_pack: task_pack,
        data: %{
          players: [player1, player2]
        }
      )

    new_tournament =
      tournament
      |> @module.start(%{user: user1})

    assert new_tournament.state == "active"
    assert new_tournament.players_count == 2
    assert new_tournament.meta["current_task"].id == Enum.at(task_ids, 0)
  end
end
