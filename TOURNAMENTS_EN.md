# Tournaments

## 1. What are tournaments in Codebattle?

A tournament in Codebattle is a true arena for programmers, where the passion for coding meets the thrill of competition. Each match is a race against time between two players solving the same task. Imagine this: not only are you writing code, but you can also see how your opponent is doing it. You can peek at their ideas, but they can do the same to you! This creates a unique tension as both players see the results of their checks and the timer mercilessly counting down the remaining time. The winner is the one who solves the task faster and more accurately, but one wrong move can cost you the victory.

## 2. General Settings

Each tournament is a unique event with its own settings, but there are general parameters that make the game fair and interesting:

- **Supported programming languages**: Ruby, JavaScript (Node.js), TypeScript, Dart, C++, Java, Kotlin, C#, Go, Elixir, Python, PHP, Clojure, Haskell, Rust.
- **Task difficulty**: Tasks of various difficulty levels are possible — Elementary, Easy, Medium, Hard. You can choose the difficulty of the tasks for the entire tournament or for individual rounds, allowing you to adapt the tournament to the level of participants.
- **Match timeout**: If no one wins within the set time, the match is counted as a draw. This adds an element of urgency, making every minute precious.
- **Chat**: The ability to discuss strategies and communicate with other participants.
- **Live leaderboard**: Results are displayed in real-time, so you can immediately see who is leading.
- **Individual and team scoring**: In each type of tournament, you can choose individual scoring or pre-group participants into teams to display an overall team score.
- **Match history**: Each match is recorded on the server, and you can always review the entire game history. The recording shows who wrote the code, how quickly the tasks were completed, and what decisions were made. This is a great way to analyze the game and improve your skills.
- **Bots**: Virtual players, or bots, are used to maintain balance in the tournament. They are trained to solve tasks and adjust to the level of real participants, ensuring equal conditions for everyone. Bots can participate in matches when there aren’t enough real players or to create additional competition.
- **Player statistics**: Detailed statistics are collected for each player, including the average time to solve tasks, the number of wins and losses. This allows players to track their progress and compare themselves with other participants.

## 3. Types of Tournaments

### Individual

- **Description**: A knockout tournament where each match is a duel, and the winner advances.
- **How it works**: A bracket is created at the start of the tournament, with players paired off. In each round, participants face off one-on-one, and the winners move on to the next stage. The tournament continues until the final, where the absolute champion is determined.
- **How we supplement participants**: Only 2, 4, 8, 16, 32, 64, or 128 players are supported. If there are fewer participants, we add bots to ensure full competition.
- **Who it's for**: For those who want to feel like a gladiator in the coding world, advancing from round to round toward the coveted victory.

### Team

- **Description**: A battle between two teams, where each player is an important part of the overall success.
- **How it works**: Two teams battle through several rounds, aiming to score a certain number of points. In each round, team members conduct individual matches. A win in a round earns the team 1 point, a draw gives each team 0.5 points. The tournament ends when one of the teams reaches the set number of points.
- **How we supplement participants**: If there aren't enough teams for fair competition, we add bots.
- **Who it's for**: For those who value teamwork and strategic thinking, ready to achieve victory together with the team.

### Arena

- **Description**: A dynamic, endless tournament where players can join and leave at any time.
- **How it works**: In an arena tournament, you can specify the number of rounds, round timeout, and match time in advance. Players start battling in the initial rounds, and as the tournament progresses, the system tries to match winners with winners and losers with losers. This allows each player to face an opponent of their level after a few rounds. Consolation points can also be awarded — if a player loses the match but managed to partially solve the task (e.g., solved 90% of the task), they will receive 90% of the winner's points. If the solution covers only 10% of the task, they will receive 10% of the winner's points. The difficulty level of the tasks and the time allotted to solve them may change from round to round, adding an additional element of strategy.
- **How we supplement participants**: If there aren’t enough participants to ensure fair play, we add bots to maintain balance.
- **Who it's for**: For those who love dynamic competitions with the opportunity to test their skills at different levels.

### Show

- **Description**: A tournament where each player competes alone, solving tasks in front of an audience.
- **How it works**: Players solve tasks, competing for the best time and the most correct solutions. Each participant fights for themselves, and at the end of the tournament, the best player is determined.
- **How we supplement participants**: To maintain competition, we can add bots that will act as opponents.
- **Who it's for**: For those who like to showcase their skills and aim to be the best in individual scoring.

### Swiss

- **Description**: A Swiss-system tournament where participants play several rounds, meeting opponents with similar levels of success in each round.
- **How it works**: In each round, participants are matched with those who have a similar number of wins, creating equal conditions for all players. The winner is determined after several rounds.
- **How we supplement participants**: If the number of players is odd, we add bots to ensure an equal number of matches.
- **Who it's for**: For those who want to test their strength in a tournament where each round brings new challenges, and the results of previous games affect future matches.

### Versus

- **Description**: A tournament where each participant competes one-on-one with a randomly determined opponent.
- **How it works**: Participants face off in duels, where the winner advances, and the loser is eliminated. The tournament continues until there is one champion.
- **How we supplement participants**: If there aren't enough participants for fair competition, we add bots.
- **Who it's for**: For those who love intense duels and are ready to fight for the champion title.

### Squad

- **Description**: A team tournament where participants are divided into small teams and compete against each other.
- **How it works**: The tournament involves teams, each consisting of several players. Teams compete against each other, and the victory depends on the overall contribution of each team member.
- **How we supplement participants**: If teams lack players, we add bots to ensure equal chances for everyone.
- **Who it's for**: For those who prefer working in a team and are ready to use their skills in team strategy.
