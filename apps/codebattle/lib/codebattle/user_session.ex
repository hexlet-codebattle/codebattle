defmodule Codebattle.UserSession do
  @moduledoc """
  Represents one revocable browser session.

  The raw session token is stored only in the signed, HTTP-only browser cookie.
  The database contains its SHA-256 hash, so a database read does not expose
  reusable credentials.
  """

  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User
  alias CodebattleWeb.Endpoint

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :id
  @session_lifetime_days 365
  @touch_interval_seconds 300
  @token_bytes 32

  schema "user_sessions" do
    belongs_to(:user, User)

    field(:token_hash, :binary)
    field(:user_agent, :string)
    field(:ip, :string)
    field(:last_seen_at, :utc_datetime)
    field(:expires_at, :utc_datetime)
    field(:revoked_at, :utc_datetime)

    timestamps()
  end

  def changeset(session, attrs) do
    session
    |> cast(attrs, [:user_id, :token_hash, :user_agent, :ip, :last_seen_at, :expires_at, :revoked_at])
    |> validate_required([:user_id, :token_hash, :last_seen_at, :expires_at])
    |> validate_length(:user_agent, max: 512)
    |> validate_length(:ip, max: 64)
    |> unique_constraint(:token_hash)
    |> foreign_key_constraint(:user_id)
  end

  def create(user, attrs \\ %{}) do
    {token, token_hash} = generate_token()
    now = now()

    attrs =
      attrs
      |> Map.new()
      |> Map.merge(%{
        user_id: user.id,
        token_hash: token_hash,
        last_seen_at: now,
        expires_at: DateTime.add(now, @session_lifetime_days, :day)
      })

    case %__MODULE__{} |> changeset(attrs) |> Repo.insert() do
      {:ok, session} -> {:ok, session, token}
      {:error, changeset} -> {:error, changeset}
    end
  end

  def create_socket_token(user, attrs \\ %{}) do
    with {:ok, session, _token} <- create(user, attrs) do
      {:ok, Phoenix.Token.sign(Endpoint, "user_token", {user.id, session.id})}
    end
  end

  def get_active_by_token(token) when is_binary(token) do
    current_time = now()

    session =
      __MODULE__
      |> where([s], s.token_hash == ^hash_token(token))
      |> where([s], is_nil(s.revoked_at) and s.expires_at > ^current_time)
      |> preload(:user)
      |> Repo.one()

    touch(session, current_time)
  end

  def get_active_by_token(_token), do: nil

  def get_active_for_socket(user_id, session_id) do
    case Ecto.UUID.cast(session_id) do
      {:ok, session_id} ->
        current_time = now()

        __MODULE__
        |> where([s], s.id == ^session_id and s.user_id == ^user_id)
        |> where([s], is_nil(s.revoked_at) and s.expires_at > ^current_time)
        |> preload(:user)
        |> Repo.one()

      :error ->
        nil
    end
  end

  def list_active(user_id) do
    current_time = now()

    __MODULE__
    |> where([s], s.user_id == ^user_id)
    |> where([s], is_nil(s.revoked_at) and s.expires_at > ^current_time)
    |> order_by([s], desc: s.last_seen_at)
    |> Repo.all()
  end

  def renew_current_and_revoke_others(repo, user, current_session, attrs) do
    with {:ok, session, token} <- renew_or_create(repo, user, current_session, attrs) do
      revoked_session_ids =
        __MODULE__
        |> where([s], s.user_id == ^user.id and s.id != ^session.id and is_nil(s.revoked_at))
        |> select([s], s.id)
        |> repo.all()

      current_time = now()

      __MODULE__
      |> where([s], s.id in ^revoked_session_ids)
      |> repo.update_all(set: [revoked_at: current_time, updated_at: NaiveDateTime.utc_now()])

      {:ok, %{session: session, token: token, revoked_session_ids: revoked_session_ids}}
    end
  end

  def revoke_for_user(user_id, session_id) do
    current_time = now()

    with {:ok, session_id} <- Ecto.UUID.cast(session_id),
         %__MODULE__{} = session <- Repo.get_by(__MODULE__, id: session_id, user_id: user_id) do
      session
      |> change(revoked_at: current_time)
      |> Repo.update()
      |> case do
        {:ok, revoked_session} ->
          disconnect(revoked_session.id)
          {:ok, revoked_session}

        error ->
          error
      end
    else
      _ ->
        {:error, :not_found}
    end
  end

  def revoke_by_token(token) when is_binary(token) do
    case get_active_by_token(token) do
      nil ->
        :ok

      session ->
        revoke_for_user(session.user_id, session.id)
        :ok
    end
  end

  def revoke_by_token(_token), do: :ok

  def revoke_all(user_id) do
    current_time = now()

    session_ids =
      __MODULE__
      |> where([s], s.user_id == ^user_id and is_nil(s.revoked_at))
      |> select([s], s.id)
      |> Repo.all()

    __MODULE__
    |> where([s], s.id in ^session_ids)
    |> Repo.update_all(set: [revoked_at: current_time, updated_at: NaiveDateTime.utc_now()])

    disconnect_many(session_ids)
    :ok
  end

  def disconnect_many(session_ids), do: Enum.each(session_ids, &disconnect/1)

  def disconnect(session_id) do
    Endpoint.broadcast("user_session:#{session_id}", "disconnect", %{})
  end

  defp renew_or_create(repo, user, nil, attrs) do
    {token, token_hash} = generate_token()
    current_time = now()

    attrs =
      attrs
      |> Map.new()
      |> Map.merge(%{
        user_id: user.id,
        token_hash: token_hash,
        last_seen_at: current_time,
        expires_at: DateTime.add(current_time, @session_lifetime_days, :day)
      })

    case %__MODULE__{} |> changeset(attrs) |> repo.insert() do
      {:ok, session} -> {:ok, session, token}
      {:error, changeset} -> {:error, changeset}
    end
  end

  defp renew_or_create(repo, user, current_session, attrs) do
    {token, token_hash} = generate_token()
    current_time = now()

    changes =
      attrs
      |> Map.new()
      |> Map.merge(%{
        token_hash: token_hash,
        last_seen_at: current_time,
        expires_at: DateTime.add(current_time, @session_lifetime_days, :day)
      })

    current_session
    |> changeset(changes)
    |> repo.update()
    |> case do
      {:ok, session} when session.user_id == user.id -> {:ok, session, token}
      {:ok, _session} -> {:error, :invalid_session_owner}
      {:error, changeset} -> {:error, changeset}
    end
  end

  defp touch(nil, _current_time), do: nil

  defp touch(session, current_time) do
    if DateTime.diff(current_time, session.last_seen_at, :second) >= @touch_interval_seconds do
      session
      |> change(last_seen_at: current_time)
      |> Repo.update()
      |> case do
        {:ok, updated_session} -> updated_session
        {:error, _changeset} -> session
      end
    else
      session
    end
  end

  defp generate_token do
    token = @token_bytes |> :crypto.strong_rand_bytes() |> Base.url_encode64(padding: false)
    {token, hash_token(token)}
  end

  defp hash_token(token), do: :crypto.hash(:sha256, token)
  defp now, do: DateTime.truncate(DateTime.utc_now(), :second)
end
