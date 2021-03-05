# defmodule CodebattleWeb.InviteController do
#   use CodebattleWeb, :controller

#   alias Codebattle.Activities
#   alias Codebattle.Activities.Invite
#   alias Codebattle.GameProcess.{Play, ActiveGames, FsmHelpers}
#   alias Codebattle.{User, Languages, UsersActivityServer}

#   def index(conn, _params) do
#     invites = Activities.list_invites()
#     render(conn, "index.html", invites: invites)
#   end

#   def new(conn, _params) do
#     changeset = Activities.change_invite(%Invite{})
#     render(conn, "new.html", changeset: changeset)
#   end

#   def create(conn, %{"invite" => invite_params}) do
#     case Activities.create_invite(invite_params) do
#       {:ok, invite} ->
#         conn
#         |> put_flash(:info, "Invite created successfully.")
#         |> redirect(to: Routes.invite_path(conn, :show, invite))

#       {:error, %Ecto.Changeset{} = changeset} ->
#         render(conn, "new.html", changeset: changeset)
#     end
#   end

#   def show(conn, %{"id" => id}) do
#     user = conn.assigns.current_user
#     invite = Activities.get_invite!(id)
#     if user.id == invite.creator_id or user.id == invite.recepient_id do
#       render(conn, "show.html", invite: invite)
#     end
#     conn
#       |> put_flash(:danger, "This invite is not for you.")
#       |> redirect(to: Routes.page_path(conn, :index))
#   end

#   def edit(conn, %{"id" => id}) do
#     invite = Activities.get_invite!(id)
#     changeset = Activities.change_invite(invite)
#     render(conn, "edit.html", invite: invite, changeset: changeset)
#   end

#   def update(conn, %{"id" => id} = params) do
#     invite = Activities.get_invite!(id)
#     |> IO.inspect()
#     users = [invite.creator, invite.recepient]

#     level = params["level"] || "elementary"
#     type = params["type"] || "public"
#     game_params = %{
#       level: level,
#       type: type,
#       timeout_seconds: 3600,
#       users: users
#     }

#     case Activities.update_invite(invite, %{state: "accepted"}) do
#       {:ok, invite} ->

#         case Play.start_game(game_params) do
#           {:ok, fsm} ->
#             game_id = FsmHelpers.get_game_id(fsm)
#             level = FsmHelpers.get_level(fsm)
#             redirect(conn, to: Routes.game_path(conn, :show, game_id, level: level))

#             {:error, _reason} ->
#               redirect(conn, to: Routes.page_path(conn, :index))
#         end
#         conn
#         |> put_flash(:info, "Invite accepted!")
#         |> redirect(to: Routes.invite_path(conn, :show, invite))

#       {:error, %Ecto.Changeset{} = changeset} ->
#         render(conn, "edit.html", invite: invite, changeset: changeset)
#     end
#   end

#   def delete(conn, %{"id" => id}) do
#     user = conn.assigns.current_user
#     invite = Activities.get_invite!(id)
#     if user.id == invite.creator_id or user.id == invite.recepient_id do
#       {:ok, _invite} = Activities.update_invite(invite, %{state: "cancelled"})
#       conn
#         |> put_flash(:info, "Invite rejected successfully.")
#         |> redirect(to: Routes.invite_path(conn, :index))
#     end
#     conn
#       |> put_flash(:danger, "This invite is not for you.")
#       |> redirect(to: Routes.page_path(conn, :index))
#   end
# end
