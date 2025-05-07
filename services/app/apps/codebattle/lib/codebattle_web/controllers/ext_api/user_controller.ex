defmodule CodebattleWeb.ExtApi.UserController do
  use CodebattleWeb, :controller

  import Plug.Conn

  alias Codebattle.Repo
  alias Codebattle.User
  alias Ecto.Changeset

  plug(CodebattleWeb.Plugs.TokenAuth)

  @default_settings %{
    sound_settings: %{level: 0, type: "silent"},
    subscription_type: "premium"
  }

  @max_name_length 28

  @names ~w(Pixel Byte Loop Code Algorithm Debug Script Function Syntax Module Variable Method Object Class Array Integer Float Boolean Pointer Reference Compiler Interpreter Namespace Package Interface Inheritance Polymorphism Abstraction Encapsulation Constructor Destructor Assertion Documentation Comment Library Framework Dependency Repository Branch Merge Conflict Commit Pull Remote Local Agile Scrum Kanban Waterfall Spiral)
  @adjectives ~w(Swift Agile Robust Stealthy Precise Nimble Efficient Reliable Versatile Dynamic Resilient Tenacious Sharp Astute Ingenious Crafty Clever Adaptable Resourceful Dexterous Brilliant Smart Intuitive Systematic Logical Strategic Tactical Flexible Creative Innovative Analytical Precise Methodical Persistent Perceptive Diligent Meticulous Inventive Quick-witted Cunning Problem-solving Insightful Versatile Ambitious Tenacious Robust Adaptive Ingenious Efficient Collaborative)

  def create(conn, %{"UID" => external_oauth_id} = params) do
    user_result =
      User
      |> Repo.get_by(external_oauth_id: external_oauth_id)
      |> case do
        nil -> create_user(external_oauth_id, params)
        user -> update_user(user, params)
      end

    with {:ok, user} <- user_result,
         event_slug = Application.get_env(:codebattle, :main_event_slug),
         true <- !is_nil(event_slug),
         event = Codebattle.Event.get_by_slug(event_slug),
         true <- !is_nil(event),
         user_event = Codebattle.UserEvent.get_by_user_id_and_event_id(user.id, event.id),
         true <- is_nil(user_event) do
      Codebattle.UserEvent.create(%{
        user_id: user.id,
        event_id: event.id,
        stages: []
      })
    end

    case user_result do
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

  def create(conn, _params) do
    conn
    |> put_status(422)
    |> json(%{status: "error", error: "UID is required"})
  end

  def create_user(external_oauth_id, params) do
    %{
      external_oauth_id: external_oauth_id
    }
    |> Map.merge(@default_settings)
    |> cast_name(params)
    |> cast_category(params)
    |> cast_clan(params)
    |> create_user_with_uniq_name(0)
  end

  def update_user(user, params) do
    update_params = @default_settings

    name = process_name(params["name"])
    update_params = Map.put(update_params, :name, name)

    update_params =
      case params do
        %{"category" => category} -> Map.put(update_params, :category, category)
        _ -> update_params
      end

    update_params =
      case params do
        %{"clan" => clan} -> Map.put(update_params, :clan, clan)
        _ -> update_params
      end

    user
    |> User.token_changeset(update_params)
    |> update_user_with_uniq_name(0)
  end

  defp create_user_with_uniq_name(user_attrs, retries) when retries > 0 do
    user_attrs
    |> make_name_uniq()
    |> do_create_user(retries)
  end

  defp create_user_with_uniq_name(user_attrs, retries) do
    do_create_user(user_attrs, retries)
  end

  defp update_user_with_uniq_name(changeset, retries) when retries > 0 do
    changeset
    |> make_name_changeset_uniq()
    |> do_update_user(retries)
  end

  defp update_user_with_uniq_name(changeset, retries) do
    do_update_user(changeset, retries)
  end

  defp do_create_user(user_attrs, retries) do
    case Codebattle.Auth.User.create_token_user(user_attrs) do
      {:ok, user} ->
        {:ok, user}

      {:error, %{errors: [name: {_, [constraint: :unique, constraint_name: "users_name_index"]}]}} ->
        create_user_with_uniq_name(user_attrs, retries + 1)

      {:error, changeset} ->
        {:error, inspect(changeset.errors)}
    end
  end

  defp do_update_user(changeset, retries) do
    case Repo.update(changeset) do
      {:ok, user} ->
        {:ok, user}

      {:error, %{errors: [name: {_, [constraint: :unique, constraint_name: "users_name_index"]}]}} ->
        update_user_with_uniq_name(changeset, retries + 1)

      {:error, changeset} ->
        {:error, inspect(changeset.errors)}
    end
  end

  defp generate_random_postfix do
    4 |> :crypto.strong_rand_bytes() |> Base.url_encode64(padding: false)
  end

  defp process_name(nil), do: build_random_name()
  defp process_name(name), do: name |> String.trim() |> String.slice(0..@max_name_length)

  # Attributes casting helpers
  defp cast_attribute(attrs, key, value), do: Map.put(attrs, key, value)

  defp cast_changeset_attribute(changeset, key, value), do: Changeset.put_change(changeset, key, value)

  defp cast_category(attrs, %{"category" => category}), do: cast_attribute(attrs, :category, category)

  defp cast_category(attrs, _params), do: attrs

  defp cast_name(attrs, params) do
    name = process_name(params["name"])
    cast_attribute(attrs, :name, name)
  end

  defp make_name_uniq(attrs) do
    Map.update!(attrs, :name, &(&1 <> generate_random_postfix()))
  end

  defp make_name_changeset_uniq(changeset) do
    current_name = Changeset.get_field(changeset, :name)
    cast_changeset_attribute(changeset, :name, current_name <> generate_random_postfix())
  end

  defp cast_clan(attrs, %{"clan" => clan}) do
    cast_attribute(attrs, :clan, Base.decode64!(clan))
  rescue
    _ -> cast_attribute(attrs, :clan, clan)
  end

  defp cast_clan(attrs, _params), do: attrs

  defp build_random_name do
    "#{Enum.random(@adjectives)}#{Enum.random(@names)}"
  end
end
