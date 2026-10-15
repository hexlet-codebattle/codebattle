defmodule Codebattle.Game.RatingCalculator do
  @moduledoc false
  alias Codebattle.Game.Elo
  alias Codebattle.Game.Helpers

  # skip rating changes for training, bot, solo
  def call(%{mode: "training"} = game), do: game
  def call(%{is_bot: true} = game), do: game
  def call(%{type: "solo"} = game), do: game

  def call(%{mode: "standard", players: [%{result: "won"} = winner, loser]} = game) do
    calculate(game, winner, loser, :win)
  end

  def call(%{mode: "standard", players: [loser, %{result: "won"} = winner]} = game) do
    calculate(game, winner, loser, :win)
  end

  def call(%{mode: "standard", players: [%{result: "timeout"} = loser, %{result: "timeout"} = winner]} = game) do
    calculate(game, winner, loser, :draw)
  end

  def call(game), do: game

  defp calculate(game, winner, loser, win_or_draw) do
    {winner_rating, loser_rating} =
      Elo.calc_elo(winner.rating, loser.rating, game.grade, win_or_draw)

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
