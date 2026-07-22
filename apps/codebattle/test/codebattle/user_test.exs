defmodule Codebattle.UserTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.User

  describe ".search_without_auth/0" do
    test "returns only users without auth token in auth link" do
      no_token_user = insert(:user, auth_token: nil)
      empty_token_user = insert(:user, auth_token: "")
      spaces_token_user = insert(:user, auth_token: "   ")
      token_user = insert(:user, auth_token: "token-present")

      result_ids = Enum.map(User.search_without_auth(), & &1.id)

      assert no_token_user.id in result_ids
      assert empty_token_user.id in result_ids
      assert spaces_token_user.id in result_ids
      refute token_user.id in result_ids
    end
  end

  test "uses the empty nearby-user fallback when no season exists" do
    Repo.delete_all(Codebattle.Season)
    Codebattle.SeasonCache.invalidate()

    user = insert(:user, rank: 1)
    assert User.get_nearby_users(user) == []
  end

  test "adds a user changeset error when a clan cannot be created" do
    user = insert(:user)
    changeset = Ecto.Changeset.change(user)

    invalid = User.find_or_create_by_clan(changeset, "", user.id)
    assert {message, _} = invalid.errors[:clan]
    assert message =~ "changeset"
  end
end
