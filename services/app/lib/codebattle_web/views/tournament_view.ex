defmodule CodebattleWeb.TournamentView do
  use CodebattleWeb, :view

  @default_timezone "Europe/Moscow"

  import Codebattle.Tournament.Helpers

  def render_datetime(nil), do: "none"

  def render_datetime(utc_datetime) do
    utc_datetime
    |> Timex.Timezone.convert(@default_timezone)
    |> Timex.format!("%d.%m.%Y %H:%M", :strftime)
  end

  def get_link_params(match, %{id: id}) do
    is_participant = Enum.map(match.players, & &1.id) |> Enum.any?(&(&1 == id))

    case {match.state, is_participant} do
      {"waiting", true} -> {"Wait", "bg-warning"}
      {"active", true} -> {"Join", "bg-warning"}
      {_, true} -> {"Show", "x-bg-gray"}
      _ -> {"Show", ""}
    end
  end

  def get_icon_class(player) do
    case Map.get(player, :game_result) do
      "waiting" -> nil
      "won" -> "fa fa-trophy"
      "lost" -> "lost"
      "gave_up" -> "far fa-flag"
      _ -> nil
    end
  end

  def difficulty_to_color(level) do
    %{
      "random" => "secondary",
      "elementary" => "info",
      "easy" => "success",
      "medium" => "warning",
      "hard" => "danger"
    }[level]
  end

  def render_base_errors(nil), do: nil
  def render_base_errors(errors), do: elem(errors, 0)
end
