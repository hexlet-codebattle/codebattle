defmodule Codebattle.User.RankUpdate do
  @moduledoc """
  Module for recalculation and update in db users rank for all users
  This one is legacy, now we are using points in graded tournaments
  """

  alias Codebattle.Repo

  def call do
    sql = """
      UPDATE users
      SET rank=subquery.rank
      FROM (
          SELECT
            rating,
            id,
            DENSE_RANK() OVER (ORDER BY rating DESC) as rank
          FROM
            users
      ) AS subquery
      WHERE users.id=subquery.id;
    """

    Ecto.Adapters.SQL.query!(Repo, sql)
  end
end
