defmodule Codebattle.TaskPackTest do
  use Codebattle.DataCase

  alias Codebattle.TaskPack

  test "retrieves ordered tasks and applies visibility rules" do
    owner = insert(:user)
    outsider = insert(:user)
    admin = insert(:admin)
    first = insert(:task)
    second = insert(:task)

    pack =
      insert(:task_pack,
        name: "ordered-pack",
        creator_id: owner.id,
        visibility: "hidden",
        state: "draft",
        task_ids: [second.id, -1, first.id]
      )

    assert TaskPack.get!(pack.id).id == pack.id
    assert TaskPack.get(pack.id).id == pack.id
    assert TaskPack.get(-1) == nil
    assert TaskPack.get_by!(name: pack.name).id == pack.id
    assert TaskPack.get_by(name: "missing") == nil
    assert Enum.map(TaskPack.get_tasks(pack), & &1.id) == [second.id, first.id]
    assert TaskPack.get_tasks_by_pack_id(-1) == []
    assert TaskPack.get_tasks_by_pack_name("missing") == []
    assert TaskPack.get_tasks_by_pack_id(pack.id) == [second, nil, first]
    assert TaskPack.get_tasks_by_pack_name(pack.name) == [second, nil, first]

    assert TaskPack.can_access_task_pack?(pack, owner)
    refute TaskPack.can_access_task_pack?(pack, outsider)
    assert TaskPack.can_see_task_pack?(%{pack | visibility: "public"}, outsider)
    assert Enum.any?(TaskPack.list_visible(admin), &(&1.id == pack.id))
    refute Enum.any?(TaskPack.list_visible(outsider), &(&1.id == pack.id))

    assert TaskPack.change_state(pack, "active").state == "active"
    assert "active" in TaskPack.states()
    assert "public" in TaskPack.visibility_types()
    assert {:ok, deleted} = TaskPack.delete(pack)
    assert deleted.id == pack.id
  end
end
