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
end
