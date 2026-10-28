defmodule Codebattle.Game.BotDetection.ReviewTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Game.BotDetection
  alias Codebattle.Game.BotDetection.Analysis
  alias Codebattle.Game.BotDetection.Review

  test "only moderators can append validated decisions; rescoring preserves decisions" do
    user = insert(:user)
    moderator = insert(:user, subscription_type: :moderator)
    game = insert(:game)
    analysis = %Analysis{game_id: game.id, user_id: user.id, score: 8, level: :medium}
    assert {:ok, _} = BotDetection.persist_analyses([analysis])
    attrs = %{"outcome" => "legitimate", "reason" => "Vim command verified in replay", "replay_offset_ms" => 1000}
    assert {:error, :forbidden} = Review.record(user, game.id, user.id, attrs)
    assert {:error, _} = Review.record(moderator, game.id, user.id, Map.put(attrs, "reason", ""))
    assert {:ok, review} = Review.record(moderator, game.id, user.id, attrs)
    assert review.reviewer_id == moderator.id
    assert review.report_snapshot.score == 8
    assert {:ok, _} = BotDetection.persist_analyses([%{analysis | score: 0, level: :none}])
    assert [stored] = Review.list(game.id)
    assert stored.report_snapshot["score"] == 8
    assert {:ok, _} = Review.record(moderator, game.id, user.id, Map.put(attrs, "outcome", "inconclusive"))
    assert length(Review.list(game.id)) == 2
  end
end
