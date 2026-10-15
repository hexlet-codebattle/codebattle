defmodule Codebattle.Auth.User.TokenUser do
  @moduledoc """
    Token auth
  """
  import Ecto.Query

  alias Codebattle.Repo
  alias Codebattle.User

  def find(nil), do: {:error, "lol"}
  def find(""), do: {:error, "kek"}

  def find(token) do
    user =
      User
      |> where([u], is_nil(u.archived_at))
      |> Repo.get_by(auth_token: String.trim(token))

    case user do
      nil -> {:error, "Wrong auth token"}
      user -> {:ok, user}
    end
  end
end
