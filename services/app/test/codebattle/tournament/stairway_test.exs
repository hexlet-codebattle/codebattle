# defmodule Codebattle.Tournament.StairwayTest do
#   use Codebattle.IntegrationCase, async: false

#   import Codebattle.Tournament.Helpers
#   @module Codebattle.Tournament.Stairway

#   def build_player(user, params \\ %{}) do
#     struct(Codebattle.Tournament.Types.Player, Map.from_struct(user)) |> Map.merge(params)
#   end

#   def get_matches_states(tournament), do: tournament.data.matches |> Enum.map(fn x -> x.state end)

#   test ".start_step! for round 0 picks task from task_pack and starts games" do
#     user1 = insert(:user)
#     user2 = insert(:user)

#     player1 = build_player(user1)
#     player2 = build_player(user2)
#     tasks = insert_list(3, :task)
#     task_ids = tasks |> Enum.map(& &1.id)
#     task_pack = insert(:task_pack, task_ids: task_ids)

#     tournament =
#       insert(:team_tournament,
#         state: "waiting_participants",
#         step: 0,
#         creator_id: user1.id,
#         task_pack_id: task_pack.id,
#         task_pack: task_pack,
#         data: %{
#           players: [player1, player2]
#         }
#       )

#     new_tournament = @module.start(tournament, %{user: user1})

#     assert new_tournament.step == 0
#     assert new_tournament.state == "active"
#     assert new_tournament.players_count == 2
#     assert new_tournament.meta["current_task"].id == Enum.at(task_ids, 0)
#     matches = get_matches(new_tournament)
#     assert length(matches) == 2
#     assert [%{state: "playing"}, %{state: "playing"}] = matches

#     new_tournament =
#       new_tournament
#       |> @module.finish_all_playing_matches()
#       |> @module.maybe_start_new_step()

#     assert new_tournament.step == 1
#     assert new_tournament.state == "active"
#     assert new_tournament.meta["current_task"].id == Enum.at(task_ids, 1)
#     matches = get_matches(new_tournament)
#     assert length(matches) == 4

#     assert [%{state: "finished"}, %{state: "finished"}, %{state: "active"}, %{state: "active"}] =
#              matches

#     new_tournament =
#       new_tournament
#       |> @module.finish_all_playing_matches()
#       |> @module.maybe_start_new_step()

#     assert new_tournament.step == 2
#     assert new_tournament.state == "active"
#     assert new_tournament.meta["current_task"].id == Enum.at(task_ids, 2)
#     matches = get_matches(new_tournament)
#     assert length(matches) == 6

#     assert [
#              %{state: "finished"},
#              %{state: "finished"},
#              %{state: "finished"},
#              %{state: "finished"},
#              %{state: "active"},
#              %{state: "active"}
#            ] = matches

#     new_tournament =
#       new_tournament
#       |> @module.finish_all_playing_matches()
#       |> @module.maybe_start_new_step()

#     assert new_tournament.step == 3
#     assert new_tournament.state == "finished"
#     assert new_tournament.meta["current_task"].id == Enum.at(task_ids, 2)
#     matches = get_matches(new_tournament)
#     assert length(matches) == 6

#     assert [
#              %{state: "finished"},
#              %{state: "finished"},
#              %{state: "finished"},
#              %{state: "finished"},
#              %{state: "finished"},
#              %{state: "finished"}
#            ] = matches
#   end
# end
