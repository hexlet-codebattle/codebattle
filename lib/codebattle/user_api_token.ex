defmodule Codebattle.UserApiToken do
  @moduledoc """
  Personal API token for the public API (`/public_api/v1`).

  Modeled on `Codebattle.UserSession`: only the SHA-256 of the token is stored, the raw
  token is shown to the user once. Tokens die with the user: banned or archived users
  can't authenticate, and all tokens are revoked on password change and archiving.
  """

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User

  @type t :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :id

  @scopes ~w(read games:write tournaments:write)
  @write_scopes ~w(games:write tournaments:write)
  @expiry_days [30, 90, 365]
  @max_active_tokens 10
  @touch_interval_seconds 300
  @prefix "cbp_"

  schema "user_api_tokens" do
    belongs_to(:user, User)

    field(:name, :string)
    field(:token_hash, :binary)
    field(:token_prefix, :string)
    field(:scopes, {:array, :string}, default: ["read"])
    field(:last_used_at, :utc_datetime)
    field(:expires_at, :utc_datetime)
    field(:revoked_at, :utc_datetime)

    timestamps()
  end

  def scopes, do: @scopes

  @doc "Write scopes need an account older than `:public_api_write_min_account_age_days`."
  def can_use_scope?(%User{} = user, scope) when scope in @write_scopes do
    min_age_days = Application.get_env(:codebattle, :public_api_write_min_account_age_days, 7)

    User.admin_or_moderator?(user) ||
      NaiveDateTime.diff(NaiveDateTime.utc_now(), user.inserted_at, :day) >= min_age_days
  end

  def can_use_scope?(%User{}, scope), do: scope in @scopes

  @spec create(User.t(), map()) :: {:ok, t(), String.t()} | {:error, Ecto.Changeset.t() | atom()}
  def create(%User{} = user, attrs) do
    scopes = attrs |> get_attr(:scopes, ["read"]) |> List.wrap() |> Enum.uniq()
    expires_at = attrs |> get_attr(:expires_in_days, 90) |> expires_at()

    with :ok <- check_allowed(user, scopes, expires_at) do
      token = @prefix <> Base.url_encode64(:crypto.strong_rand_bytes(32), padding: false)

      %__MODULE__{}
      |> cast(
        %{
          user_id: user.id,
          name: get_attr(attrs, :name, nil),
          scopes: scopes,
          token_hash: hash(token),
          token_prefix: String.slice(token, 0, 12),
          expires_at: expires_at
        },
        [:user_id, :name, :scopes, :token_hash, :token_prefix, :expires_at]
      )
      |> validate_required([:user_id, :name, :token_hash, :token_prefix])
      |> validate_length(:name, min: 1, max: 64)
      |> validate_subset(:scopes, @scopes)
      |> validate_length(:scopes, min: 1)
      |> Repo.insert()
      |> case do
        {:ok, record} -> {:ok, record, token}
        {:error, changeset} -> {:error, changeset}
      end
    end
  end

  defp check_allowed(user, scopes, expires_at) do
    cond do
      user.is_guest or not User.active?(user) -> {:error, :not_allowed}
      active_count(user.id) >= @max_active_tokens -> {:error, :too_many_tokens}
      not Enum.all?(scopes, &can_use_scope?(user, &1)) -> {:error, :scope_not_allowed}
      is_nil(expires_at) and Enum.any?(scopes, &(&1 in @write_scopes)) -> {:error, :write_tokens_must_expire}
      true -> :ok
    end
  end

  @doc "Returns the token with its user preloaded, or nil for unknown, expired, revoked or dead users."
  def get_active_by_token(@prefix <> _rest = token) do
    now = now()

    __MODULE__
    |> join(:inner, [t], u in assoc(t, :user))
    |> where([t], t.token_hash == ^hash(token) and is_nil(t.revoked_at))
    |> where([t], is_nil(t.expires_at) or t.expires_at > ^now)
    |> where([_t, u], is_nil(u.archived_at) and u.subscription_type != :banned)
    |> preload(:user)
    |> Repo.one()
    |> touch(now)
  end

  def get_active_by_token(_token), do: nil

  def list_active(user_id) do
    now = now()

    __MODULE__
    |> where([t], t.user_id == ^user_id and is_nil(t.revoked_at))
    |> where([t], is_nil(t.expires_at) or t.expires_at > ^now)
    |> order_by([t], desc: t.inserted_at)
    |> Repo.all()
  end

  def revoke_for_user(user_id, id) do
    with {:ok, id} <- Ecto.UUID.cast(id),
         %__MODULE__{revoked_at: nil} = token <- Repo.get_by(__MODULE__, id: id, user_id: user_id) do
      token |> change(revoked_at: now()) |> Repo.update()
    else
      _ -> {:error, :not_found}
    end
  end

  def revoke_all(user_id) do
    __MODULE__
    |> where([t], t.user_id == ^user_id and is_nil(t.revoked_at))
    |> Repo.update_all(set: [revoked_at: now(), updated_at: NaiveDateTime.utc_now(:second)])

    :ok
  end

  defp active_count(user_id), do: user_id |> list_active() |> length()

  defp expires_at(days) when days in @expiry_days, do: DateTime.add(now(), days, :day)

  defp expires_at(days) when is_binary(days) do
    case Integer.parse(days) do
      {days, ""} -> expires_at(days)
      _ -> nil
    end
  end

  # "never" — allowed for read-only tokens only (see create/2)
  defp expires_at(_never), do: nil

  defp get_attr(attrs, key, default), do: Map.get(attrs, key, Map.get(attrs, to_string(key), default))

  defp hash(token), do: :crypto.hash(:sha256, token)

  defp now, do: DateTime.utc_now(:second)

  defp touch(nil, _now), do: nil

  defp touch(token, now) do
    if is_nil(token.last_used_at) or DateTime.diff(now, token.last_used_at) >= @touch_interval_seconds do
      case token |> change(last_used_at: now) |> Repo.update() do
        {:ok, updated} -> updated
        _ -> token
      end
    else
      token
    end
  end
end
