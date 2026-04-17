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
end
