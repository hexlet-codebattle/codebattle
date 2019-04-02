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
             :guest,
             :github_id,
             :lang,
             :editor_mode,
             :editor_theme,
             :creator,
             :game_result,
             :achievements,
             :rating_diff
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
    field(:guest, :boolean, virtual: true, default: false)
    field(:is_bot, :boolean, default: false)
    field(:creator, :boolean, virtual: true, default: false)
    field(:game_result, :string, virtual: true)
    field(:achievements, {:array, :string}, default: [], null: false)
    field(:rating_diff, :integer, virtual: true)

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

  # TODO add lang validation
  # def lang_changeset(struct, params \\ %{}) do
  #   struct
  #   |> cast(params, [:lang, :editor_mode, :editor_theme])
  #   |> validate_required([:lang])
  #   |> validate_lang([:lang])
  # end

  # def validate_lang(changeset, field, options \\ []) do
  #   langs = Codebattle.Languages.meta |> Map.keys

  #   validate_change(changeset, :lang, fn _params, lang ->
  #     case String.to_existing_atom(lang) in langs do
  #       true -> []
  #       false -> [{field, options[:message] || "Unexpected URL"}]
  #     end
  #   end)
  # end
end
