defmodule Codebattle.User.Stats do
  @moduledoc """
    Find user game statistic
  """

  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User
  alias Codebattle.UserGame

  @default_game_stats %{"won" => 0, "lost" => 0, "gave_up" => 0}

  def get_game_stats(user_id) do
    user_games_stats =
      Repo.all(
        from(ug in UserGame,
          select: %{result: ug.result, lang: ug.lang, count: count(ug.id)},
          where: ug.user_id == ^user_id,
          where: ug.result in ["won", "lost", "gave_up"],
          group_by: [ug.result, ug.lang]
        )
      )

    games_stats =
      user_games_stats
      |> Enum.group_by(& &1.result, & &1.count)
      |> Map.new(fn {k, v} -> {k, Enum.sum(v)} end)
      |> Map.merge(@default_game_stats, fn _k, v1, _v2 -> v1 end)

    %{games: games_stats, all: user_games_stats}
  end

  @spec get_top_rivals(integer(), integer()) :: [map()]
  def get_top_rivals(user_id, limit \\ 3) do
    Repo.all(
      from(ugs in UserGame,
        join: ugo in UserGame,
        on: ugo.game_id == ugs.game_id and ugo.user_id != ugs.user_id,
        join: u in User,
        on: u.id == ugo.user_id,
        where: ugs.user_id == ^user_id,
        where: ugs.result in ["won", "lost", "gave_up", "timeout"],
        where: ugo.result in ["won", "lost", "gave_up", "timeout"],
        where: u.is_bot == false,
        group_by: [u.id, u.name, u.clan],
        order_by: [
          desc: count(ugo.id),
          desc: fragment("SUM(CASE WHEN ? = 'won' THEN 1 ELSE 0 END)", ugs.result),
          asc: u.id
        ],
        select: %{
          id: u.id,
          name: u.name,
          clan: u.clan,
          games_count: count(ugo.id),
          wins_count: fragment("SUM(CASE WHEN ? = 'won' THEN 1 ELSE 0 END)::integer", ugs.result),
          losses_count: fragment("SUM(CASE WHEN ? IN ('lost', 'gave_up') THEN 1 ELSE 0 END)::integer", ugs.result),
          timeouts_count: fragment("SUM(CASE WHEN ? = 'timeout' THEN 1 ELSE 0 END)::integer", ugs.result)
        },
        limit: ^limit
      )
    )
  end
end
