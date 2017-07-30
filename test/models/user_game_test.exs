defmodule Codebattle.UserGameTest do
  use Codebattle.ModelCase

  alias CodebattleWeb.UserGame

  @valid_attrs %{game_id: 42, result: "some content", user_id: 42}
  @invalid_attrs %{}

  test "changeset with valid attributes" do
    changeset = UserGame.changeset(%UserGame{}, @valid_attrs)
    assert changeset.valid?
  end

  test "changeset with invalid attributes" do
    changeset = UserGame.changeset(%UserGame{}, @invalid_attrs)
    refute changeset.valid?
  end
end
