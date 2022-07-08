defmodule Codebattle.Game.RatingCalculator do
  alias Codebattle.Game.Elo
  alias Codebattle.Game.Helpers

  # skip rating changes for training, bot, solo
  def call(%{mode: "training"} = game), do: game
  def call(%{is_bot: true} = game), do: game
  def call(%{type: "solo"} = game), do: game

  # skip rating changes gave_up games
  def call(%{players: [%{result: "gave_up"} = player, _]} = game) do
    calculate_gave_up(game, player)
  end

  def call(%{players: [_, %{result: "gave_up"} = player]} = game) do
    calculate_gave_up(game, player)
  end

  def call(%{mode: "standard", players: [%{result: "won"} = winner, loser]} = game) do
    calculate(game, winner, loser)
  end

  def call(%{mode: "standard", players: [loser, %{result: "won"} = winner]} = game) do
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
