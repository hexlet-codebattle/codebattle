defmodule Codebattle.Mcp.Oauth.Connection do
  @moduledoc false
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @timestamps_opts [type: :utc_datetime]
  schema "mcp_oauth_connections" do
    belongs_to(:client, Codebattle.Mcp.Oauth.Client, type: :binary_id)
    belongs_to(:user, Codebattle.User)
    field(:scopes, {:array, :string})
    field(:resource, :string)
    field(:revoked_at, :utc_datetime)
    field(:last_used_at, :utc_datetime)
    timestamps()
  end
end
