defmodule Encoder do
  defimpl Jason.Encoder, for: Codebattle.User do
    def encode(user, opts) do
      user
      |> Map.take([
        :achievements,
        :avatar_url,
        :editor_mode,
        :editor_theme,
        :games_played,
        :github_id,
        :github_name,
        :id,
        :inserted_at,
        :is_admin,
        :is_bot,
        :is_guest,
        :lang,
        :name,
        :performance,
        :rank,
        :rating,
        :sound_settings
      ])
      |> Jason.Encode.map(opts)
    end
  end

  defimpl Jason.Encoder, for: MapSet do
    def encode(map_set, opts) do
      Jason.Encode.list(MapSet.to_list(map_set), opts)
    end
  end
end
