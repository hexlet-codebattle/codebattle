defmodule Codebattle.Repo do
  use Ecto.Repo, otp_app: :codebattle, adapter: Ecto.Adapters.Postgres
  use Scrivener, page_size: 50
end
