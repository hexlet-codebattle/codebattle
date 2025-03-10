defmodule Codebattle.Utils.PopulateClans do
  @moduledoc false

  @doc """
  Populates clans table from csv file. The file is expected to
  have two fields in following order: long name, short name.
  """
  def from_csv!(file) do
    utc_now = NaiveDateTime.truncate(NaiveDateTime.utc_now(), :second)

    file
    |> File.stream!()
    |> NimbleCSV.RFC4180.parse_stream()
    |> Stream.chunk_every(500)
    |> Enum.each(&process_batch(&1, utc_now))
  end

  defp process_batch(clans, now) do
    clans = Enum.map(clans, &row_to_clan(&1, now))

    Codebattle.Repo.insert_all(Codebattle.Clan, clans,
      on_conflict: {:replace, [:long_name]},
      conflict_target: [:name]
    )
  end

  defp row_to_clan([long_name, name], now) do
    %{
      name: name,
      long_name: long_name,
      inserted_at: now,
      updated_at: now
    }
  end
end
