defmodule Codebattle.Game.PlayerTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.CodeCheck
  alias Codebattle.Game.Player
  alias Codebattle.Tournament
  alias Codebattle.User
  alias Codebattle.UserGame

  test "validates player result values" do
    assert Player.changeset(%Player{}, %{result: "won"}).valid?
    refute Player.changeset(%Player{}, %{result: "unknown"}).valid?
  end

  test "builds a player from a user-game association and applies overrides" do
    user = insert(:user, lang: nil, style_lang: nil, db_type: nil, rating: 1400)
    user_game = %UserGame{user: user, creator: true, result: "won", rating: nil, rating_diff: 5}

    player = Player.build(user_game, %{rating_diff: 9})

    assert player.id == user.id
    assert player.rating == 1400
    assert player.rating_diff == 9
    assert player.creator
    assert player.result == "won"
    assert player.lang == Application.fetch_env!(:codebattle, :default_lang_slug)
    assert player.style_lang == Application.fetch_env!(:codebattle, :default_style_lang_slug)
    assert player.db_type == Application.fetch_env!(:codebattle, :default_db_type_slug)

    assert %Player{id: nil, rating: 1200} = Player.build(%UserGame{user: nil})
  end

  test "builds from tournament and game players with optional tasks" do
    tournament_player = %Tournament.Player{
      id: 7,
      name: "participant",
      state: "banned",
      lang: "js",
      style_lang: "css",
      db_type: "postgresql",
      rating: nil
    }

    built = Player.build(tournament_player)
    assert built.id == 7
    assert built.is_banned
    assert built.rating == 1200

    rebuilt = Player.build(%{built | playbook_id: 42}, %{name: "override"})
    assert rebuilt.playbook_id == 42
    assert rebuilt.name == "override"

    task = insert(:task)
    with_task = Player.build(rebuilt, %{task: task})
    assert with_task.editor_lang == "js"
    assert with_task.editor_text =~ "solution"
    assert %CodeCheck.Result{} = with_task.check_result
  end

  test "builds users with algorithm, SQL, and CSS editor settings" do
    user = insert(:user, lang: "js", style_lang: "sass", db_type: "mysql")
    algorithm_task = insert(:task)

    assert %Player{id: nil} = Player.build(%User{})

    algorithm = Player.build(user, %{task: algorithm_task})
    assert algorithm.editor_lang == "js"
    assert %CodeCheck.Result{} = algorithm.check_result

    sql = Player.build(user, %{task: %{type: "sql"}})
    assert sql.editor_lang == "mysql"
    assert sql.editor_text == "SELECT solution FROM Solution;"
    assert %CodeCheck.SqlResult{} = sql.check_result

    css = Player.build(user, %{task: %{type: "css"}})
    assert css.editor_lang == "sass"
    assert css.editor_text =~ "background-color"
    assert %CodeCheck.CssResult{} = css.check_result
  end
end
