defmodule Codebattle.Generators.CheckerGeneratorV2 do
  @moduledoc false

  require Logger

  def call(slug, task) do
    source_dir = Application.app_dir(:codebattle, "priv/templates/")

    arguments =
      task.asserts
      |> Enum.map(& &1.arguments)
      |> Jason.encode!()

    EEx.eval_file(Path.join(source_dir, "#{slug}.eex"), arguments: arguments)
  end
end
