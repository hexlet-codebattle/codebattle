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
        :id,
        :name,
        :rating,
        :is_bot,
        :is_guest,
        :github_id,
        :github_name,
        :lang,
        :editor_mode,
        :editor_theme,
        :achievements,
        :rank,
        :games_played,
        :performance,
        :inserted_at,
        :sound_settings,
        :avatar_url,
        :is_admin
      ])
      |> Jason.Encode.map(opts)
    end
  end

  schema "users" do
    field(:name, :string)
    field(:github_name, :string)
    field(:email, :string)
    field(:github_id, :integer)
    field(:rating, :integer)
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
    field(:avatar_url, :string, virtual: true)

    embeds_one(:sound_settings, SoundSettings, on_replace: :update)

    has_many(:user_games, Codebattle.UserGame)
    has_many(:games, through: [:user_games, :game])

    timestamps()
  end

  def fill_virtual_fields(user) do
    user
    |> Map.put(:is_admin, Codebattle.User.is_admin?(user))
    |> Map.put(:avatar_url, Codebattle.User.avatar_url(user))
  end

  @doc """
  Builds a changeset based on the `struct` and `params`.
  """
  def changeset(struct, params \\ %{}) do
    struct
    |> cast(params, [
      :firebase_uid,
      :name,
      :github_name,
      :email,
      :github_id,
      :rating,
      :lang,
      :editor_mode,
      :editor_theme,
      :achievements,
      :discord_name,
      :discord_id,
      :discord_avatar,
      :auth_token
    ])
    |> validate_required([:name, :email])
  end

  def settings_changeset(model, params \\ %{}) do
    model
    |> cast(params, [:name, :lang])
    |> cast_embed(:sound_settings)
    |> unique_constraint(:name)
    |> validate_length(:name, min: 3, max: 16)
  end

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

  def avatar_url(user) do
    cond do
      user.github_id ->
        "https://avatars0.githubusercontent.com/u/#{user.github_id}"

      user.discord_id ->
        "https://cdn.discordapp.com/avatars/#{user.discord_id}/#{user.discord_avatar}.png"

      Map.get(user, :email) ->
        gravatar_url(user.email)

      true ->
        "https://avatars0.githubusercontent.com/u/35539033"
    end
  end

  def is_admin?(user) do
    user.name in @admins
  end

  def guest_id(), do: @guest_id

  defp gravatar_url(email) do
    hash = :erlang.md5(email) |> Base.encode16(case: :lower)

    "https://gravatar.com/avatar/#{hash}?d=identicon"
  end

  @spec get_user!(raw_id()) :: t() | no_return
  def get_user!(user_id) do
    __MODULE__ |> Codebattle.Repo.get!(user_id) |> fill_virtual_fields()
  end

  @spec get_users_by_ids(list(raw_id())) :: list(t())
  def get_users_by_ids(ids) do
    __MODULE__
    |> where([u], u.id in ^ids)
    |> order_by([u], {:desc, :rating})
    |> Repo.all()
    |> Enum.map(&fill_virtual_fields/1)
  end
end
