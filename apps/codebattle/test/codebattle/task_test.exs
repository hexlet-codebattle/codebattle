defmodule Codebattle.TaskTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Task
  alias Codebattle.User

  test "queries visible tasks by identity, level, tags, and training status" do
    owner = insert(:user)
    outsider = insert(:user)
    public = insert(:task, creator_id: owner.id, visibility: "public", state: "active", tags: ["training", "arrays"])
    private = insert(:task, creator_id: owner.id, visibility: "hidden", state: "draft", tags: ["private-tag"])

    visible_ids = Enum.map(Task.list_visible(outsider), & &1.id)
    assert public.id in visible_ids
    refute private.id in visible_ids
    assert private.id in Enum.map(Task.list_visible(owner), & &1.id)

    assert Enum.map(Task.get_by_names([public.name]), & &1.id) == [public.id]
    assert Enum.map(Task.get_by_ids([private.id]), & &1.id) == [private.id]
    assert Task.get_task_by_id_for_user(owner, private.id).id == private.id
    assert Task.get_task_by_id_for_user(outsider, private.id) == nil
    refute Task.uniq?(public.name)
    assert Task.uniq?("definitely-new-task")

    assert Task.get_task_by_tags_for_user(outsider, ["arrays"]).id == public.id
    assert Task.get_task_by_tags_for_user(outsider, ["arrays"], public.level).id == public.id
    assert Task.get_random_training_task().id == public.id
    assert "arrays" in Task.list_all_tags()
  end

  test "lists visible task ids and tasks by level" do
    visible = insert(:task, visibility: "public", state: "active", level: "easy")
    _hidden = insert(:task, visibility: "hidden", state: "active", level: "easy")

    assert visible.id in Task.list_task_ids()
    assert visible.id in Task.get_shuffled_task_ids("easy")
    assert visible.id in Enum.map(Task.get_tasks_by_level("easy"), & &1.id)
    assert visible.id in Enum.map(Task.get_all_visible(), & &1.id)
    assert Task.get!(visible.id).id == visible.id
    assert Task.get(visible.id).id == visible.id
    assert Task.get(-1) == nil
  end

  test "builds blank tasks and evaluates access rules" do
    owner = %User{id: 1, subscription_type: :free}
    outsider = %User{id: 2, subscription_type: :free}
    admin = %User{id: 3, subscription_type: :admin}
    public = %Task{visibility: "public", creator_id: owner.id, origin: "user"}
    private = %Task{visibility: "hidden", creator_id: owner.id, origin: "user"}
    system = %Task{visibility: "hidden", creator_id: owner.id, origin: "github"}

    assert Task.create_empty(owner.id).state == "blank"
    assert Task.can_see_task?(public, outsider)
    assert Task.can_see_task?(private, owner)
    refute Task.can_see_task?(private, outsider)
    assert Task.can_access_task?(private, admin)
    assert Task.can_delete_task?(private, owner)
    assert Task.can_delete_task?(private, admin)
    refute Task.can_delete_task?(system, owner)
  end

  test "updates state and deletes persisted tasks" do
    task = insert(:task)

    assert {:ok, updated} = Task.update(task, %{comment: "covered"})
    assert updated.comment == "covered"
    assert Task.change_state(task, "disabled").state == "disabled"
    assert {:ok, _deleted} = Task.delete(task)
  end

  test "exposes supported enum values" do
    assert "easy" in Task.levels()
    assert "public" in Task.visibility_types()
    assert "user" in Task.origin_types()
    assert "active" in Task.states()
  end
end
