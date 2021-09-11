defmodule Codebattle.Repo do
  use Ecto.Repo, otp_app: :codebattle, adapter: Ecto.Adapters.Postgres

  def count(q), do: Codebattle.Repo.aggregate(q, :count, :id)
end
