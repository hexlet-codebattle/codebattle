defmodule Codebattle.Repo do
  use Ecto.Repo, otp_app: :codebattle
  use Scrivener, page_size: 50
end
