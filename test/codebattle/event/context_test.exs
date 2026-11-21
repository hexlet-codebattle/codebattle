defmodule Codebattle.Event.ContextTest do
  use Codebattle.DataCase

  alias Codebattle.Event
  alias Codebattle.Event.Context, as: EventContext
  alias Codebattle.UserEvent

  test "calculates total and per-category places for a stage" do
    event = insert(:event)
    first = insert(:user, category: "a")
    second = insert(:user, category: "a")
    third = insert(:user, category: "b")

    {:ok, first_event} = UserEvent.create(%{user_id: first.id, event_id: event.id, status: "pending"})
    {:ok, second_event} = UserEvent.create(%{user_id: second.id, event_id: event.id, status: "pending"})
    {:ok, third_event} = UserEvent.create(%{user_id: third.id, event_id: event.id, status: "pending"})

    {:ok, _} =
      UserEvent.upsert_stages(first_event, [%{slug: "final", status: :pending, score: 10}])

    {:ok, _} = UserEvent.upsert_stages(second_event, [%{slug: "final", status: :pending, score: 20}])
    {:ok, _} = UserEvent.upsert_stages(third_event, [%{slug: "final", status: :pending, score: 1}])

    assert {:ok, 3} = EventContext.calculate_places_for_stage(event, "final")

    first_stage = first.id |> UserEvent.get_by_user_id_and_event_id(event.id) |> UserEvent.get_stage("final")
    second_stage = second.id |> UserEvent.get_by_user_id_and_event_id(event.id) |> UserEvent.get_stage("final")
    third_stage = third.id |> UserEvent.get_by_user_id_and_event_id(event.id) |> UserEvent.get_stage("final")

    assert {first_stage.place_in_total_rank, first_stage.place_in_category_rank} == {2, 2}
    assert {second_stage.place_in_total_rank, second_stage.place_in_category_rank} == {1, 1}
    assert {third_stage.place_in_total_rank, third_stage.place_in_category_rank} == {3, 1}
  end

  test "enrolls new users and appends a missing stage without duplicating it" do
    event = insert(:event)
    existing = insert(:user, is_bot: false)
    newcomer = insert(:user, is_bot: false)
    bot = insert(:user, is_bot: true)

    {:ok, existing_event} = UserEvent.create(%{user_id: existing.id, event_id: event.id, status: "pending"})
    {:ok, _} = UserEvent.upsert_stages(existing_event, [%{slug: "qualifier", status: :pending}])

    assert {:ok, count} = EventContext.enroll_all_users_for_stage(event, "final")
    assert count >= 2

    existing_event = UserEvent.get_by_user_id_and_event_id(existing.id, event.id)
    newcomer_event = UserEvent.get_by_user_id_and_event_id(newcomer.id, event.id)
    assert Enum.sort(Enum.map(existing_event.stages, & &1.slug)) == ["final", "qualifier"]
    assert Enum.map(newcomer_event.stages, & &1.slug) == ["final"]
    assert UserEvent.get_by_user_id_and_event_id(bot.id, event.id) == nil

    assert {:ok, 0} = EventContext.enroll_all_users_for_stage(event, "final")
  end

  test "starts a single stage and records its tournament" do
    user = insert(:user, lang: "elixir")
    insert(:task_pack, name: "event-stage-pack")

    event =
      insert(:event,
        slug: "single-stage-#{System.unique_integer([:positive])}",
        stages: [
          %{
            name: "Single stage",
            slug: "single",
            status: :active,
            type: :tournament,
            playing_type: :single,
            tournament_meta: %{
              type: "swiss",
              rounds_limit: 1,
              players_limit: 2,
              task_pack_name: "event-stage-pack",
              task_provider: "task_pack",
              task_strategy: "sequential"
            }
          }
        ]
      )

    {:ok, _} =
      UserEvent.create(%{
        user_id: user.id,
        event_id: event.id,
        stages: [%{slug: "single", status: :pending}]
      })

    assert {:ok, tournament} = EventContext.start_stage_for_user(user, event.slug, "single")

    user_stage =
      user.id
      |> UserEvent.get_by_user_id_and_event_id(event.id)
      |> UserEvent.get_stage("single")

    assert user_stage.status == :started
    assert user_stage.tournament_id == tournament.id
  end

  test "rejects unsupported stages and propagates tournament creation errors" do
    user = insert(:user)

    entrance_event =
      insert(:event,
        slug: "entrance-#{System.unique_integer([:positive])}",
        stages: [
          %{name: "Entrance", slug: "entrance", status: :active, type: :entrance, playing_type: :single}
        ]
      )

    {:ok, _} =
      UserEvent.create(%{
        user_id: user.id,
        event_id: entrance_event.id,
        stages: [%{slug: "entrance", status: :pending}]
      })

    assert Event.get_stage(Event.get!(entrance_event.id), "entrance").status == :active

    assert user.id
           |> UserEvent.get_by_user_id_and_event_id(entrance_event.id)
           |> UserEvent.get_stage("entrance")
           |> Map.fetch!(:status) == :pending

    assert EventContext.start_stage_for_user(user, entrance_event.slug, "entrance") ==
             {:error, "You already passed this stage"}

    invalid_event =
      insert(:event,
        slug: "invalid-stage-#{System.unique_integer([:positive])}",
        stages: [
          %{
            name: "Invalid tournament",
            slug: "invalid",
            status: :active,
            type: :tournament,
            playing_type: :single,
            tournament_meta: %{timeout_mode: "unsupported"}
          }
        ]
      )

    {:ok, _} =
      UserEvent.create(%{
        user_id: user.id,
        event_id: invalid_event.id,
        stages: [%{slug: "invalid", status: :pending}]
      })

    assert EventContext.start_stage_for_user(user, invalid_event.slug, "invalid") ==
             {:error, "You already passed this stage"}
  end
end
