defmodule Codebattle.User do
  @moduledoc """
    Represents authenticatable user
  """
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo

  @type t :: %__MODULE__{}
  @type raw_id :: String.t() | integer()

  @admins Application.compile_env(:codebattle, :admins)
  @guest_id 0

  defmodule SoundSettings do
    use Ecto.Schema

    import Ecto.Changeset
    @primary_key false

    @derive {Jason.Encoder, only: [:level, :type]}

    embedded_schema do
      field(:level, :integer, default: 7)
      field(:type, :string, default: "dendy")
    end

    def changeset(struct, params) do
      cast(struct, params, [:level, :type])
    end
  end

  defimpl Jason.Encoder, for: Codebattle.User do
    def encode(user, opts) do
      user
      |> Map.take([
        :achievements,
        :avatar_url,
        :editor_mode,
        :editor_theme,
        :games_played,
        :github_id,
        :github_name,
        :id,
        :inserted_at,
        :is_admin,
        :is_bot,
        :is_guest,
        :lang,
        :name,
        :performance,
        :rank,
        :rating,
        :sound_settings
      ])
      |> Jason.Encode.map(opts)
    end
  end

  schema "users" do
    field(:name, :string)
    field(:github_name, :string)
    field(:email, :string)
    field(:github_id, :integer)
    field(:rating, :integer, default: 1200)
    field(:lang, :string, default: "js")
    field(:editor_mode, :string)
    field(:editor_theme, :string)
    field(:public_id, :binary_id)
    field(:is_bot, :boolean, default: false)
    field(:rank, :integer, default: 5432)
    field(:achievements, {:array, :string}, default: [])
    field(:discord_name, :string)
    field(:discord_id, :integer)
    field(:discord_avatar, :string)
    field(:firebase_uid, :string)
    field(:auth_token, :string)
    # level range: 0..10, types: ["standard", "silent"]

    field(:games_played, :integer, virtual: true)
    field(:performance, :integer, virtual: true)
    field(:is_guest, :boolean, virtual: true, default: false)
    field(:avatar_url, :string)

    embeds_one(:sound_settings, SoundSettings, on_replace: :update)

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
      :achievements,
      :auth_token,
      :avatar_url,
      :discord_avatar,
      :discord_id,
      :discord_name,
      :editor_mode,
      :editor_theme,
      :email,
      :firebase_uid,
      :github_id,
      :github_name,
      :lang,
      :name,
      :rating
    ])
    |> validate_required([:name])
  end

  def settings_changeset(model, params \\ %{}) do
    model
    |> cast(params, [:name, :lang])
    |> cast_embed(:sound_settings)
    |> unique_constraint(:name)
    |> validate_length(:name, min: 3, max: 16)
  end

  @spec create_guest :: t()
  def create_guest() do
    %__MODULE__{
      is_guest: true,
      id: @guest_id,
      name: "John Dou",
      rating: 0,
      rank: 0,
      sound_settings: %SoundSettings{}
    }
  end

  @spec admin?(t()) :: boolean()
  def admin?(user) do
    user.name in @admins
  end

  @spec bot?(integer() | t()) :: boolean()
  def bot?(user_id) when is_integer(user_id), do: user_id < 0
  def bot?(user = %__MODULE__{}), do: user.is_bot

  def guest_id(), do: @guest_id

  @spec get_user!(raw_id()) :: t() | no_return
  def get_user!(user_id) do
    __MODULE__ |> Codebattle.Repo.get!(user_id)
  end

  @spec get_users_by_ids(list(raw_id())) :: list(t())
  def get_users_by_ids(ids) do
    __MODULE__
    |> where([u], u.id in ^ids)
    |> order_by([u], {:desc, :rating})
    |> Repo.all()
  end
end
