defmodule Codebattle.GroupTask.ContextTest do
  use Codebattle.DataCase

  alias Codebattle.GroupTask.Context

  test "lists only solutions for the requested group tournament" do
    user = insert(:user)
    other_user = insert(:user)
    group_task = insert(:group_task)
    tournament = insert(:group_tournament, group_task: group_task)
    other_tournament = insert(:group_tournament, group_task: group_task)

    old_solution =
      insert(:group_task_solution,
        user: user,
        group_task: group_task,
        group_tournament: other_tournament,
        solution: "old"
      )

    kept_solution =
      insert(:group_task_solution,
        user: user,
        group_task: group_task,
        group_tournament: tournament,
        solution: "kept"
      )

    other_player_solution =
      insert(:group_task_solution,
        user: other_user,
        group_task: group_task,
        group_tournament: tournament,
        solution: "other-player"
      )

    assert [user_solution] =
             Context.list_user_solutions(group_task.id, user.id, group_tournament_id: tournament.id)

    assert user_solution.id == kept_solution.id
    assert user_solution.group_tournament_id == tournament.id

    latest_solutions =
      Context.list_latest_solutions(group_task.id, [user.id, other_user.id], group_tournament_id: tournament.id)

    assert Enum.map(latest_solutions, & &1.id) == [kept_solution.id, other_player_solution.id]
    assert Enum.all?(latest_solutions, &(&1.group_tournament_id == tournament.id))
    refute Enum.any?(latest_solutions, &(&1.id == old_solution.id))
  end

  test "stores tournament scoped submissions from submission payloads" do
    user = insert(:user)
    group_task = insert(:group_task)
    tournament = insert(:group_tournament, group_task: group_task)

    assert {:ok, solution} =
             Context.create_solution_from_submission(group_task.id, user.id, %{
               group_tournament_id: tournament.id,
               lang: "Python",
               solution: Base.encode64("def solution():\n    return 42\n")
             })

    assert solution.group_tournament_id == tournament.id
    assert solution.solution =~ "return 42"
  end
end
