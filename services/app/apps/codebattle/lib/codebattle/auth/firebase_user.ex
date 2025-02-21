defmodule Codebattle.Auth.User.FirebaseUser do
  @moduledoc """
    Basic user/password registration
  """
  alias Codebattle.Repo
  alias Codebattle.User

  require Logger

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
         {:ok, firebase_uid} <- create_in_firebase(user_attrs) do
      create_in_db(user_attrs, firebase_uid)
    end
  end

  def reset(user_attrs) do
    reset_in_firebase(user_attrs)
  end

  defp check_existed_user(%{name: name, email: email} = user_attrs) do
    existed_users =
      User
      |> User.Scope.by_email_or_name(user_attrs)
      |> Repo.all()

    case existed_users do
      [] ->
        :ok

      [%User{name: ^name} | _] ->
        {:error, %{name: "Nickname is already taken"}}

      [%User{email: ^email} | _] ->
        {:error, %{email: "Email is already taken"}}
    end
  end

  defp create_in_firebase(%{email: email, password: password}) do
    case Req.post(
           "#{firebase_url()}:signUp?key=#{api_key()}",
           json: %{email: email, password: password}
         ) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        firebase_uid = Map.get(body, "localId")

        {:ok, firebase_uid}

      {:ok, %Req.Response{status: 400, body: body}} ->
        error_message =
          body
          |> Map.get("error")
          |> Map.get("message")

        {:error, %{base: error_message}}

      {:ok, %Req.Response{body: body}} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(body)}"}}

      {:error, reason} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(reason)}"}}
    end
  end

  defp find_in_firebase(%{email: email, password: password}) do
    case Req.post(
           "#{firebase_url()}:signInWithPassword?key=#{api_key()}",
           json: %{email: email, password: password, returnSecureToken: true}
         ) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        firebase_uid = Map.get(body, "localId")

        {:ok, firebase_uid}

      {:ok, %Req.Response{status: 400, body: body}} ->
        error_message =
          body
          |> Map.get("error")
          |> Map.get("message")

        {:error, %{base: error_message}}

      {:ok, %Req.Response{body: body}} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(body)}"}}

      {:error, reason} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(reason)}"}}
    end
  end

  defp reset_in_firebase(%{email: email}) do
    case Req.post(
           "#{firebase_url()}:sendOobCode?key=#{api_key()}",
           json: %{email: email, requestType: "PASSWORD_RESET"}
         ) do
      {:ok, %Req.Response{status: 200}} ->
        :ok

      {:ok, %Req.Response{status: 400, body: body}} ->
        error_message =
          body
          |> Map.get("error")
          |> Map.get("message")

        {:error, %{base: error_message}}

      {:ok, %Req.Response{body: body}} ->
        Logger.error(inspect(body))
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(body)}"}}

      {:error, reason} ->
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
    hash = email |> :erlang.md5() |> Base.encode16(case: :lower)

    "https://gravatar.com/avatar/#{hash}?d=identicon"
  end
end
