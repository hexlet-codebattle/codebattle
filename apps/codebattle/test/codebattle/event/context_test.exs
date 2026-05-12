defmodule Codebattle.Event.ContextTest do
  use Codebattle.DataCase

  alias Codebattle.Event
  alias Codebattle.Event.Context, as: EventContext
  alias Codebattle.GroupTournament

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
            "task_info_label" => "Задание выполняется в SourceCraft",
            "task_duration_label" => "30 минут на решение",
            "step1_label" => "Авторизуйся в SourceCraft через Яндекс ID"
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
end
