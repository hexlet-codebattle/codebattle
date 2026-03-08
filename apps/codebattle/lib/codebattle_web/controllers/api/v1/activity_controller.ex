defmodule CodebattleWeb.Api.V1.ActivityController do
  use CodebattleWeb, :controller

  import Ecto.Query, only: [from: 2]

  alias Codebattle.Repo
  alias Codebattle.UserGame

  @default_window_days 365

  defmacro to_char(field, format) do
    quote do
      fragment("to_char(?, ?)", unquote(field), unquote(format))
    end
  end

  def show(conn, %{"user_id" => user_id} = params) do
    {start_date, end_date, year} = activity_window(params["year"])
    end_date_exclusive = Date.add(end_date, 1)

    query =
      from(ug in UserGame,
        where: ug.user_id == ^user_id,
        where: ug.result in ["won", "lost", "gave_up"],
        where: fragment("?::date", ug.inserted_at) >= ^start_date,
        where: fragment("?::date", ug.inserted_at) < ^end_date_exclusive,
        group_by: to_char(ug.inserted_at, "YYYY-mm-dd"),
        select: %{date: to_char(ug.inserted_at, "YYYY-mm-dd"), count: count(ug.id)}
      )

    activities = Repo.all(query)
    earliest_activity_date =
      from(ug in UserGame,
        where: ug.user_id == ^user_id,
        where: ug.result in ["won", "lost", "gave_up"],
        select: type(fragment("min(?::date)", ug.inserted_at), :date)
      )
      |> Repo.one()

    json(conn, %{
      activities: activities,
      meta: %{
        year: year,
        start_date: Date.to_iso8601(start_date),
        end_date: Date.to_iso8601(end_date),
        earliest_activity_date:
          earliest_activity_date && Date.to_iso8601(earliest_activity_date)
      }
    })
  end

  defp parse_year(year) do
    current_year = Date.utc_today().year

    case Integer.parse(to_string(year)) do
      {value, ""} when value >= 2017 and value <= current_year -> value
      _ -> nil
    end
  end

  defp activity_window(year_param) do
    case parse_year(year_param) do
      nil ->
        end_date = Date.utc_today()
        start_date = Date.add(end_date, -(@default_window_days - 1))
        {start_date, end_date, nil}

      year ->
        start_date = Date.new!(year, 1, 1)
        end_date = Date.new!(year, 12, 31)
        {start_date, end_date, year}
    end
  end
end
