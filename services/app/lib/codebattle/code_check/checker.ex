defmodule Codebattle.CodeCheck.Checker do
  alias Codebattle.CodeCheck
  alias Codebattle.CodeCheck.Checker
  alias Codebattle.CodeCheck.CheckerGenerator
  alias Codebattle.CodeCheck.OutputParser
  alias Codebattle.Languages

  @tmp_basedir "/tmp/codebattle-check"
  @docker_cmd_template "docker run --rm -m 400m --cpus=1 --net none -l codebattle_game ~s ~s timeout -s 9 10 make --silent test"

  defmodule Token do
    use TypedStruct

    typedstruct enforce: true do
      field(:task, Codebattle.Task.t())
      field(:lang_meta, Codebattle.LanguageMeta.t())
      field(:seed, String.t())
      field(:solution_text, String.t())
      field(:checker_text, String.t())
      field(:docker_command, String.t())
      field(:raw_docker_output, String.t())
      field(:tmp_dir_path, String.t())
      field(:executor, CodeCheck.DockerExecutor | CodeCheck.FakeExecutor)
      field(:result, CodeCheck.Result.t() | CodeCheck.Result.V2.t() | nil)
    end
  end

  @spec call(Codebattle.Task.t(), String.t(), String.t()) ::
          CodeCheck.Result.t() | CodeCheck.Result.V2.t()
  def call(task, solution_text, lang_slug) do
    lang_meta = Languages.meta(lang_slug)

    token =
      Checker.Token
      |> struct(%{
        task: task,
        solution_text: solution_text,
        lang_meta: lang_meta,
        seed: to_string(:rand.mwc59_seed()),
        executor: get_executor()
      })
      |> generate_checker_text()
      |> prepare_tmp_dir!()
      |> put_docker_command()
      |> run_docker_command()
      |> parse_output()

    Task.start(File, :rm_rf, [token.tmp_dir_path])

    token.result
  end

  defp generate_checker_text(token) do
    %{token | checker_text: CheckerGenerator.call(token)}
  end

  defp prepare_tmp_dir!(token) do
    File.mkdir_p!(@tmp_basedir)
    tmp_dir_path = Temp.mkdir!(prefix: token.lang_meta.slug, basedir: @tmp_basedir)

    File.write!(Path.join(tmp_dir_path, token.lang_meta.solution_file_name), token.solution_text)
    File.write!(Path.join(tmp_dir_path, token.lang_meta.checker_file_name), token.checker_text)

    %{token | tmp_dir_path: tmp_dir_path}
  end

  defp put_docker_command(token) do
    %{lang_meta: lang_meta, tmp_dir_path: tmp_dir_path} = token
    volume = "-v #{tmp_dir_path}:/usr/src/app/#{lang_meta.check_dir}"

    command =
      @docker_cmd_template
      |> :io_lib.format([volume, lang_meta.docker_image])
      |> to_string

    %{token | docker_command: command}
  end

  defp run_docker_command(token) do
    IO.puts(token.solution_text)
    IO.puts(token.checker_text)
    %{token | raw_docker_output: token.executor.call(token)}
  end

  defp parse_output(token) do
    %{token | result: OutputParser.call(token)}
  end

  defp get_executor, do: Application.fetch_env!(:codebattle, :checker_executor)
end
