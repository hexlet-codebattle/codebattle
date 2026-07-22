defmodule Codebattle.Event.ContextTest do
  use Codebattle.DataCase
  use Oban.Testing, repo: Codebattle.Repo

  alias Codebattle.Event
  alias Codebattle.Event.Context, as: EventContext
  alias Codebattle.ExternalPlatformInvite.Context, as: InviteContext
  alias Codebattle.GroupTournament
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
      UserEvent.upsert_stages(first_event, [%{slug: "final", status: :pending, score: 10, group_tournament_score: 5}])

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

  describe "create_individual_group_tournament/2" do
    test "copies configurable fields from the parent referenced by group_tournament_meta.parent_id" do
      parent =
        insert(:group_tournament,
          description: "parent description",
          rounds_count: 3,
          round_timeout_seconds: 1800,
          include_bots: true,
          require_invitation: true,
          run_on_external_platform: true,
          template_id: "tmpl-42",
          slice_size: 8,
          slice_strategy: "rating",
          meta: %{
            "task_info_label" => "Задание выполняется в External Platform",
            "task_duration_label" => "30 минут на решение",
            "step1_label" => "Авторизуйся в External Platform через External Auth"
          }
        )

      event = insert(:event, slug: "cup")

      event_stage = %Event.Stage{
        slug: "stage-1",
        name: "Stage 1",
        type: :tournament,
        playing_type: :single,
        status: :active,
        group_tournament_meta: %{parent_id: parent.id}
      }

      assert {:ok, child} = EventContext.create_individual_group_tournament(event, event_stage)

      assert child.id != parent.id
      assert child.event_id == event.id
      assert child.state == "waiting_participants"

      # Copied verbatim from parent
      assert child.group_task_id == parent.group_task_id
      assert child.description == parent.description
      assert child.rounds_count == parent.rounds_count
      assert child.round_timeout_seconds == parent.round_timeout_seconds
      assert child.include_bots == parent.include_bots
      assert child.require_invitation == parent.require_invitation
      assert child.run_on_external_platform == parent.run_on_external_platform
      assert child.template_id == parent.template_id
      assert child.slice_size == parent.slice_size
      assert child.slice_strategy == parent.slice_strategy
      assert child.meta == parent.meta

      # Per-stage overrides
      assert child.name == parent.name
      assert child.slug == parent.slug
    end

    test "returns :missing_parent_id when stage has no parent pointer" do
      event = insert(:event)
      event_stage = %Event.Stage{group_tournament_meta: %{}}

      assert {:error, :missing_parent_id} =
               EventContext.create_individual_group_tournament(event, event_stage)
    end

    test "returns :missing_parent_id when group_tournament_meta is nil" do
      event = insert(:event)
      event_stage = %Event.Stage{group_tournament_meta: nil}

      assert {:error, :missing_parent_id} =
               EventContext.create_individual_group_tournament(event, event_stage)
    end

    test "returns parent_not_found when the referenced parent does not exist" do
      event = insert(:event)
      missing_id = 99_999_999

      event_stage = %Event.Stage{group_tournament_meta: %{parent_id: missing_id}}

      assert {:error, {:parent_not_found, ^missing_id}} =
               EventContext.create_individual_group_tournament(event, event_stage)
    end

    test "child is persisted and discoverable via Repo" do
      parent = insert(:group_tournament)
      event = insert(:event, slug: "cup-#{System.unique_integer([:positive])}")

      event_stage = %Event.Stage{
        slug: "stage-1",
        group_tournament_meta: %{parent_id: parent.id}
      }

      assert {:ok, child} = EventContext.create_individual_group_tournament(event, event_stage)
      assert Repo.get(GroupTournament, child.id)
    end
  end

  test "starts a single stage and links a player-specific group tournament" do
    user = insert(:user, lang: "elixir")
    parent = insert(:group_tournament, require_invitation: true)
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
            group_tournament_meta: %{parent_id: parent.id},
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
    assert is_integer(tournament.group_tournament_id)

    child = Repo.get!(GroupTournament, tournament.group_tournament_id)
    assert child.event_id == event.id
    assert child.id != parent.id
    assert Codebattle.GroupTournament.Context.get_player(child.id, user.id)
    assert InviteContext.get_invite(user.id, child.id)

    user_stage =
      user.id
      |> UserEvent.get_by_user_id_and_event_id(event.id)
      |> UserEvent.get_stage("single")

    assert user_stage.status == :started
    assert user_stage.tournament_id == tournament.id
    assert user_stage.group_tournament_id == child.id
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
