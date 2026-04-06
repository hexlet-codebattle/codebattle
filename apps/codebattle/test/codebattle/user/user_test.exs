defmodule Codebattle.User.ModelTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.User

  test "generic changeset does not accept rating updates" do
    user = insert(:user, rating: 1200)

    changeset = User.changeset(user, %{rating: 0, name: user.name})

    refute Map.has_key?(changeset.changes, :rating)
  end

  test "rating changeset requires non-negative rating" do
    user = insert(:user, rating: 1200)

    assert %{valid?: false, errors: [rating: {"must be greater than or equal to %{number}", _}]} =
             User.rating_changeset(user, %{rating: -1})
  end

  test "guest user defaults to base rating" do
    assert %{is_guest: true, rating: 1200} = User.build_guest()
  end
end
