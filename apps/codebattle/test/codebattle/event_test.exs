defmodule Codebattle.EventTest do
  use Codebattle.DataCase

  alias Codebattle.Event

  test "creates, queries, updates, and deletes events with embedded stages" do
    suffix = System.unique_integer([:positive])

    attrs = %{
      slug: "coverage-event-#{suffix}",
      type: "public",
      title: "Coverage Event",
      description: "An event covered through its public API",
      stages: [
        %{
          name: "Qualification",
          slug: "qualification",
          status: :active,
          type: :tournament,
          playing_type: :global
        }
      ]
    }

    assert {:ok, event} = Event.create(attrs)
    assert Event.get!(event.id).id == event.id
    assert Event.get(event.id).id == event.id
    assert Event.get_by_slug!(String.upcase(event.slug)).id == event.id
    assert Event.get_by_slug(event.slug).id == event.id
    assert Enum.map(Event.get_all(), & &1.id) == [event.id]
    assert Enum.map(Event.get_public(), & &1.id) == [event.id]
    assert Event.get_stage(event, "qualification").name == "Qualification"
    assert Event.types() == ["public", "private"]

    assert {:ok, updated} = Event.update(event, %{title: "Updated Event"})
    assert updated.title == "Updated Event"
    assert {:ok, deleted} = Event.delete(updated)
    assert deleted.id == event.id
    assert Event.get(event.id) == nil
  end
end
