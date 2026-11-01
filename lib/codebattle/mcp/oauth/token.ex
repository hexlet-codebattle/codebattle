defmodule Codebattle.Mcp.Oauth.Token do
  @moduledoc false
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @timestamps_opts [type: :utc_datetime]
  schema "mcp_oauth_tokens" do
    belongs_to(:connection, Codebattle.Mcp.Oauth.Connection, type: :binary_id)
    field(:access_hash, :binary)
    field(:refresh_hash, :binary)
    field(:scopes, {:array, :string})
    field(:expires_at, :utc_datetime)
    field(:refresh_expires_at, :utc_datetime)
    field(:consumed_at, :utc_datetime)
    timestamps()
  end
end
