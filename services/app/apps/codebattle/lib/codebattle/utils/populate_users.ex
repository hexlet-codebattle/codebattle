defmodule Codebattle.Utils.PopulateUsers do
  @moduledoc false

  def from_csv(file) do
    utc_now = NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)

    users =
      File.stream!(file)
      |> NimbleCSV.RFC4180.parse_stream()
      |> Stream.map(&row_to_user(&1, utc_now))
      |> Enum.to_list()

    Codebattle.Repo.insert_all(Codebattle.User, users)
  end

  defp row_to_user([name, password], now) do
    %{
      name: name,
      password_hash: Bcrypt.hash_pwd_salt(password),
      inserted_at: now,
      updated_at: now
    }
  end
end
