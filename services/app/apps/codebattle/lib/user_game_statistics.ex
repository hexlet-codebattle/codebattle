defmodule Codebattle.UserGameStatistics do
  use Ecto.Schema
  import Ecto.Changeset

  schema "user_game_statistics" do
    field :total_games, :integer
    field :total_wins, :integer
    field :total_losses, :integer
    field :versus_bot_games, :integer
    field :versus_human_games, :integer

    belongs_to :user, Codebattle.User

    timestamps(updated_at: :updated_at)
  end

  def changeset(stat, attrs) do
    stat
    |> cast(attrs, [
      :user_id,
      :total_games,
      :total_wins,
      :total_losses,
      :versus_bot_games,
      :versus_human_games
    ])
    |> validate_required([:user_id])
    |> unique_constraint(:user_id)
  end
end