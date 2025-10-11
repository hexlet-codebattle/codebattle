# defmodule Codebattle.Tournament do
#   @moduledoc """
#   THis is description of tourmanets based on that we want to generate tournaments_schedule for the current season.

#   I want to generate upcoming graded tournaments for
#   rookie,  challenge, pro, elite, masters, grand_slam
#   We have 4 seasons

#     Season 0: Sep 21 - Dec 21
#     Season 1: Dec 21 - Mar 21
#     Season 2: Mar 21 - Jun 21
#     Season 3: Jun 21 - Sep 21

#   For each tournament i need insert into database
#   It should looks like, for each tournament
#   Prettify description with markdown

#   For tournaments that are only once in the day pic 16 UTC
#   and i don't need other tournaments that day.
#   GrandSlam should be the day when we finish season.

#   Repo.insert(%{

#   starts_at: {UTC generated datetime}
#   grade: "rookie",
#   name: "Rookie, Season:0, #1",
#   description: "
#   Codebattle Season contest
#   Points : {get from @grade_points based on grade}

#   Play in season tournaments and earn points.
#   Win the season and get achievement!

#   4 seasons:application

#   "

#   })

#   """

#   @grade_points %{
#     # Open tournaments
#     # All tasks are existing
#     # Casual/unranked mode, no points awarded
#     # Tasks: free play, any level, not ranked, created by user
#     "open" => [],

#     # Rookie — every 1 hours
#     # All tasks are existing
#     # Tasks: 5 existing easy tasks
#     # Designed for frequent play and grinding
#     "rookie" => [8, 4, 2],

#     # Challenger — daily
#     # All tasks are existing
#     # Tasks: 3 existing easy tasks + 1 existing medium task
#     # Daily backbone tournaments for steady point growth
#     "challenger" => [64, 32, 16, 8, 4, 2],

#     # Pro — weekly
#     # All tasks are existing
#     # Tasks: 4 existing easy tasks + 2 existing medium tasks
#     # Mid-level weekly tournaments with more challenges
#     "pro" => [128, 64, 32, 16, 8, 4, 2],

#     # Elite — every two weeks
#     # All tasks are existing
#     # Tasks: 5 existing easy tasks + 3 existing medium tasks
#     # Advanced difficulty and higher prestige
#     "elite" => [256, 128, 64, 32, 16, 8, 4, 2],

#     # Masters — once per month on the 21st (evening, two per day)
#     # All tasks are new
#     # Tasks: 5 easy tasks + 2 medium tasks
#     # Monthly major tournaments with fresh content
#     "masters" => [1024, 512, 256, 128, 64, 32, 16, 8, 4, 2],

#     # Grand Slam — four times per year (21 Mar, 21 Jun, 21 Sep, 21 Dec)
#     # All tasks are new
#     # Tasks: 5 easy tasks + 3 medium tasks + 1 hard task
#     # Seasonal finals, always ends the season
#     "grand_slam" => [2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2]
#   }
# end
