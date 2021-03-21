defmodule Codebattle.Oauth.User.FirebaseUser do
  @moduledoc """
    Basic user/password registration
  """

  alias Codebattle.{Repo, User, UsersActivityServer}

  def call() do
    IO.inspect(Application.get_env(:codebattle, :firebase)[:sender_id])
    api_key = IO.inspect(Application.get_env(:codebattle, :firebase)[:api_key])

    HTTPoison.post!(
      "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=#{api_key}",
      Jason.encode!(%{email: "vtmilyakov@gmail.com", password: "asdfasdf"})
    )
    |> IO.inspect()

    # response = %HTTPoison.Response{
  # body: "{\n  \"kind\": \"identitytoolkit#SignupNewUserResponse\",\n  \"idToken\": \"eyJhbGciOiJSUzI1NiIsImtpZCI6IjRlMDBlOGZlNWYyYzg4Y2YwYzcwNDRmMzA3ZjdlNzM5Nzg4ZTRmMWUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vY29kZWJhdHRsZS1mMTllZiIsImF1ZCI6ImNvZGViYXR0bGUtZjE5ZWYiLCJhdXRoX3RpbWUiOjE2MTYzNDA3ODEsInVzZXJfaWQiOiJWSVFKR01BZ09FYkVJa3NWdm52SDl1YVBSZXcxIiwic3ViIjoiVklRSkdNQWdPRWJFSWtzVnZudkg5dWFQUmV3MSIsImlhdCI6MTYxNjM0MDc4MSwiZXhwIjoxNjE2MzQ0MzgxLCJlbWFpbCI6InZ0bWlseWFrb3ZAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInZ0bWlseWFrb3ZAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.nCNMq3-v9MHeGTs-XEmntYex6hR5qrw8NKFtTQ6m7pdB1rcKmCgp2dnTuY0hs5A3NXCEFvwC1W375Um_UCPZM8RpCEAHRl5ri42niKqx5tZ9KtS65A9u_X5Gpn1VEpcflOae19RJccXCU-ovj905bMQDUksWMBVlPYVl-UCK2I7DepCUmM-zcF_3thjPIf1kRkxkV_qf-mRdKHDsI3PVcG1ANx1d4Kg4iNVmyyHncWT2ToWe47dRHxUyzkNRcldIayRAAK4XsRzHCz54-QtEHZaCdb5z1wT7CfDNhxgany_8xCdBJ2Wl9fgOts7kXkfq6k7PIpLd_IEtyTuQ3lrG2A\",\n  \"email\": \"vtmilyakov@gmail.com\",\n  \"refreshToken\": \"AOvuKvQZuKTwWQmXwKG8YTEpM6igoMRdEarmsBisYuC5Jn6dPNnZc7penzL8l28WHyIWjpojt_xUezmLsqYbD1gr-KgcTyf_SPrLH69Afy2nr0hjTbHEua26B5DHkKAeLcoJx_7OxMzXd3T4tRYO3g47jeKQLfrSDZX5QKt7nX5lknseTdU-PVw8BdjjArU5QxyDayL-1IQG3Z0FgJh7Dwhc5m6_05zkIA\",\n  \"expiresIn\": \"3600\",\n  \"localId\": \"VIQJGMAgOEbEIksVvnvH9uaPRew1\"\n}\n",
  # headers: [
    # {"Cache-Control", "no-cache, no-store, max-age=0, must-revalidate"},
    # {"Pragma", "no-cache"},
    # {"Date", "Sun, 21 Mar 2021 15:33:01 GMT"},
    # {"Expires", "Mon, 01 Jan 1990 00:00:00 GMT"},
    # {"Content-Type", "application/json; charset=UTF-8"},
    # {"Vary", "X-Origin"},
    # {"Vary", "Referer"},
    # {"Server", "ESF"},
    # {"X-XSS-Protection", "0"},
    # {"X-Frame-Options", "SAMEORIGIN"},
    # {"X-Content-Type-Options", "nosniff"},
    # {"Alt-Svc",
    #  "h3-29=\":443\"; ma=2592000,h3-T051=\":443\"; ma=2592000,h3-Q050=\":443\"; ma=2592000,h3-Q046=\":443\"; ma=2592000,h3-Q043=\":443\"; ma=2592000,quic=\":443\"; ma=2592000; v=\"46,43\""},
    # {"Accept-Ranges", "none"},
    # {"Vary", "Origin,Accept-Encoding"},
    # {"Transfer-Encoding", "chunked"}
  # ],
  # request: %HTTPoison.Request{
    # body: "{\"email\":\"vtmilyakov@gmail.com\",\"password\":\"asdfasdf\"}",
    # headers: [],
    # method: :post,
    # options: [],
    # params: %{},
    # url: "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBrxzR13boSpOTOmOXj9TywBvcAf3BR4DE"
  # },
  # request_url: "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBrxzR13boSpOTOmOXj9TywBvcAf3BR4DE",
  # status_code: 200
# }
  end

  def find(auth) do
    user = User |> Repo.get_by(firebase_uid: auth.uid)

    case user do
      nil ->
        UsersActivityServer.add_event(%{
          event: "user_is_not_authorized",
          user_id: nil,
          data: %{
            provider: "firebase"
          }
        })

        {:error, "User is not authorized"}

      _ ->
        UsersActivityServer.add_event(%{
          event: "user_is_authenticated",
          user_id: user.id,
          data: %{
            provider: "firebase"
          }
        })

        {:ok, user}
    end
  end

  def create(auth) do
    user_by_email = User |> Repo.get_by(email: auth.email)
    user_by_name = User |> Repo.get_by(name: auth.name)

    user_data = %{
      name: auth.name,
      email: auth.email,
      firebase_uid: auth.uid
    }

    case {user_by_name, user_by_email} do
      {nil, nil} ->
        changeset = User.changeset(%User{}, user_data)
        {:ok, user} = Repo.insert(changeset)

        UsersActivityServer.add_event(%{
          event: "user_is_authorized",
          user_id: user.id,
          data: %{
            provider: "firebase"
          }
        })

        {:ok, user}

      {%User{}, _} ->
        UsersActivityServer.add_event(%{
          event: "name_already_taken",
          user_id: nil,
          data: %{
            provider: "firebase"
          }
        })

        {:error, "Nickname already taken"}

      {_, %User{}} ->
        UsersActivityServer.add_event(%{
          event: "email_already_taken",
          user_id: nil,
          data: %{
            provider: "firebase"
          }
        })

        {:error, "Email already taken"}
    end
  end
end
