defmodule CodebattleWeb.TournamentView do
  use CodebattleWeb, :view

  @default_timezone "Europe/Moscow"

  def csrf_token() do
    Plug.CSRFProtection.get_csrf_token()
  end

  def render_time(ms) do
    ms
    |> Timex.Duration.from_milliseconds()
    |> Timex.Duration.to_time!()
    |> Timex.format!("%H:%M:%S:%L", :strftime)
  end

  def render_datetime(nil), do: "none"

  def render_datetime(utc_datetime) do
    utc_datetime
    |> Timex.Timezone.convert(@default_timezone)
    |> Timex.format!("%d.%m.%Y %H:%M", :strftime)
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
