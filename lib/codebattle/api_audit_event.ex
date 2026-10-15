defmodule Codebattle.ApiAuditEvent do
  @moduledoc "Write actions done through the public API: moderation trail and creation quotas."

  use Ecto.Schema

  import Ecto.Query

  alias Codebattle.Repo

  schema "api_audit_events" do
    field(:user_id, :integer)
    field(:api_token_id, :binary_id)
    field(:action, :string)
    field(:resource_type, :string)
    field(:resource_id, :integer)

    timestamps(updated_at: false)
  end

  def log!(user_id, api_token_id, action, resource_type, resource_id) do
    Repo.insert!(%__MODULE__{
      user_id: user_id,
      api_token_id: api_token_id,
      action: action,
      resource_type: resource_type,
      resource_id: resource_id
    })
  end

  def count_since(user_id, action, %DateTime{} = since) do
    since = DateTime.to_naive(since)

    __MODULE__
    |> where([e], e.user_id == ^user_id and e.action == ^action and e.inserted_at >= ^since)
    |> Repo.aggregate(:count)
  end

  def resource_ids(user_id, action) do
    __MODULE__
    |> where([e], e.user_id == ^user_id and e.action == ^action)
    |> select([e], e.resource_id)
    |> Repo.all()
  end
end
