defmodule Mix.Tasks.UploadLangs do
  @moduledoc false

  alias Codebattle.Language
  alias Codebattle.Repo

  use Mix.Task

  @shortdoc "Upserts langs to db"

  def run(_) do
    {:ok, _started} = Application.ensure_all_started(:codebattle)
    spec_filepath = Path.join(File.cwd!, "priv/repo/seeds/langs.yml")
    %{langs: langs} = YamlElixir.read_from_file spec_filepath, atoms: true
    for lang_data <- langs do
      language = case Repo.get_by(Language, slug: lang_data.slug) do
        nil  -> %Language{slug: lang_data.slug}
        entity -> entity
      end
      language
      |> Language.changeset(lang_data)
      |> Repo.insert_or_update!
      IO.puts "Upsert lang_data for: #{lang_data.slug}"
    end
  end
end
