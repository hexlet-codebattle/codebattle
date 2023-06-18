defmodule Codebattle.AssertsServiceTest do
  use CodebattleWeb.ConnCase, async: true

  alias Codebattle.AssertsService

  describe ".valid_asserts?" do
    test "integers" do
      input_arguments = %{"argument-name" => "some", "name" => "integer"}
      asserts = [1]

      assert AssertsService.valid_asserts?(asserts, input_arguments)
    end

    test "booleans" do
      input_arguments = %{"argument-name" => "some", "name" => "boolean"}
      asserts = [true]

      assert AssertsService.valid_asserts?(asserts, input_arguments)
    end

    test "strings" do
      input_arguments = %{"argument-name" => "some", "name" => "string"}
      asserts = ["some string"]

      assert AssertsService.valid_asserts?(asserts, input_arguments)
    end

    test "arrays" do
      input_arguments = %{
        "argument-name" => "some",
        "name" => "array",
        "nested" => %{"name" => "integer"}
      }

      asserts = [[1, 2, 3]]

      assert AssertsService.valid_asserts?(asserts, input_arguments)
    end

    test "nested arrays" do
      input_arguments = %{
        "argument-name" => "some",
        "name" => "array",
        "nested" => %{"name" => "array", "nested" => %{"name" => "integer"}}
      }

      asserts = [[[1, 2, 3]]]

      assert AssertsService.valid_asserts?(asserts, input_arguments)
    end
  end
end
