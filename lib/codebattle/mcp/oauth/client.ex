defmodule Codebattle.Mcp.Oauth.Client do
  @moduledoc false
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @timestamps_opts [type: :utc_datetime]
  schema "mcp_oauth_clients" do
    field(:name, :string)
    field(:redirect_uris, {:array, :string})
    timestamps()
  end
end
