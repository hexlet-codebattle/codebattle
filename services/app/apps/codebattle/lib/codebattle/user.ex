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
    field(:auth_token, :string)
    field(:avatar_url, :string)
    field(:clan, :string)
    field(:clan_id, :integer)
    field(:collab_logo, :string)
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
    |> unique_constraint(:name)
    |> validate_required([:name])
    |> validate_length(:name, min: 2, max: 39)
    |> assign_clan(params, 1)
  end

  def settings_changeset(user, params \\ %{}) do
    user
    |> cast(params, [:name, :lang])
    |> cast_embed(:sound_settings)
    |> unique_constraint(:name)
    |> validate_length(:name, min: 2, max: 39)
    |> assign_clan(params, user.id)
  end

  def token_changeset(user, params \\ %{}) do
    user
    |> cast(params, [:auth_token, :name, :clan])
    |> unique_constraint(:name)
    |> validate_length(:name, min: 2, max: 39)
    |> assign_clan(params, user.id)
  end

  @spec build_guest() :: t()
  def build_guest do
    %__MODULE__{
      is_guest: true,
      id: @guest_id,
      name: "John Doe",
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

  def search_users(query) do
    __MODULE__
    |> where([u], u.is_bot == false)
    |> where([u], fragment("? ilike ?", u.name, ^"#{query}%"))
    |> limit(20)
    |> order_by([u], {:desc, :updated_at})
    |> Repo.all()
  end

  def search_without_auth do
    __MODULE__
    |> where([u], fragment("length(?) < 24", u.auth_token))
    |> order_by([u], {:desc, :updated_at})
    |> limit(40)
    |> Repo.all()
  end

  def reset_auth_token(user_id) do
    user_id
    |> get!()
    |> changeset(%{auth_token: generate_new_token()})
    |> Repo.update()
  end

  def update_subscription_type(user_id, type) do
    user_id
    |> get!()
    |> changeset(%{subscription_type: type})
    |> Repo.update()
  end

  def subscription_types, do: @subscription_types

  defp assign_clan(changeset, %{:clan => clan}, _user_id) when clan in ["", nil], do: changeset
  defp assign_clan(changeset, %{"clan" => clan}, _user_id) when clan in ["", nil], do: changeset

  # nil for new token users, clan will be managed by admin
  defp assign_clan(changeset, params, nil), do: assign_clan(changeset, params, 1)

  defp assign_clan(changeset, %{clan: clan_name}, user_id),
    do: find_or_create_by_clan(changeset, clan_name, user_id)

  defp assign_clan(changeset, %{"clan" => clan_name}, user_id),
    do: find_or_create_by_clan(changeset, clan_name, user_id)

  defp assign_clan(changeset, _params, _user_id), do: changeset

  def find_or_create_by_clan(changeset, clan_name, user_id) do
    case Clan.find_or_create_by_clan(clan_name, user_id) do
      {:ok, clan} -> change(changeset, %{clan: clan.name, clan_id: clan.id})
      {:error, reason} -> add_error(changeset, :clan, inspect(reason))
    end
  end

  defp generate_new_token do
    42 |> :crypto.strong_rand_bytes() |> Base.encode64()
  end
end
