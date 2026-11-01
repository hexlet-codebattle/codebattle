defmodule Codebattle.Mcp.Oauth.Code do
  @moduledoc false
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @timestamps_opts [type: :utc_datetime]
  schema "mcp_oauth_codes" do
    belongs_to(:connection, Codebattle.Mcp.Oauth.Connection, type: :binary_id)
    field(:code_hash, :binary)
    field(:redirect_uri, :string)
    field(:challenge, :string)
    field(:expires_at, :utc_datetime)
    field(:consumed_at, :utc_datetime)
    timestamps()
  end
end
