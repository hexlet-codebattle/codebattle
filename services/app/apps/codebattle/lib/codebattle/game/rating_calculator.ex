defmodule Codebattle.Game.RatingCalculator do
  alias Codebattle.Game.Elo
  alias Codebattle.Game.Helpers

  # skip rating changes for training, bot, solo
  def call(game = %{mode: "training"}), do: game
  def call(game = %{is_bot: true}), do: game
  def call(game = %{type: "solo"}), do: game

  # skip rating changes gave_up games
  def call(game = %{players: [player = %{result: "gave_up"}, _]}) do
    calculate_gave_up(game, player)
  end

  def call(game = %{players: [_, player = %{result: "gave_up"}]}) do
    calculate_gave_up(game, player)
  end

  def call(game = %{mode: "standard", players: [winner = %{result: "won"}, loser]}) do
    calculate(game, winner, loser)
  end

  def call(game = %{mode: "standard", players: [loser, winner = %{result: "won"}]}) do
    calculate(game, winner, loser)
  end

  def call(game), do: game

  defp calculate_gave_up(game, player) do
    Helpers.update_player(game, player.id, %{rating: player.rating - 10, rating_diff: -10})
  end

  defp calculate(game, winner, loser) do
    {winner_rating, loser_rating} = Elo.calc_elo(winner.rating, loser.rating, game.level)

    game
    |> Helpers.update_player(winner.id, %{
      rating: winner_rating,
      rating_diff: winner_rating - winner.rating
    })
    |> Helpers.update_player(loser.id, %{
      rating: loser_rating,
      rating_diff: loser_rating - loser.rating
    })
  end
end
