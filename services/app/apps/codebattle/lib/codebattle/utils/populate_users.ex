defmodule Codebattle.Utils.PopulateUsers do
  @moduledoc false

  def from_csv(file) do
    utc_now = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

    file
    |> File.stream!()
    |> NimbleCSV.RFC4180.parse_stream()
    |> Stream.chunk_every(100)
    |> Enum.each(&process_batch(&1, utc_now))
  end

  defp process_batch(users, now) do
    users = Enum.map(users, &row_to_user(&1, now))

    Codebattle.Repo.insert_all(Codebattle.User, users,
      on_conflict: {:replace, [:password_hash]},
      conflict_target: [:name]
    )
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
