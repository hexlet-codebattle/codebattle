defmodule Codebattle.PlaybookTest do
  use Codebattle.DataCase

  alias Codebattle.Playbook

  test "validates embedded replay data and exposes lookup helpers" do
    task = insert(:task)
    game = insert(:game, task: task)

    attrs = %{
      game_id: game.id,
      task_id: task.id,
      winner_id: 10,
      winner_lang: "elixir",
      solution_type: "complete",
      approved: true,
      data: %{players: [%{id: 10}], records: [%{type: "game_over"}], count: 1}
    }

    changeset = Playbook.changeset(%Playbook{}, attrs)
    assert changeset.valid?
    playbook = Repo.insert!(changeset)
    assert playbook.data.count == 1
    assert Playbook.get!(playbook.id).id == playbook.id
    assert Playbook.get(playbook.id).id == playbook.id
    assert Playbook.get(-1) == nil
    assert Playbook.get_by!(game_id: game.id).id == playbook.id
    assert Playbook.get_by(game_id: -1) == nil

    invalid = Playbook.changeset(%Playbook{}, %{attrs | solution_type: "unsupported", data: nil})
    refute invalid.valid?
    assert Keyword.has_key?(invalid.errors, :solution_type)
    assert Keyword.has_key?(invalid.errors, :data)
  end
end
