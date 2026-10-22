defmodule CodebattleWeb.Live.Admin.Season.ShowViewTest do
  use CodebattleWeb.ConnCase, async: false

  import Ecto.Query

  alias Codebattle.Season
  alias Codebattle.Tournament
  alias Codebattle.Tournament.SeasonTournamentGeneratorRunner

  test "updates the season's upcoming tournaments with the current generator params", %{conn: conn} do
    {:ok, season} = Season.create(%{name: "Fall 2024", year: 2024, starts_at: ~D[2024-09-21], ends_at: ~D[2024-12-21]})
    SeasonTournamentGeneratorRunner.generate_season(season)

    [masters | _] = Repo.all(from(t in Tournament, where: t.grade == "masters", order_by: t.id))
    masters |> Ecto.Changeset.change(type: "ladder", break_duration_seconds: 10) |> Repo.update!()

    {:ok, view, _html} =
      conn
      |> log_in_user(insert(:admin).id)
      |> live("/admin/seasons/#{season.id}")

    html = view |> element("button", "Update Upcoming Tournaments") |> render_click()

    assert html =~ "Updated 1 upcoming tournaments"
    assert %{type: "swiss", break_duration_seconds: 5} = Repo.reload!(masters)
  end
end
