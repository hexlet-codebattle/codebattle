defmodule Codebattle.SmallModulesTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Auth.User.ExternalUser
  alias Codebattle.CodeCheck.Result.V2
  alias Codebattle.TaskPack
  alias Codebattle.TaskPackForm
  alias Codebattle.Tournament

  test "encodes map sets as JSON arrays" do
    assert [1, 2] |> MapSet.new() |> Jason.encode!() |> Jason.decode!() |> Enum.sort() == [1, 2]
  end

  test "creates the default version 2 check result" do
    assert %V2{
             exit_code: 0,
             success_count: 0,
             asserts_count: 1,
             status: "initial",
             output_error: "",
             version: 2,
             asserts: []
           } = V2.new()
  end

  test "returns real time when the test clock is not frozen" do
    original = Application.get_env(:codebattle, :freeze_time)
    Application.put_env(:codebattle, :freeze_time, false)

    on_exit(fn -> Application.put_env(:codebattle, :freeze_time, original) end)

    assert NaiveDateTime.diff(NaiveDateTime.utc_now(:second), TimeHelper.utc_now()) in 0..1
  end

  test "validates task pack ids and reports malformed input" do
    valid =
      TaskPackForm.changeset(%TaskPack{}, %{
        "name" => "practice",
        "state" => "draft",
        "visibility" => "public",
        "creator_id" => 1,
        "task_ids" => "1, 2,3"
      })

    assert valid.valid?
    assert Ecto.Changeset.get_change(valid, :task_ids) == [1, 2, 3]

    invalid = TaskPackForm.changeset(%TaskPack{}, %{"task_ids" => "1, nope"})

    assert {"Please provide only integers with comma separated values", _opts} =
             invalid.errors[:task_ids]
  end

  test "creates external users without an avatar when the provider marks it empty" do
    profile = %{
      id: "external-user-no-avatar",
      login: "external-login",
      is_avatar_empty: true,
      default_avatar_id: "unused"
    }

    assert {:ok, user} = ExternalUser.find_or_create(profile)
    assert user.avatar_url == nil
    assert user.external_oauth_id == profile.id
  end

  test "exposes tournament configuration values and validates referenced events" do
    event = insert(:event)
    creator = insert(:user)

    assert "token" in Tournament.access_types()
    assert "open" in Tournament.grades()
    assert "swiss" in Tournament.public_types()
    assert "by_user" in Tournament.ranking_types()
    assert "75_percentile" in Tournament.score_strategies()
    assert "level" in Tournament.task_providers()
    assert "random" in Tournament.task_strategies()
    assert "per_task" in Tournament.timeout_modes()
    assert "swiss" in Tournament.types()

    valid =
      Tournament.changeset(%Tournament{}, %{
        name: "Event tournament",
        description: "Valid tournament",
        starts_at: DateTime.utc_now(),
        event_id: event.id,
        creator: creator
      })

    assert valid.valid?
    assert Ecto.Changeset.get_field(valid, :event_id) == event.id
    assert Ecto.Changeset.get_field(valid, :creator).id == creator.id

    invalid =
      Tournament.changeset(%Tournament{}, %{
        name: "Missing event",
        description: "Invalid tournament",
        starts_at: DateTime.utc_now(),
        event_id: -1
      })

    assert {"Event not found", _} = invalid.errors[:event_id]

    blank = Tournament.changeset(%Tournament{}, %{event_id: ""})
    refute Keyword.has_key?(blank.errors, :event_id)
  end
end
