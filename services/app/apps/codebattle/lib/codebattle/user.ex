defmodule Codebattle.User do
  @moduledoc """
    Represents authenticatable user
  """
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.Clan
  alias Codebattle.User.SoundSettings

  @type t :: %__MODULE__{}
  @type raw_id :: String.t() | integer()

  @guest_id 0

  @subscription_types ~w(banned free premium admin)a

  @derive {Jason.Encoder,
           only: [
             :achievements,
             :avatar_url,
             :clan,
             :clan_id,
             :editor_mode,
             :editor_theme,
             :games_played,
             :github_id,
             :github_name,
             :id,
             :inserted_at,
             :is_bot,
             :is_guest,
             :lang,
             :name,
             :rank,
             :rating,
             :sound_settings,
             :subscription_type
           ]}

  schema "users" do
    has_many(:user_games, Codebattle.UserGame)
    has_many(:games, through: [:user_games, :game])

    field(:achievements, {:array, :string}, default: [])
    field(:avatar_url, :string)
    field(:auth_token, :string)
    field(:discord_avatar, :string)
    field(:discord_id, :integer)
    field(:discord_name, :string)
    field(:editor_mode, :string)
    field(:editor_theme, :string)
    field(:email, :string)
    field(:firebase_uid, :string)
    field(:github_id, :integer)
    field(:github_name, :string)
    field(:is_bot, :boolean, default: false)
    field(:lang, :string, default: "js")
    field(:clan, :string)
    field(:clan_id, :integer)
    field(:name, :string)
    field(:public_id, :binary_id)
    field(:rank, :integer, default: 5432)
    field(:rating, :integer, default: 1200)
    field(:subscription_type, Ecto.Enum, values: @subscription_types)
    field(:timezone, :string, default: "Etc/UTC")

    field(:games_played, :integer, virtual: true)
    field(:is_guest, :boolean, virtual: true, default: false)

    embeds_one(:sound_settings, SoundSettings, on_replace: :update)

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
      :rating,
      :subscription_type
    ])
    |> validate_required([:name])
  end

  def settings_changeset(user, params \\ %{}) do
    user
    |> cast(params, [:name, :lang])
    |> cast_embed(:sound_settings)
    |> unique_constraint(:name)
    |> validate_length(:name, min: 2, max: 39)
    |> assign_clan(params, user.id)
  end

  @spec build_guest() :: t()
  def build_guest do
    %__MODULE__{
      is_guest: true,
      id: @guest_id,
      name: "John Dou",
      subscription_type: "free",
      rating: 0,
      rank: 0,
      sound_settings: %SoundSettings{}
    }
  end

  @spec admin?(t()) :: boolean()
  def admin?(%__MODULE__{subscription_type: :admin}), do: true
  def admin?(_user), do: false

  @spec bot?(integer()) :: boolean()
  def bot?(user_id) when is_integer(user_id), do: user_id < 0

  @spec guest_id() :: integer()
  def guest_id(), do: @guest_id

  @spec get!(raw_id()) :: t() | no_return()
  def get!(user_id) do
    Repo.get!(__MODULE__, user_id)
  end

  @spec get(raw_id()) :: t() | nil
  def get(user_id) do
    get!(user_id)
  rescue
    _e -> nil
  end

  @spec get_users_by_ids(list(raw_id())) :: list(t())
  def get_users_by_ids(ids) do
    __MODULE__
    |> where([u], u.id in ^ids)
    |> order_by([u], {:desc, :rating})
    |> Repo.all()
  end

  defp assign_clan(changeset, %{"clan" => clan}, _user_id) when clan in ["", nil] do
    changeset
  end

  defp assign_clan(changeset, %{"clan" => clan_name}, user_id) do
    case Clan.find_or_create_by_clan(clan_name, user_id) do
      {:ok, clan} -> change(changeset, %{clan: String.trim(clan_name), clan_id: clan.id})
      {:error, reason} -> {:error, reason}
    end
  end

  defp assign_clan(changeset, _params, _user_id), do: changeset
end
