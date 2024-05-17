defmodule CodebattleWeb.ExtApi.UserController do
  use CodebattleWeb, :controller

  alias Codebattle.Auth.User

  import Plug.Conn

  plug(CodebattleWeb.Plugs.TokenAuth)

  @names ~w(Pixel Byte Loop Code Algorithm Debug Script Function Syntax Module Variable Method Object Class Array Integer Float Boolean Pointer Reference Compiler Interpreter Namespace Package Interface Inheritance Polymorphism Abstraction Encapsulation Constructor Destructor Assertion Documentation Comment Library Framework Dependency Repository Branch Merge Conflict Commit Pull Remote Local Agile Scrum Kanban Waterfall Spiral)
  @adjectives ~w(Swift Agile Robust Stealthy Precise Nimble Efficient Reliable Versatile Dynamic Resilient Tenacious Sharp Astute Ingenious Crafty Clever Adaptable Resourceful Dexterous Brilliant Smart Intuitive Systematic Logical Strategic Tactical Flexible Creative Innovative Analytical Precise Methodical Persistent Perceptive Diligent Meticulous Inventive Quick-witted Cunning Problem-solving Insightful Versatile Ambitious Tenacious Robust Adaptive Ingenious Efficient Collaborative)

  def create(conn, params) do
    %{sound_settings: %{level: 0, type: "silent"}}
    |> cast_name(params)
    |> cast_clan(params)
    |> cast_auth_token(params)
    |> create_user_with_uniq_name(0)
    |> case do
      {:ok, user} ->
        conn
        |> put_status(200)
        |> json(%{status: "ok", name: user.name})

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{status: "error", error: reason})
    end
  end

  defp create_user_with_uniq_name(user_attrs, retries) when retries > 0 do
    user_attrs
    |> make_name_uniq()
    |> do_create_user(retries)
  end

  defp create_user_with_uniq_name(user_attrs, retries) do
    do_create_user(user_attrs, retries)
  end

  def do_create_user(user_attrs, retries) do
    case User.create_token_user(user_attrs) do
      {:ok, user} ->
        {:ok, user}

      {:error,
       %{errors: [name: {_reason, [constraint: :unique, constraint_name: "users_name_index"]}]}} ->
        create_user_with_uniq_name(user_attrs, retries + 1)

      {:error, changeset} ->
        {:error, inspect(changeset.errors)}
    end
  end

  defp cast_name(arrts, params) do
    name =
      case params["name"] do
        nil -> build_random_name()
        name -> name |> String.trim() |> String.slice(0..28)
      end

    Map.put(arrts, :name, name)
  end

  defp make_name_uniq(attrs) do
    postfix = 4 |> :crypto.strong_rand_bytes() |> Base.url_encode64(padding: false)

    Map.put(attrs, :name, attrs.name <> postfix)
  end

  defp cast_clan(arrts, %{"clan" => clan}) do
    Map.put(arrts, :clan, clan)
  end

  defp cast_clan(attrs, _params), do: attrs

  defp cast_auth_token(arrts, params) do
    auth_token =
      case params["auth_token"] do
        nil -> build_auth_token()
        token -> String.trim(token)
      end

    Map.put(arrts, :auth_token, auth_token)
  end

  defp build_random_name do
    "#{Enum.random(@adjectives)}#{Enum.random(@names)}"
  end

  defp build_auth_token do
    64 |> :crypto.strong_rand_bytes() |> Base.url_encode64(padding: false)
  end
end
