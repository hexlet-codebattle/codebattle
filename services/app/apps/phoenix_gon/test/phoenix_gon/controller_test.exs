defmodule PhoenixGon.ControllerTest do
  use ExUnit.Case, async: false
  use RouterHelper

  import PhoenixGon.Controller

  alias Plug.Conn

  describe "#put_gon" do
    test 'conn' do
      conn =
        %Conn{}
        |> with_gon
        |> put_gon(test: :test)

      actual = conn.private[:phoenix_gon].assets[:test]
      expectation = :test

      assert actual == expectation
    end
  end

  describe "update_gon" do
    test 'conn' do
      conn =
        %Conn{}
        |> with_gon
        |> put_gon(test: :not_test)
        |> update_gon(test: :test)

      actual = conn.private[:phoenix_gon].assets[:test]
      expectation = :test

      assert actual == expectation
    end
  end

  describe "drop_gon" do
    test 'conn' do
      conn =
        %Conn{}
        |> with_gon
        |> put_gon(test: :test)
        |> drop_gon(:test)

      actual = conn.private[:phoenix_gon].assets[:test]
      expectation = nil

      assert actual == expectation
    end
  end

  describe "get_gon" do
    test 'conn' do
      conn =
        %Conn{}
        |> with_gon
        |> put_gon(test: :test)

      actual = conn.private[:phoenix_gon].assets[:test]
      expectation = get_gon(conn, :test)

      assert actual == expectation
    end
  end
end
