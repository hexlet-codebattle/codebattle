defmodule Codebattle.MiscContextsTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Bot
  alias Codebattle.Customization
  alias Codebattle.Feedback
  alias Codebattle.GroupTask
  alias Codebattle.Task

  test "formats, lists, and orders feedback entries" do
    attrs = %{
      author_name: "Alice",
      status: "Great",
      text: "Useful service",
      title_link: "https://example.test/feedback"
    }

    assert Feedback.changeset(%Feedback{}, %{}).valid? == false
    assert {:ok, feedback} = %Feedback{} |> Feedback.changeset(attrs) |> Repo.insert()
    assert Enum.map(Feedback.list_all(), & &1.id) == [feedback.id]

    assert [formatted] = Feedback.get_all()
    assert formatted.title == "Great Alice"
    assert formatted.description == "Useful service"
    assert formatted.link == attrs.title_link
    assert formatted.guid == feedback.id
    assert formatted.pubDate =~ "GMT"
  end

  test "upserts and fetches customization values" do
    key = "coverage-#{System.unique_integer([:positive])}"
    assert Customization.get(key) == nil
    refute Customization.changeset(%Customization{}, %{}).valid?

    assert {:ok, _} = Customization.upsert(key, "first")
    assert Customization.get(key) == "first"
    assert {:ok, _} = Customization.upsert(key, "second")
    assert Customization.get(key) == "second"
  end

  test "normalizes optional group task fields" do
    existing = %GroupTask{slug: "old", runner_url: "https://runner.test", time_to_solve_sec: 10}

    nil_values = GroupTask.changeset(existing, %{slug: nil, runner_url: nil})
    assert Ecto.Changeset.get_change(nil_values, :slug) == nil
    assert Ecto.Changeset.get_change(nil_values, :runner_url) == nil

    blank_url = GroupTask.changeset(%GroupTask{}, %{slug: "  SAMPLE  ", runner_url: "   ", time_to_solve_sec: 10})
    assert Ecto.Changeset.get_change(blank_url, :slug) == "sample"
    assert Ecto.Changeset.get_change(blank_url, :runner_url) == nil
  end

  test "filters public tasks, exposes admin visibility, and counts played games" do
    admin = insert(:admin)
    public = insert(:task, visibility: "public", state: "active")
    hidden = insert(:task, visibility: "hidden", state: "draft", creator_id: admin.id)
    game = insert(:game, task: public)

    assert public.id in Enum.map(Repo.all(Task.public(Task)), & &1.id)
    assert public.id in Enum.map(Task.list_visible(admin), & &1.id)
    assert hidden.id in Enum.map(Task.list_visible(admin), & &1.id)
    assert Task.get_played_count(public.id) == 1
    assert game.task_id == public.id
  end

  test "builds bot lists and rejects non-bot lookups" do
    canonical = insert(:user, is_bot: true, name: "Canonical bot")
    human = insert(:user, is_bot: false)

    assert [%{is_bot: true, lang: "ruby"}, %{is_bot: true, lang: "ruby"}] =
             Bot.Context.build_list(2, %{lang: "ruby"})

    assert Bot.Context.get(canonical.id).id == canonical.id
    assert Bot.Context.get(human.id) == nil
  end
end
