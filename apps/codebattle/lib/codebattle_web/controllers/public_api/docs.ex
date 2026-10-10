defmodule CodebattleWeb.PublicApi.Docs do
  @moduledoc """
  Public API documentation built from two sources: the hand-written guide
  (`priv/docs/public_api_v1_guide.md`) and the endpoint/object reference generated from
  `priv/openapi/public_api_v1.json`, so the reference can't drift from the spec.

  The same Markdown is served raw (`/api-docs.md`, for LLMs) and rendered (`/api-docs`).
  """

  @priv Path.expand("../../../../priv", __DIR__)
  @guide_path Path.join(@priv, "docs/public_api_v1_guide.md")
  @spec_path Path.join(@priv, "openapi/public_api_v1.json")
  @external_resource @guide_path
  @external_resource @spec_path
  # Embedded at compile time: releases don't ship the source tree these paths point into.
  @guide File.read!(@guide_path)
  @spec_json File.read!(@spec_path)
  @version :erlang.phash2(@guide <> @spec_json)

  @site "https://codebattle.hexlet.io"
  @groups [{"me", "Me"}, {"tournaments", "Tournaments"}, {"games", "Games"}]
  @objects ~w(Me Game GamePlayer Tournament RankingEntry Error)
  @sample_time "2026-10-10T19:03:18Z"

  @spec markdown() :: String.t()
  def markdown, do: cached(:markdown, &build_markdown/0)

  @spec html() :: String.t()
  def html, do: cached(:html, fn -> CodebattleWeb.PublicApi.DocsHTML.page(markdown()) end)

  @spec llms_txt() :: String.t()
  def llms_txt do
    """
    # Codebattle

    > Competitive programming platform: solve coding tasks head-to-head in real time, 20+ languages.

    The public API v1 is a small, me-centric HTTP API for bots, CLIs and devices. It needs a personal
    token (Settings → API tokens) sent as `Authorization: Bearer cbp_...`.

    ## Docs

    - [Public API v1, full reference in Markdown](#{@site}/api-docs.md): guide, every endpoint, objects, errors, limits
    - [OpenAPI 3.1 spec](#{@site}/public_api/v1/openapi.json)
    - [Human-friendly docs](#{@site}/api-docs)
    """
  end

  defp cached(key, fun) do
    term_key = {__MODULE__, key, @version}

    case :persistent_term.get(term_key, nil) do
      nil ->
        value = fun.()
        :persistent_term.put(term_key, value)
        value

      value ->
        value
    end
  end

  defp build_markdown do
    spec = @spec_json |> Jason.decode!(objects: :ordered_objects) |> normalize()
    guide = @guide

    Enum.join([String.trim_trailing(guide), endpoints(spec), objects(spec)], "\n\n") <> "\n"
  end

  ## Endpoints

  defp endpoints(spec) do
    operations =
      for {path, methods} <- pairs(spec["paths"]), {method, op} <- pairs(methods) do
        {path, method, op}
      end

    sections =
      Enum.map(@groups, fn {segment, title} ->
        ops = Enum.filter(operations, fn {path, _, _} -> path |> String.split("/") |> Enum.at(1) == segment end)
        "## #{title}\n\n" <> Enum.map_join(ops, "\n\n", &operation(spec, &1))
      end)

    index =
      Enum.map_join(operations, "\n", fn {path, method, op} ->
        "| `#{String.upcase(method)}` | `#{path}` | #{op["summary"]} | `#{scope(op)}` |"
      end)

    """
    ## Endpoints

    All paths are relative to `https://codebattle.hexlet.io/public_api/v1`.

    | Method | Path | What it does | Scope |
    |--------|------|--------------|-------|
    #{index}

    """ <> Enum.join(sections, "\n\n")
  end

  defp operation(spec, {path, method, op}) do
    params = op["parameters"] || []
    query = Enum.filter(params, &(&1["in"] == "query"))
    body_schema = get_in(op, ["requestBody", "content", "application/json", "schema"])

    {status, response} =
      op["responses"]
      |> pairs()
      |> Enum.find(fn {code, _} -> String.starts_with?(code, "2") end)
      |> then(fn {code, resp} -> {code, get_in(resolve(spec, resp), ["content", "application/json"])} end)

    errors =
      op["responses"]
      |> pairs()
      |> Enum.map(fn {code, _} -> code end)
      |> Enum.reject(&String.starts_with?(&1, "2"))
      |> Enum.sort()

    [
      "### #{String.upcase(method)} #{path}",
      "**#{op["summary"]}**",
      op["description"],
      "Scope: `#{scope(op)}`",
      query != [] && "**Query parameters**\n\n" <> param_table(query),
      body_schema && "**Request body**\n\n" <> field_table(spec, resolve(spec, body_schema), true),
      "**Example request**\n\n```bash\n" <> curl(spec, path, method, query, body_schema) <> "\n```",
      response && response["schema"] &&
        "**Response `#{status}`**\n\n```json\n" <> pretty(response_example(spec, response)) <> "\n```",
      errors != [] && "Errors: " <> Enum.map_join(errors, ", ", &"`#{&1}`")
    ]
    |> Enum.filter(&(is_binary(&1) and &1 != ""))
    |> Enum.join("\n\n")
  end

  defp scope(op), do: op |> get_in(["security"]) |> List.first() |> Map.get("bearerAuth") |> List.first()

  defp param_table(params) do
    rows =
      Enum.map_join(params, "\n", fn param ->
        "| `#{param["name"]}` | #{type_of(param["schema"])} | #{cell(param["description"])} |"
      end)

    "| Name | Type | Description |\n|------|------|-------------|\n" <> rows
  end

  defp curl(spec, path, method, query, body_schema) do
    path = String.replace(path, "{id}", "123")

    qs =
      query
      |> Enum.filter(& &1["example"])
      |> Enum.take(2)
      |> Enum.map_join("&", &"#{&1["name"]}=#{&1["example"]}")

    url = "#{@site}/public_api/v1#{path}" <> if(qs == "", do: "", else: "?" <> qs)
    method = String.upcase(method)

    lines =
      [
        if(method == "GET", do: ~s(curl -s "#{url}"), else: ~s(curl -s -X #{method} "#{url}")),
        ~s(  -H "Authorization: Bearer $CODEBATTLE_TOKEN")
      ] ++
        if body_schema do
          body = spec |> example(body_schema, :required) |> Jason.encode!()
          [~s(  -H "Content-Type: application/json"), "  -d '#{body}'"]
        else
          []
        end

    Enum.join(lines, " \\\n")
  end

  ## Objects

  defp objects(spec) do
    schemas = spec["components"]["schemas"]

    sections =
      Enum.map_join(@objects, "\n\n", fn name ->
        "### #{name}\n\n" <> field_table(spec, schemas[name], false)
      end)

    "## Objects\n\nFields of the objects the endpoints return. Nullable fields may be `null`.\n\n" <> sections
  end

  defp field_table(spec, schema, input?) do
    required = schema["required"] || []

    rows =
      Enum.map_join(pairs(schema["properties"]), "\n", fn {name, prop} ->
        prop = resolve(spec, prop)
        name = if input? and name in required, do: "`#{name}` *(required)*", else: "`#{name}`"
        "| #{name} | #{type_of(prop)} | #{cell(describe(prop))} |"
      end)

    "| Field | Type | Description |\n|-------|------|-------------|\n" <> rows
  end

  defp describe(prop) do
    [
      prop["description"],
      prop["enum"] && "One of " <> Enum.map_join(prop["enum"], ", ", &"`#{&1}`"),
      range(prop),
      prop["properties"] && "Fields: " <> Enum.map_join(pairs(prop["properties"]), ", ", fn {k, _} -> "`#{k}`" end)
    ]
    |> Enum.filter(& &1)
    |> Enum.join(". ")
  end

  defp range(%{"minimum" => min, "maximum" => max}), do: "#{min}..#{max}"
  defp range(%{"minLength" => min, "maxLength" => max}), do: "#{min}..#{max} characters"
  defp range(_prop), do: nil

  defp type_of(nil), do: ""
  defp type_of(%{"$ref" => ref}), do: ref |> String.split("/") |> List.last()

  defp type_of(%{"type" => "array", "items" => items}), do: "array of #{type_of(items)}"

  defp type_of(%{"oneOf" => variants}) do
    base = variants |> Enum.reject(&(&1["type"] == "null")) |> Enum.map_join(" \\| ", &type_of/1)
    if Enum.any?(variants, &(&1["type"] == "null")), do: base <> ", nullable", else: base
  end

  defp type_of(%{"type" => types} = schema) when is_list(types) do
    base = types |> Enum.reject(&(&1 == "null")) |> Enum.map_join(" \\| ", &type_of(Map.put(schema, "type", &1)))
    if "null" in types, do: base <> ", nullable", else: base
  end

  defp type_of(%{"format" => "date-time"}), do: "datetime"
  defp type_of(%{"type" => type}), do: type
  defp type_of(_schema), do: "any"

  defp cell(nil), do: ""
  defp cell(text), do: text |> String.replace("|", "\\|") |> String.replace("\n", " ")

  ## Examples

  defp example(spec, schema, mode \\ :all)

  defp example(spec, %{"$ref" => _} = ref, mode), do: example(spec, resolve(spec, ref), mode)
  defp example(spec, %{"oneOf" => variants}, mode), do: example(spec, Enum.find(variants, &(&1["type"] != "null")), mode)
  defp example(_spec, %{"example" => value}, _mode), do: denormalize(value)

  defp example(spec, %{"properties" => props} = schema, mode) do
    required = schema["required"] || []

    props
    |> pairs()
    |> Enum.filter(fn {name, _} -> mode == :all or name in required end)
    |> Enum.map(fn {name, prop} -> {name, property_example(spec, name, prop)} end)
    |> Jason.OrderedObject.new()
  end

  defp example(spec, %{"type" => "array", "items" => items}, _mode), do: [example(spec, items)]
  defp example(spec, %{"type" => [_ | _] = types} = schema, mode), do: example_of_types(spec, schema, types, mode)
  defp example(_spec, %{"enum" => [value | _]}, _mode), do: value
  defp example(_spec, %{"format" => "date-time"}, _mode), do: @sample_time
  defp example(_spec, %{"type" => "integer"} = schema, _mode), do: schema["minimum"] || 1
  defp example(_spec, %{"type" => "number"}, _mode), do: 1.5
  defp example(_spec, %{"type" => "boolean"}, _mode), do: false
  defp example(_spec, %{"type" => "string"}, _mode), do: "string"
  defp example(_spec, _schema, _mode), do: nil

  defp example_of_types(spec, schema, types, mode) do
    case Enum.reject(types, &(&1 == "null")) do
      [type | _] -> example(spec, Map.put(schema, "type", type), mode)
      [] -> nil
    end
  end

  @named_examples %{
    "id" => 324_274,
    "name" => "ada",
    "level" => "easy",
    "lang" => "python",
    "rating" => 1461,
    "rank" => 12,
    "place" => 1,
    "score" => 42,
    "timeout_seconds" => 600,
    "players_count" => 8,
    "players_limit" => 16,
    "rounds_limit" => 3,
    "position" => 2,
    "tournament_id" => nil,
    "avatar_url" => nil,
    "result" => "won",
    "result_percent" => 100.0,
    "type" => "duo",
    "description" => "Weekly practice for our team"
  }

  defp response_example(_spec, %{"example" => value}), do: denormalize(value)
  defp response_example(spec, %{"schema" => schema}), do: example(spec, schema)

  defp property_example(spec, name, prop) do
    prop = resolve(spec, prop)

    cond do
      Map.has_key?(prop, "example") -> denormalize(prop["example"])
      Map.has_key?(prop, "enum") -> example(spec, prop)
      Map.has_key?(@named_examples, name) -> @named_examples[name]
      name == "url" -> "#{@site}/games/324274"
      name in ["next_cursor"] -> 324_100
      true -> example(spec, prop)
    end
  end

  defp resolve(spec, %{"$ref" => "#/" <> ref}), do: get_in(spec, String.split(ref, "/"))
  defp resolve(_spec, schema), do: schema

  defp pretty(value), do: Jason.encode!(value, pretty: true)

  # Spec objects become maps that remember their key order under the `:order` key, so they
  # pattern-match like maps but the docs keep the spec's order of paths and fields.
  defp normalize(%Jason.OrderedObject{values: values}) do
    values
    |> Map.new(fn {key, value} -> {key, normalize(value)} end)
    |> Map.put(:order, Enum.map(values, &elem(&1, 0)))
  end

  defp normalize(list) when is_list(list), do: Enum.map(list, &normalize/1)
  defp normalize(value), do: value

  defp pairs(nil), do: []
  defp pairs(map), do: Enum.map(map[:order], &{&1, map[&1]})

  defp denormalize(%{order: _} = map),
    do: map |> pairs() |> Enum.map(fn {k, v} -> {k, denormalize(v)} end) |> Jason.OrderedObject.new()

  defp denormalize(list) when is_list(list), do: Enum.map(list, &denormalize/1)
  defp denormalize(value), do: value
end
