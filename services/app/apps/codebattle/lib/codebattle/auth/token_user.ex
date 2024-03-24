defmodule Codebattle.Auth.User.TokenUser do
  @moduledoc """
    Token auth
  """
  require Logger

  alias Codebattle.Repo
  alias Codebattle.User

  def find(nil), do: {:error, "lol"}
  def find(""), do: {:error, "kek"}

  def find(token) do
    case Repo.get_by(User, auth_token: String.trim(token)) do
      nil -> {:error, "Wrong auth token"}
      user -> {:ok, user}
    end
  end
end
