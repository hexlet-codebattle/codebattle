defmodule CodebattleWeb.Admin.GroupTournamentView do
  use CodebattleWeb, :view

  def format_datetime(nil), do: "none"

  def format_datetime(%NaiveDateTime{} = datetime) do
    datetime
    |> DateTime.from_naive!("UTC")
    |> format_datetime()
  end

  def format_datetime(%DateTime{} = datetime) do
    Timex.format!(datetime, "%Y-%m-%d %H:%M:%S %Z", :strftime)
  end

  def extract_run_error(%{errors: errors}), do: inspect(errors)
  def extract_run_error(%{"body" => %{"error" => error}}) when is_binary(error), do: error
  def extract_run_error(%{"error" => error}) when is_binary(error), do: error
  def extract_run_error(_result), do: "error"

  @doc """
  Build the show-page URL preserving existing query params, overriding any
  keys passed in `overrides` (use `nil` to drop a key).
  """
  def show_path(conn, group_tournament, overrides \\ %{}) do
    base = Routes.admin_group_tournament_path(conn, :show, group_tournament)

    merged =
      conn.query_params
      |> Map.merge(stringify(overrides))
      |> Enum.reject(fn {_k, v} -> v in [nil, ""] end)
      |> Enum.sort()

    case merged do
      [] -> base
      pairs -> base <> "?" <> URI.encode_query(pairs)
    end
  end

  defp stringify(map) do
    Map.new(map, fn {k, v} -> {to_string(k), if(is_nil(v), do: nil, else: to_string(v))} end)
  end

  def slice_label(nil), do: "All"
  def slice_label(:unassigned), do: "Unassigned"
  def slice_label(n) when is_integer(n), do: "Slice #{n}"
end
