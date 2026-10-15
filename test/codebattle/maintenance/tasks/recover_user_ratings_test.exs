defmodule Codebattle.Maintenance.Tasks.RecoverUserRatingsTest do
  use CodebattleWeb.ConnCase, async: false

  alias Codebattle.Maintenance.Tasks.RecoverUserRatings
  alias Codebattle.Repo
  alias Codebattle.User

  test "builds a recovery plan from the first suspicious drop onward" do
    user = insert(:user, rating: 1)
    user_id = user.id

    insert(:user_game,
      user: user,
      game: insert(:game),
      rating: 1172,
      rating_diff: 0,
      inserted_at: ~N[2026-03-10 23:34:44]
    )

    insert(:user_game,
      user: user,
      game: insert(:game),
      rating: 0,
      rating_diff: -1172,
      inserted_at: ~N[2026-03-11 00:14:01]
    )

    insert(:user_game,
      user: user,
      game: insert(:game),
      rating: 2,
      rating_diff: 2,
      inserted_at: ~N[2026-03-12 00:14:01]
    )

    assert [
             %{
               user_id: ^user_id,
               current_rating: 1,
               recovered_rating: 2,
               baseline_rating: 1172,
               source_game_id: _,
               games_count: 2,
               total_rating_diff: -1170
             }
           ] = RecoverUserRatings.plan()
  end

  test "does not build a plan for users without a suspicious drop" do
    user = insert(:user, rating: 42)

    insert(:user_game,
      user: user,
      game: insert(:game),
      rating: 42,
      rating_diff: -1158,
      inserted_at: ~N[2026-03-11 00:14:01]
    )

    assert [] = RecoverUserRatings.plan(user_ids: [user.id])
  end

  test "recovers the rating using recomputed value" do
    user = insert(:user, rating: 0)
    user_id = user.id

    insert(:user_game,
      user: user,
      game: insert(:game),
      rating: 1172,
      rating_diff: 0,
      inserted_at: ~N[2026-03-10 23:34:44]
    )

    insert(:user_game,
      user: user,
      game: insert(:game),
      rating: 0,
      rating_diff: -1172,
      inserted_at: ~N[2026-03-11 00:14:01]
    )

    insert(:user_game,
      user: user,
      game: insert(:game),
      rating: 2,
      rating_diff: 2,
      inserted_at: ~N[2026-03-12 00:14:01]
    )

    assert [%{user_id: ^user_id, recovered_rating: 2, baseline_rating: 1172}] =
             RecoverUserRatings.recover(user_ids: [user_id])

    assert %{rating: 2} = Repo.get!(User, user_id)
  end
end
