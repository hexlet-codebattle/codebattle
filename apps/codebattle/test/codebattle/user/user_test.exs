defmodule Codebattle.User.ModelTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Season
  alias Codebattle.SeasonResult
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

  test "recognizes administrative subscription types" do
    admin = %User{subscription_type: :admin}
    moderator = %User{subscription_type: :moderator}
    free = %User{subscription_type: :free}

    assert User.admin?(admin)
    refute User.admin?(free)
    assert User.moderator?(moderator)
    refute User.moderator?(free)
    assert User.admin_or_moderator?(admin)
    assert User.admin_or_moderator?(moderator)
    refute User.admin_or_moderator?(free)
    assert User.guest_id() == 0
    assert FunWithFlags.Actor.id(admin) == "user:"
  end

  test "fetches, searches, and ranks non-bot users" do
    user = insert(:user, name: "Coverage Search User", rank: 2, is_bot: false)
    _bot = insert(:user, name: "Coverage Search Bot", rank: 1, is_bot: true)

    archived =
      insert(:user,
        name: "Coverage Search Archived",
        rank: 3,
        is_bot: false,
        archived_at: DateTime.utc_now(:second)
      )

    assert User.get!(user.id).id == user.id
    assert User.get(user.id).id == user.id
    assert User.get(-1) == nil
    assert {2, user.id} in User.get_user_places_and_ids()
    refute {3, archived.id} in User.get_user_places_and_ids()
    assert Enum.map(User.search_users("Search User"), & &1.id) == [user.id]
    assert User.search_users("Search Archived") == []
    assert User.get_nearby_users(%{rank: nil}) == []
    assert User.get_nearby_users(%{is_guest: true}) == []
  end

  test "loads nearby users from the current season and discards deleted accounts" do
    today = Date.utc_today()

    {:ok, season} =
      Season.create(%{
        name: "Nearby season",
        year: today.year,
        starts_at: Date.add(today, -1),
        ends_at: Date.add(today, 1)
      })

    target = insert(:user, rank: 2)
    neighbor = insert(:user, rank: 1)

    for {user_id, place} <- [{target.id, 2}, {neighbor.id, 1}] do
      %SeasonResult{}
      |> SeasonResult.changeset(%{season_id: season.id, user_id: user_id, place: place})
      |> Repo.insert!()
    end

    assert Enum.map(User.get_nearby_users(target, 2), & &1.id) == [neighbor.id]
  end

  test "updates account identity, subscription, and clan" do
    user = insert(:user, auth_token: nil, github_id: 1, discord_id: 2)
    clan = insert(:clan)

    assert User.can_unlink_social?(user)
    refute User.can_unlink_social?(%User{})

    assert {:ok, with_token} = User.reset_auth_token(user.id)
    assert is_binary(with_token.auth_token)
    assert {:ok, without_token} = User.delete_auth_token(user.id)
    assert without_token.auth_token == nil

    assert {:ok, renamed} = User.update_name(user.id, "  Renamed User  ")
    assert renamed.name == "Renamed User"
    assert {:ok, premium} = User.update_subscription_type(user.id, :premium)
    assert premium.subscription_type == :premium
    assert {:ok, joined} = User.update_clan(user.id, clan.id)
    assert {joined.clan_id, joined.clan} == {clan.id, clan.name}
    assert {:ok, left} = User.update_clan(user.id, nil)
    assert {left.clan_id, left.clan} == {nil, nil}

    assert Ecto.Changeset.get_field(User.changeset(joined, %{clan: nil}), :clan) == nil
    assert Ecto.Changeset.get_field(User.changeset(joined, %{"clan" => ""}), :clan) == nil
  end

  test "creates and verifies a password hash" do
    user = insert(:user, name: "Password User")

    assert {1, nil} = User.create_password_hash_by_id(user.id, "secret-password")
    assert User.authenticate(user.name, "secret-password").id == user.id
    assert User.authenticate(user.name, "wrong") == nil
    assert User.authenticate("missing-user", "secret-password") == nil
    assert User.authenticate(user.name, nil) == nil
  end
end
