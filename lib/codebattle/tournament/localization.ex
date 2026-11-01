defmodule Codebattle.Tournament.Localization do
  @moduledoc "Localized copy for season tournaments."

  @templates_path Path.expand("../../../priv/tournament_templates.json", __DIR__)
  @external_resource @templates_path
  @templates @templates_path |> File.read!() |> Jason.decode!()

  def season_attrs(grade) do
    template = Map.fetch!(@templates, grade)

    %{
      name: template["name"]["en"],
      description: template["description"]["en"],
      name_translations: template["name"],
      description_translations: template["description"]
    }
  end

  def name(tournament, locale), do: localized(tournament, :name, :name_translations, locale)
  def description(tournament, locale), do: localized(tournament, :description, :description_translations, locale)

  defp localized(tournament, field, translations_field, locale) do
    translations = Map.get(tournament, translations_field) || %{}

    Enum.find_value([to_string(locale), "en"], &present_text(Map.get(translations, &1))) || Map.get(tournament, field)
  end

  defp present_text(text) when is_binary(text) do
    if String.trim(text) != "", do: text
  end

  defp present_text(_text), do: nil
end
