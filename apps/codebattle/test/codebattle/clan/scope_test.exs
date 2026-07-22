defmodule Codebattle.Clan.ScopeTest do
  use Codebattle.DataCase, async: true

  alias Codebattle.Clan.Scope
  alias Codebattle.Repo

  test "builds the clan leaderboard query" do
    {sql, _params} = Repo.to_sql(:all, Scope.by_clan())

    assert sql =~ ~s(LEFT OUTER JOIN "users")
    assert sql =~ "GROUP BY"
    assert sql =~ "ORDER BY"
  end

  test "builds player leaderboard queries with optional clan filtering" do
    {all_sql, all_params} = Repo.to_sql(:all, Scope.by_player())
    {clan_sql, clan_params} = Repo.to_sql(:all, Scope.by_player_clan(42))

    assert all_sql =~ ~s(INNER JOIN "users")
    assert all_params == []
    assert clan_sql =~ ~s(c0."id" = $1)
    assert clan_params == [42]
  end
end
