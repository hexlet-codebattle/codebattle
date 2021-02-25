defmodule Codebattle.CheateCheckTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.CheateCheck

  @copy_paste_solution "copy/paste"

  @copy_paste_playbook_data %{
    players: [%{id: 2, total_time_ms: 5_000}],
    solution_type: "complete",
    records: [
      %{"type" => "init", "id" => 2, "editor_text" => "", "editor_lang" => "ruby"},
      %{
        "diff" => %{"delta" => [%{"insert" => "copy/paste"}], "next_lang" => "ruby", "time" => 20},
        "type" => "update_editor_data",
        "id" => 2
      },
      %{"type" => "game_over", "id" => 2, "lang" => "ruby"}
    ]
  }

  @success_solution "slow solution"

  @success_playbook_data %{
    players: [%{id: 2, total_time_ms: 1_000_000}],
    solution_type: "complete",
    records: [
      %{"type" => "init", "id" => 2, "editor_text" => "", "editor_lang" => "ruby"},
      %{
        "diff" => %{"delta" => [%{"insert" => "s"}], "next_lang" => "ruby", "time" => 20},
        "type" => "update_editor_data",
        "id" => 2
      },
      %{
        "diff" => %{
          "delta" => [%{"retain" => 1}, %{"insert" => "l"}],
          "next_lang" => "ruby",
          "time" => 20
        },
        "type" => "update_editor_data",
        "id" => 2
      },
      %{
        "diff" => %{
          "delta" => [%{"retain" => 2}, %{"insert" => "o"}],
          "next_lang" => "ruby",
          "time" => 20
        },
        "type" => "update_editor_data",
        "id" => 2
      },
      %{
        "diff" => %{
          "delta" => [%{"retain" => 3}, %{"insert" => "w"}],
          "next_lang" => "ruby",
          "time" => 20
        },
        "type" => "update_editor_data",
        "id" => 2
      },
      %{
        "diff" => %{
          "delta" => [%{"retain" => 4}, %{"insert" => " "}],
          "next_lang" => "ruby",
          "time" => 20
        },
        "type" => "update_editor_data",
        "id" => 2
      },
      %{
        "diff" => %{
          "delta" => [%{"retain" => 5}, %{"insert" => "solution"}],
          "next_lang" => "ruby",
          "time" => 20
        },
        "type" => "update_editor_data",
        "id" => 2
      },
      %{"type" => "game_over", "id" => 2, "lang" => "ruby"}
    ]
  }

  test "test checking copy/paste solution" do
    playbook =
      insert(:playbook,
        data: @copy_paste_playbook_data,
        winner_id: 2,
        winner_lang: "ruby",
        solution_type: "complete"
      )

    assert {:failure, "copy/paste"} == CheateCheck.call(playbook, @copy_paste_solution)
  end

  test "test checking valid solution" do
    playbook =
      insert(:playbook,
        data: @success_playbook_data,
        winner_id: 2,
        winner_lang: "ruby",
        solution_type: "complete"
      )

    assert :ok == CheateCheck.call(playbook, @success_solution)
  end

  test "test checking incomplete solution" do
    playbook = insert(:playbook, solution_type: "incomplete")

    assert {:error, "incomplete solution"} == CheateCheck.call(playbook, "")
  end
end
