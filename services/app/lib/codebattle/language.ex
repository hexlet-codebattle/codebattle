defmodule Codebattle.Language do
  use TypedStruct
  @derive Jason.Encoder

  typedstruct do
    field(:name, String.t())
    field(:slug, String.t())
    field(:checker_version, pos_integer(), default: 1)
    field(:version, String.t())
    field(:check_dir, String.t())
    field(:extension, String.t())
    field(:docker_image, String.t())
    field(:solution_version, String.t())
    field(:solution_template, String.t())
    field(:return_template, String.t())
    field(:expected_template, String.t())
    field(:default_values, map())
    field(:arguments_template, map())
    field(:types, map())
    field(:checker_meta, map())
  end
end
