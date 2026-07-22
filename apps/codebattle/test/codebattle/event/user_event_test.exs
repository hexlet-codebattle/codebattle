defmodule Codebattle.UserEventTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.UserEvent

  test "manages user events and their embedded stage lifecycle" do
    user = insert(:user)
    event = insert(:event)
    first_tournament = insert(:tournament)
    second_tournament = insert(:tournament)
    group_tournament = insert(:group_tournament)

    assert "pending" in UserEvent.statuses()
    assert {:ok, user_event} = UserEvent.create(%{user_id: user.id, event_id: event.id, status: "pending"})
    assert UserEvent.get!(user_event.id).id == user_event.id
    assert UserEvent.get(user_event.id).id == user_event.id
    assert UserEvent.get(-1) == nil
    assert UserEvent.get_by_user_id_and_event_id(user.id, event.id).id == user_event.id
    assert Enum.any?(UserEvent.get_all(), &(&1.id == user_event.id))
    assert UserEvent.get_stage(user_event, "missing") == nil
    assert UserEvent.get_stage(nil, "missing") == nil

    assert {:ok, staged} =
             UserEvent.upsert_stages(user_event, [
               %{slug: "one", status: :pending},
               %{slug: "two", status: :pending}
             ])

    assert UserEvent.get_stage(staged, "one").status == :pending

    started =
      UserEvent.mark_stage_as_started(staged, "one", first_tournament.id, group_tournament.id)

    assert started.status == "in_progress"
    assert started.current_stage_slug == "one"
    assert UserEvent.get_stage(started, "one").tournament_id == first_tournament.id
    assert UserEvent.get_stage(started, "one").group_tournament_id == group_tournament.id

    info = %{
      id: first_tournament.id,
      games_count: 3,
      score: 20,
      time_spent_in_seconds: 42,
      wins_count: 2
    }

    assert {:ok, partly_completed} = UserEvent.mark_stage_as_completed(event.id, user.id, info)
    assert partly_completed.status == "in_progress"
    assert UserEvent.get_stage(partly_completed, "one").status == :completed

    _second_started =
      UserEvent.mark_stage_as_started(partly_completed, "two", second_tournament.id)

    second_info = %{
      id: second_tournament.id,
      games_count: 1,
      score: 5,
      time_spent_in_seconds: 10,
      wins_count: 1
    }

    assert {:ok, completed} = UserEvent.mark_stage_as_completed(event.id, user.id, second_info)
    assert completed.status == "completed"
    assert completed.finished_at

    assert {:ok, emptied} = UserEvent.upsert_stages(completed, [])
    assert emptied.status == "pending"
    assert emptied.current_stage_slug == nil
    assert {:ok, _deleted} = UserEvent.delete(emptied)
  end

  test "returns nil when completing an unknown event or tournament stage" do
    assert UserEvent.mark_stage_as_completed(-1, -1, %{id: -1}) == nil

    user = insert(:user)
    event = insert(:event)
    {:ok, user_event} = UserEvent.create(%{user_id: user.id, event_id: event.id, status: "pending"})
    assert UserEvent.mark_stage_as_completed(event.id, user.id, %{id: -1}) == nil
    assert UserEvent.changeset(user_event, %{status: "unknown"}).valid? == false
  end
end
