defmodule CodebattleWeb.TournamentView do
  use CodebattleWeb, :view

  def csrf_token() do
    Plug.CSRFProtection.get_csrf_token()
  end

  def format_datetime(nil), do: "none"
  def format_datetime(nil, _time_zone), do: "none"

  def format_datetime(datetime = %NaiveDateTime{}, user_timezone) do
    datetime
    |> DateTime.from_naive!("UTC")
    |> format_datetime(user_timezone)
  end

  def format_datetime(datetime = %DateTime{}, user_timezone) do
    datetime
    |> DateTime.shift_zone!(user_timezone)
    |> Timex.format!("%Y-%m-%d %H:%M %Z", :strftime)
  end

  def get_link_params(match, %{id: id}) do
    is_participant = Enum.map(match.players, & &1.id) |> Enum.any?(&(&1 == id))

    case {match.state, is_participant} do
      {"pending", true} -> {"Pending", "bg-warning"}
      {"playing", true} -> {"Join", "bg-warning"}
      {_, true} -> {"Show", "x-bg-gray"}
      _ -> {"Show", ""}
    end
  end

  def get_icon_class(player) do
    case Map.get(player, :result) do
      "waiting" -> nil
      "won" -> "fa fa-trophy"
      "lost" -> "lost"
      "gave_up" -> "far fa-flag"
      _ -> nil
    end
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)

  def render_chat_message(%{name: _user_name, text: text}) do
    # TODO: add highlight to usernames
    text
  end
end
