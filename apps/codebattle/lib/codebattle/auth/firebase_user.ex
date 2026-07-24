defmodule Codebattle.Auth.User.FirebaseUser do
  @moduledoc """
    Basic user/password registration.

    The local `User` row is created lazily on the first *verified* sign in
    (see `find/1`), never at registration time. Registration only reserves the
    account in Firebase and sends the verification email, so an abandoned
    (never-verified) signup can't permanently lock a nickname or email in our
    database. The nickname chosen at signup is stashed in Firebase as the
    account `displayName` and read back when the local row is created.
  """
  alias Codebattle.Repo
  alias Codebattle.User

  require Logger

  def find(user_attrs) do
    with {:ok, account} <- find_in_firebase(user_attrs) do
      get_or_create_user(account)
    end
  end

  def create(%{name: name} = user_attrs) do
    with :ok <- check_nickname(name) do
      register_in_firebase(user_attrs)
    end
  end

  def reset(user_attrs) do
    reset_in_firebase(user_attrs)
  end

  # Only the nickname is validated against the DB. Email uniqueness is enforced
  # by Firebase, and we deliberately don't disclose whether an email is taken
  # (see `register_in_firebase/1`).
  defp check_nickname(name) do
    case Repo.get_by(User, name: name) do
      nil -> :ok
      %User{} -> {:error, %{name: "Nickname is already taken"}}
    end
  end

  defp register_in_firebase(%{name: name, email: email, password: password}) do
    case Req.post(
           "#{firebase_url()}:signUp?key=#{api_key()}",
           json: %{email: email, password: password}
         ) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        id_token = Map.get(body, "idToken")
        # Persist the chosen nickname so we can recreate it locally at first
        # verified login. Verification keeps the account unusable until the
        # user confirms their email (enforced in `find_in_firebase/1`).
        set_display_name(id_token, name)
        send_email_verification(id_token)
        {:ok, :verification_sent}

      {:ok, %Req.Response{status: 400, body: body}} ->
        error_message =
          body
          |> Map.get("error")
          |> Map.get("message")

        # Never reveal that an email is already registered: return the same
        # success as a brand-new signup so the endpoint can't be used to
        # enumerate accounts. Nothing is sent for the existing account.
        if error_message == "EMAIL_EXISTS" do
          {:ok, :verification_sent}
        else
          {:error, %{base: error_message}}
        end

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
        id_token = Map.get(body, "idToken")

        case lookup_account(id_token) do
          {:ok, %{verified: true, name: name, email: account_email}} ->
            {:ok, %{firebase_uid: firebase_uid, name: name, email: account_email}}

          {:ok, %{verified: false}} ->
            send_email_verification(id_token)
            {:error, %{base: "EMAIL_NOT_VERIFIED"}}

          {:error, reason} ->
            Logger.error("Unable to verify Firebase email status: #{inspect(reason)}")
            {:error, %{base: "Unable to verify email status. Please try again later."}}
        end

      # Return one generic message for every credential failure (EMAIL_NOT_FOUND,
      # INVALID_PASSWORD, INVALID_LOGIN_CREDENTIALS, …) so the sign-in form can't
      # be used to tell registered emails from unregistered ones.
      {:ok, %Req.Response{status: 400, body: body}} ->
        Logger.info("Firebase sign in rejected: #{inspect(Map.get(body, "error"))}")
        {:error, %{base: "Invalid email or password"}}

      {:ok, %Req.Response{body: body}} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(body)}"}}

      {:error, reason} ->
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(reason)}"}}
    end
  end

  defp lookup_account(id_token) when is_binary(id_token) do
    case Req.post(
           "#{firebase_url()}:lookup?key=#{api_key()}",
           json: %{idToken: id_token}
         ) do
      {:ok, %Req.Response{status: 200, body: %{"users" => [account | _]}}} ->
        {:ok,
         %{
           verified: Map.get(account, "emailVerified", false),
           name: Map.get(account, "displayName"),
           email: Map.get(account, "email")
         }}

      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, {status, body}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp lookup_account(_), do: {:error, :missing_id_token}

  defp set_display_name(id_token, name) when is_binary(id_token) do
    case Req.post(
           "#{firebase_url()}:update?key=#{api_key()}",
           json: %{idToken: id_token, displayName: name, returnSecureToken: false}
         ) do
      {:ok, %Req.Response{status: 200}} ->
        :ok

      {:ok, %Req.Response{body: body}} ->
        Logger.error("Unable to set Firebase displayName: #{inspect(body)}")
        {:error, body}

      {:error, reason} ->
        Logger.error("Unable to set Firebase displayName: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp set_display_name(_, _), do: {:error, :missing_id_token}

  defp send_email_verification(id_token) when is_binary(id_token) do
    case Req.post(
           "#{firebase_url()}:sendOobCode?key=#{api_key()}",
           json: %{requestType: "VERIFY_EMAIL", idToken: id_token}
         ) do
      {:ok, %Req.Response{status: 200}} ->
        :ok

      {:ok, %Req.Response{body: body}} ->
        Logger.error("Unable to send Firebase verification email: #{inspect(body)}")
        {:error, body}

      {:error, reason} ->
        Logger.error("Unable to send Firebase verification email: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp send_email_verification(_), do: {:error, :missing_id_token}

  defp reset_in_firebase(%{email: email}) do
    case Req.post(
           "#{firebase_url()}:sendOobCode?key=#{api_key()}",
           json: %{email: email, requestType: "PASSWORD_RESET"}
         ) do
      {:ok, %Req.Response{status: 200}} ->
        :ok

      # Never disclose whether the email is registered (e.g. EMAIL_NOT_FOUND):
      # a reset request always reports success so the form can't be used to
      # enumerate accounts. Genuine outages (transport/5xx) are still surfaced.
      {:ok, %Req.Response{status: 400, body: body}} ->
        Logger.info("Firebase password reset request ignored: #{inspect(body)}")
        :ok

      {:ok, %Req.Response{body: body}} ->
        Logger.error(inspect(body))
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(body)}"}}

      {:error, reason} ->
        Logger.error(inspect(reason))
        {:error, %{base: "Something went wrong, pls, try again later. #{inspect(reason)}"}}
    end
  end

  # Materializes the local account on the first verified sign in. Returns the
  # existing row on subsequent logins.
  defp get_or_create_user(%{firebase_uid: firebase_uid} = account) do
    case Repo.get_by(User, firebase_uid: firebase_uid) do
      %User{} = user -> {:ok, user}
      nil -> create_in_db(account)
    end
  end

  defp create_in_db(%{firebase_uid: firebase_uid, name: name, email: email}) do
    name = resolve_name(name, email)

    case insert_user(name, email, firebase_uid) do
      {:ok, user} ->
        {:ok, user}

      {:error, %Ecto.Changeset{} = changeset} ->
        # Rare: two unverified signups reserved the same nickname and both
        # verified. Disambiguate so the verified user can still sign in.
        if name_taken?(changeset) do
          disambiguated = "#{String.slice(name, 0, 32)}_#{String.slice(firebase_uid, 0..5)}"
          insert_or_fail(disambiguated, email, firebase_uid)
        else
          {:error, %{base: "Something went wrong, pls, try again later."}}
        end
    end
  end

  defp insert_or_fail(name, email, firebase_uid) do
    case insert_user(name, email, firebase_uid) do
      {:ok, user} -> {:ok, user}
      {:error, _} -> {:error, %{base: "Something went wrong, pls, try again later."}}
    end
  end

  defp insert_user(name, email, firebase_uid) do
    %User{}
    |> User.changeset(%{
      lang: Application.get_env(:codebattle, :default_lang_slug),
      avatar_url: gravatar_url(email),
      name: name,
      email: email,
      firebase_uid: firebase_uid
    })
    |> Repo.insert()
  end

  defp resolve_name(name, _email) when is_binary(name) and name != "", do: name
  defp resolve_name(_name, email), do: email |> String.split("@") |> List.first()

  defp name_taken?(%Ecto.Changeset{errors: errors}), do: Keyword.has_key?(errors, :name)

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
