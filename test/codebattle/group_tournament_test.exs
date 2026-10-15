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

  test "exposes strategy values and classifies tournament modes" do
    assert "waiting_participants" in GroupTournament.states()
    assert "ranked" in GroupTournament.types()
    assert "rating" in GroupTournament.slice_strategies()
    assert "global_linear" in GroupTournament.scoring_strategies()
    assert "neighbor_ladder" in GroupTournament.movement_strategies()

    assert GroupTournament.seeding_round?(%GroupTournament{
             type: "ranked",
             has_seed_round: true,
             current_round_position: 1
           })

    assert GroupTournament.seeding_round?(%GroupTournament{type: "seed_only"})
    refute GroupTournament.seeding_round?(%GroupTournament{type: "ranked"})
    assert GroupTournament.ranked?(%GroupTournament{type: "ranked"})
    refute GroupTournament.ranked?(%GroupTournament{type: "classic"})
    assert GroupTournament.seed_only?(%GroupTournament{type: "seed_only"})
    refute GroupTournament.seed_only?(%GroupTournament{type: "ranked"})
    assert GroupTournament.infinite?(%GroupTournament{is_infinite: true})
    refute GroupTournament.infinite?(%GroupTournament{})
  end

  test "normalizes optional fields and permits infinite rounds without a timeout" do
    creator = insert(:user)
    group_task = insert(:group_task)

    changeset =
      GroupTournament.changeset(%GroupTournament{}, %{
        creator_id: creator.id,
        group_task_id: group_task.id,
        name: "Infinite Tournament",
        slug: "  INFINITE-SLUG  ",
        description: "description",
        starts_at: DateTime.utc_now(),
        rounds_count: 1,
        is_infinite: true,
        template_id: "   ",
        task_description: "  task text  "
      })

    assert changeset.valid?
    assert Ecto.Changeset.get_change(changeset, :slug) == "infinite-slug"
    assert Ecto.Changeset.get_change(changeset, :template_id) == nil
    assert Ecto.Changeset.get_change(changeset, :task_description) == "task text"
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
