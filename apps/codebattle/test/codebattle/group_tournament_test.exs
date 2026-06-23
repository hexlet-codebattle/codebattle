defmodule Codebattle.GroupTournamentTest do
  use Codebattle.DataCase

  alias Codebattle.GroupTournament

  test "allows duplicate slugs" do
    creator = insert(:user)
    group_task = insert(:group_task)

    attrs = %{
      creator_id: creator.id,
      group_task_id: group_task.id,
      name: "Shared Slug Tournament",
      slug: "shared-slug",
      description: "Group tournament description",
      starts_at: DateTime.add(DateTime.utc_now(), 3600, :second),
      rounds_count: 1,
      round_timeout_seconds: 60
    }

    assert {:ok, _first_tournament} =
             %GroupTournament{}
             |> GroupTournament.changeset(attrs)
             |> Repo.insert()

    assert {:ok, second_tournament} =
             %GroupTournament{}
             |> GroupTournament.changeset(attrs)
             |> Repo.insert()

    assert second_tournament.slug == "shared-slug"
  end

  test "requires template_id when external platform is enabled" do
    creator = insert(:user)
    group_task = insert(:group_task)

    attrs = %{
      creator_id: creator.id,
      group_task_id: group_task.id,
      name: "External Tournament",
      slug: "external-tournament",
      description: "Group tournament description",
      starts_at: DateTime.add(DateTime.utc_now(), 3600, :second),
      rounds_count: 1,
      round_timeout_seconds: 60,
      run_on_external_platform: true
    }

    changeset = GroupTournament.changeset(%GroupTournament{}, attrs)

    refute changeset.valid?
    assert {"can't be blank", _opts} = changeset.errors[:template_id]
  end

  describe "local_folder" do
    setup do
      creator = insert(:user)
      group_task = insert(:group_task)

      attrs = %{
        creator_id: creator.id,
        group_task_id: group_task.id,
        name: "Local Folder Tournament",
        slug: "local-folder-tournament",
        description: "Group tournament description",
        starts_at: DateTime.add(DateTime.utc_now(), 3600, :second),
        rounds_count: 1,
        round_timeout_seconds: 60
      }

      %{attrs: attrs}
    end

    test "is optional", %{attrs: attrs} do
      assert {:ok, tournament} =
               %GroupTournament{}
               |> GroupTournament.changeset(attrs)
               |> Repo.insert()

      assert tournament.local_folder == nil
    end

    test "is cast and persisted", %{attrs: attrs} do
      assert {:ok, tournament} =
               %GroupTournament{}
               |> GroupTournament.changeset(Map.put(attrs, :local_folder, "my-task"))
               |> Repo.insert()

      assert tournament.local_folder == "my-task"
    end

    test "trims surrounding whitespace", %{attrs: attrs} do
      assert {:ok, tournament} =
               %GroupTournament{}
               |> GroupTournament.changeset(Map.put(attrs, :local_folder, "  my-task  "))
               |> Repo.insert()

      assert tournament.local_folder == "my-task"
    end

    test "normalizes blank string to nil", %{attrs: attrs} do
      assert {:ok, tournament} =
               %GroupTournament{}
               |> GroupTournament.changeset(Map.put(attrs, :local_folder, "   "))
               |> Repo.insert()

      assert tournament.local_folder == nil
    end

    test "rejects values longer than 255 characters", %{attrs: attrs} do
      changeset =
        GroupTournament.changeset(%GroupTournament{}, Map.put(attrs, :local_folder, String.duplicate("a", 256)))

      refute changeset.valid?
      assert {"should be at most %{count} character(s)", _opts} = changeset.errors[:local_folder]
    end
  end
end
