defmodule Codebattle.PlaybookTest do
  use Codebattle.DataCase

  alias Codebattle.Playbook
  alias Codebattle.Playbook.Context

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

  test "stores an editor diff when the initial editor text is absent" do
    user = insert(:user)
    task = insert(:task)
    {:ok, game} = Codebattle.Game.Context.create_game(%{players: [user], task: task, type: "solo"})
    on_exit(fn -> Codebattle.Game.GlobalSupervisor.terminate_game(game.id) end)

    state =
      Context.init_records([
        %{id: user.id, name: user.name, editor_text: nil, editor_lang: "js", check_result: %{}}
      ])

    state =
      Context.add_record(state, :update_editor_data, %{
        id: user.id,
        editor_text: "const answer = 42;",
        editor_lang: "js"
      })

    assert {:ok, playbook} = Context.store_playbook(state.records, game.id)
    assert playbook.data.count == 2
    assert Enum.any?(playbook.data.records, &(&1.type == :update_editor_data))
  end
end
