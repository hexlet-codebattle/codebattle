defmodule Codebattle.Oauth.User.TokenUser do
  @moduledoc """
    Basic auth_token auth
  """
  require Logger

  alias Codebattle.{Repo, User}

  def find(nil), do: {:error, "lol"}
  def find(""), do: {:error, "kek"}

  def find(token) do
    case Repo.get_by(User, auth_token: token) do
      nil -> {:error, "lol_kek"}
      user -> {:ok, user}
    end
  end
end
