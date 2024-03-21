defmodule Codebattle.Oauth.User.FirebaseUser do
  @moduledoc """
    Basic user/password registration
  """
  require Logger

  alias Codebattle.{Repo, User}

  def find(user_attrs) do
    case find_in_firebase(user_attrs) do
      {:ok, firebase_uri} ->
        user = Repo.get_by!(User, firebase_uid: firebase_uri)

        {:ok, user}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def create(user_attrs) do
    with :ok <- check_existed_user(user_attrs),
         {:ok, firebase_uid} <- create_in_firebase(user_attrs),
         {:ok, user} <- create_in_db(user_attrs, firebase_uid) do
      {:ok, user}
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  def reset(user_attrs) do
    reset_in_firebase(user_attrs)
  end

  defp check_existed_user(user_attrs = %{name: name, email: email}) do
    existed_users =
      User
      |> User.Scope.by_email_or_name(user_attrs)
      |> Repo.all()

    case existed_users do
      [] ->
        :ok

      users ->
        case Enum.find_value(users, &check_user_attributes(&1, name, email)) do
          nil -> :ok
          error_reason -> {:error, error_reason}
        end
    end
  end

  defp check_user_attributes(user, name, email) do
    cond do
      user.name == name ->
        %{name: "Nickname is already taken"}

      user.email == email ->
        check_connected_email(user)

      true ->
        nil
    end
  end

  defp check_connected_email(user) do
    cond do
      user.discord_id != nil ->
        %{email: "Email is already used. Please sign in with Discord"}

      user.github_id != nil ->
        %{email: "Email is already used. Please sign in with Github"}

      true ->
        %{email: "Email is already taken"}
    end
  end

  defp create_in_firebase(%{email: email, password: password}) do
    case HTTPoison.post(
           "#{firebase_url()}:signUp?key=#{api_key()}",
           Jason.encode!(%{email: email, password: password})
         ) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        firebase_uid =
          body
          |> Jason.decode!()
          |> Map.get("localId")

        {:ok, firebase_uid}

      {:ok, %HTTPoison.Response{status_code: 400, body: body}} ->
        error_message =
          body
          |> Jason.decode!()
          |> Map.get("error")
          |> Map.get("message")

        {:error, %{base: error_message}}

      {:ok, %HTTPoison.Response{body: body}} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(body)}"}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(reason)}"}}
    end
  end

  defp find_in_firebase(%{email: email, password: password}) do
    case HTTPoison.post(
           "#{firebase_url()}:signInWithPassword?key=#{api_key()}",
           Jason.encode!(%{email: email, password: password, returnSecureToken: true})
         ) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        firebase_uid =
          body
          |> Jason.decode!()
          |> Map.get("localId")

        {:ok, firebase_uid}

      {:ok, %HTTPoison.Response{status_code: 400, body: body}} ->
        error_message =
          body
          |> Jason.decode!()
          |> Map.get("error")
          |> Map.get("message")

        {:error, %{base: error_message}}

      {:ok, %HTTPoison.Response{body: body}} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(body)}"}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(reason)}"}}
    end
  end

  defp reset_in_firebase(%{email: email}) do
    case HTTPoison.post(
           "#{firebase_url()}:sendOobCode?key=#{api_key()}",
           Jason.encode!(%{email: email, requestType: "PASSWORD_RESET"})
         ) do
      {:ok, %HTTPoison.Response{status_code: 200}} ->
        :ok

      {:ok, %HTTPoison.Response{status_code: 400, body: body}} ->
        error_message =
          body
          |> Jason.decode!()
          |> Map.get("error")
          |> Map.get("message")

        {:error, %{base: error_message}}

      {:ok, %HTTPoison.Response{body: body}} ->
        Logger.error(inspect(body))
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(body)}"}}

      {:error, %HTTPoison.Error{reason: reason}} ->
        Logger.error(inspect(reason))
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(reason)}"}}
    end
  end

  defp create_in_db(%{name: name, email: email}, firebase_uid) do
    changeset =
      User.changeset(%User{}, %{
        avatar_url: gravatar_url(email),
        name: name,
        email: email,
        firebase_uid: firebase_uid
      })

    case Repo.insert(changeset) do
      {:ok, user} ->
        {:ok, user}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  defp firebase_url do
    Application.get_env(:codebattle, :firebase)[:firebase_autn_url]
  end

  defp api_key do
    Application.get_env(:codebattle, :firebase)[:api_key]
  end

  defp gravatar_url(email) do
    hash = :erlang.md5(email) |> Base.encode16(case: :lower)

    "https://gravatar.com/avatar/#{hash}?d=identicon"
  end
end
