defmodule Runner.LanguageMeta do
  use TypedStruct
  @derive Jason.Encoder

  typedstruct do
    field(:arguments_template, %{argument: String.t(), delimiter: String.t()})
    field(:typespec_template, %{argument: String.t(), delimiter: String.t()})
    field(:check_dir, String.t())
    field(:checker_file_name, String.t())
    field(:checker_meta, map())
    field(:checker_version, pos_integer(), default: 1)
    field(:output_version, pos_integer(), default: 1)
    field(:container_run_timeout, String.t(), defatul: "10s")
    field(:default_values, map())
    field(:docker_image, String.t())
    field(:expected_template, String.t())
    field(:generate_checker?, boolean(), default: true)
    field(:generate_types_file?, boolean(), default: false)
    field(:name, String.t())
    field(:return_template, String.t())
    field(:slug, String.t())
    field(:solution_file_name, String.t())
    field(:solution_template, String.t())
    field(:types, map())
    field(:version, String.t())

    # asserts generator params
    field(:generator_dir, String.t())
    field(:arguments_generator_template, String.t())
    field(:arguments_generator_file_name, String.t())
    field(:asserts_generator_file_name, String.t())
  end
end
