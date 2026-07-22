defmodule Codebattle.SeasonTest do
  use Codebattle.DataCase, async: false

  alias Codebattle.Season

  test "creates, queries, updates, and deletes seasons" do
    today = Date.utc_today()

    assert {:ok, season} =
             Season.create(%{
               name: "Current season",
               year: today.year,
               starts_at: Date.add(today, -1),
               ends_at: Date.add(today, 1)
             })

    assert Season.fetch_current_season_from_db().id == season.id
    assert Season.get(season.id).id == season.id
    assert Season.get!(season.id).id == season.id
    assert Enum.map(Season.get_all(), & &1.id) == [season.id]

    assert {:ok, updated} = Season.update(season, %{name: "Updated season"})
    assert updated.name == "Updated season"
    assert {:ok, _deleted} = Season.delete(updated)
    assert Season.get(season.id) == nil
  end

  test "validates years and date ordering" do
    today = Date.utc_today()

    changeset =
      Season.changeset(%Season{}, %{
        name: "Invalid",
        year: 2000,
        starts_at: today,
        ends_at: Date.add(today, -1)
      })

    refute changeset.valid?
    assert Keyword.has_key?(changeset.errors, :year)
    assert Keyword.has_key?(changeset.errors, :ends_at)
  end
end
