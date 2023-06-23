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

    test "floats" do
      input_arguments = %{"argument-name" => "some", "name" => "float"}
      asserts = [1.2]

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

    test "hashes" do
      input_arguments = %{
        "argument-name" => "some",
        "name" => "hash",
        "nested" => %{"name" => "integer"}
      }

      asserts = [%{"some" => 1}]

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

  describe ".type_asserts" do
    test "integers" do
      asserts = [1]

      assert AssertsService.type_asserts(asserts) = %{"name" => "integer"}
    end

    test "booleans" do
      asserts = [true]

      assert AssertsService.type_asserts(asserts) = %{"name" => "boolean"}
    end

    test "strings" do
      asserts = ["some"]

      assert AssertsService.type_asserts(asserts) = %{"name" => "string"}
    end

    test "floats" do
      asserts = [1.1]

      assert AssertsService.type_asserts(asserts) = %{"name" => "float"}
    end

    test "arrays" do
      asserts = [[1, 2]]

      assert AssertsService.type_asserts(asserts) = %{
               "name" => "array",
               "nested" => %{"name" => "integer"}
             }
    end

    test "hashes" do
      asserts = [%{"some" => 1}]

      assert AssertsService.type_asserts(asserts) = %{
               "name" => "hash",
               "nested" => %{"name" => "integer"}
             }
    end

    test "nested arrays" do
      asserts = [[[1, 2, 3]]]

      assert AssertsService.type_asserts(asserts) = %{
               "name" => "array",
               "nested" => %{"name" => "array", "nested" => %{"name" => "integer"}}
             }
    end
  end
end
