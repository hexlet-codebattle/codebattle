defmodule Codebattle.User do
  @moduledoc """
    Represents authenticatable user
  """
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Poison.Encoder,
           only: [
             :id,
             :name,
             :rating,
             :is_bot,
             :is_anonymous,
             :guest,
             :github_id,
             :lang,
             :editor_mode,
             :editor_theme,
             :achievements,
             :rank,
             :games_played,
             :performance
           ]}

  schema "users" do
    field(:name, :string)
    field(:github_name, :string)
    field(:email, :string)
    field(:github_id, :integer)
    field(:rating, :integer)
    field(:lang, :string)
    field(:editor_mode, :string)
    field(:editor_theme, :string)
    field(:public_id, :binary_id)
    field(:is_bot, :boolean, default: false)
    field(:is_anonymous, :boolean, default: false)
    field(:guest, :boolean, virtual: true, default: false)
    field(:rank, :integer, virtual: true)
    field(:games_played, :integer, virtual: true)
    field(:performance, :integer, virtual: true)
    field(:achievements, {:array, :string}, default: [], null: false)

    has_many(:user_games, Codebattle.UserGame)
    has_many(:games, through: [:user_games, :game])

    timestamps()
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :name,
      :github_name,
      :email,
      :github_id,
      :rating,
      :lang,
      :editor_mode,
      :editor_theme,
      :is_anonymous,
      :achievements
    ])
    |> validate_required([:name, :email, :github_id])
  end

  def settings_changeset(model, params \\ %{}) do
    model
    |> cast(params, [:name], [])
    |> unique_constraint(:name)
    |> validate_length(:name, min: 3, max: 16)
  end
end
