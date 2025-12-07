AcademicFocus Planner System
                                ----------------------------

+----------------+                                          +---------------------+
| Student (User) |----------------------------------------->| Scheduler           |
+----------------+                                          |---------------------|
| * Trigger actions                                         | Enter Goal Deadline |
| * Interact with UI                                        | Add Topics & Difficulty |
+----------------+                                          | Define Study Slots  |
                                                          | Calculate Workload  |
+----------------------+                                    | Review & Add Sessions |
| Data Store           |<----------------------------------+---------------------+
| (Local Storage)      |
| * Persists 'sessions'|
+----------------------+                                    +---------------------+
            |                                               | Planner             |
            |                                               |---------------------|
            v                                               | View Day/Week/Month |
+----------------------+                                    | Add/Edit Sessions   |
| JavaScript Logic     |                                    | Set Priority        |
| (Controller)         |<-----------------------------------| Integrate Generated |
| * State Mgmt         |                                    +---------------------+
| * Event Handlers     |
| * Schedule Algo      |                                    +---------------------+
+----------------------+                                    | Stats               |
            |                                               |---------------------|
            +--------------------------------------------->| Total Hours Studied |
            |                                               | Current Study Streak|
            v                                               | Subject Distribution|
+----------------------+                                    +---------------------+
| Pomodoro Timer Modal |
|----------------------|
| Start / Pause / Reset|
+----------------------+