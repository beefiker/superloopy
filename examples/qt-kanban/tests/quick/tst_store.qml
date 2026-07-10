import QtQuick
import QtTest
import Northstar.Kanban

TestCase {
    name: "TaskStore"

    readonly property var seedIds: [
        "task-define-goals",
        "task-audience-research",
        "task-localize-launch",
        "task-finalize-messaging",
        "task-design-system",
        "task-email-campaign",
        "task-build-landing",
        "task-integrate-analytics",
        "task-mobile-qa",
        "task-demo-video",
        "task-go-to-market",
        "task-launch-readiness-review"
    ]

    function init() {
        TaskStore.reset()
    }

    function taskIds() {
        const ids = []
        for (let index = 0; index < TaskStore.tasks.count; ++index)
            ids.push(TaskStore.tasks.get(index).id)
        return ids
    }

    function visibleIds(columnId) {
        return TaskStore.visibleInColumn(columnId).map(task => task.id)
    }

    function test_seed_is_deterministic() {
        compare(JSON.stringify(taskIds()), JSON.stringify(seedIds))
        compare(TaskStore.selectedTaskId, "task-build-landing")
        compare(TaskStore.query, "")
        compare(TaskStore.priorityFilter, "all")
        compare(TaskStore.revision, 0)
        compare(JSON.stringify(TaskStore.columnOrder),
                JSON.stringify(["backlog", "ready", "inProgress", "review"]))
    }

    function test_seed_covers_layout_cases_and_canonical_roles() {
        const koreanTask = TaskStore.taskById("task-localize-launch")
        verify(koreanTask.title.indexOf("출시") !== -1)

        const longTask = TaskStore.taskById("task-launch-readiness-review")
        verify(longTask.title.length > 50)

        const completedTask = TaskStore.taskById("task-go-to-market")
        verify(completedTask.checklistTotal > 0)
        compare(completedTask.checklistDone, completedTask.checklistTotal)

        const highTask = TaskStore.taskById("task-build-landing")
        compare(highTask.priority, "High")
        verify(highTask.description.length > 0)
        verify(highTask.dueDate.length > 0)
        verify(highTask.comments >= 0)
        verify(highTask.checklistDone >= 0)
        verify(highTask.checklistTotal >= 0)
        verify(highTask.assignee.length > 0)

        const sparseTask = TaskStore.taskById("task-mobile-qa")
        compare(sparseTask.dueDate, "")
        compare(sparseTask.assignee, "")
    }

    function test_search_is_case_insensitive_across_title_and_description() {
        TaskStore.query = "LANDING"
        compare(JSON.stringify(visibleIds("inProgress")),
                JSON.stringify(["task-build-landing"]))

        TaskStore.query = "CONVERSIONS"
        compare(JSON.stringify(visibleIds("inProgress")),
                JSON.stringify(["task-integrate-analytics"]))

        TaskStore.query = "  launch  "
        verify(TaskStore.matches(TaskStore.taskById("task-define-goals")))
    }

    function test_priority_filters_without_mutating_roles() {
        const originalPriorities = []
        for (let index = 0; index < TaskStore.tasks.count; ++index)
            originalPriorities.push(TaskStore.tasks.get(index).priority)

        const filters = ["high", "medium", "low", "all"]
        for (let filterIndex = 0; filterIndex < filters.length; ++filterIndex) {
            const filter = filters[filterIndex]
            TaskStore.priorityFilter = filter
            for (let taskIndex = 0; taskIndex < TaskStore.tasks.count; ++taskIndex) {
                const task = TaskStore.tasks.get(taskIndex)
                compare(TaskStore.matches(task),
                        filter === "all" || task.priority.toLowerCase() === filter)
            }
        }

        const currentPriorities = []
        for (let index = 0; index < TaskStore.tasks.count; ++index)
            currentPriorities.push(TaskStore.tasks.get(index).priority)
        compare(JSON.stringify(currentPriorities), JSON.stringify(originalPriorities))
    }

    function test_missing_ids_fail_without_revision_changes() {
        const before = TaskStore.revision
        compare(TaskStore.taskIndex("missing-task"), -1)
        compare(TaskStore.taskById("missing-task"), null)
        verify(!TaskStore.selectTask("missing-task"))
        verify(!TaskStore.moveTask("missing-task", "ready"))
        compare(TaskStore.revision, before)
        compare(TaskStore.selectedTaskId, "task-build-landing")
    }

    function test_move_task_updates_count_and_revision() {
        const before = TaskStore.revision
        const inProgress = TaskStore.countForColumn("inProgress")
        const ready = TaskStore.countForColumn("ready")

        verify(TaskStore.moveTask("task-build-landing", "ready"))
        compare(TaskStore.taskById("task-build-landing").columnId, "ready")
        compare(TaskStore.countForColumn("inProgress"), inProgress - 1)
        compare(TaskStore.countForColumn("ready"), ready + 1)
        compare(TaskStore.revision, before + 1)
        compare(TaskStore.selectedTaskId, "task-build-landing")
    }

    function test_move_rejects_unknown_columns_and_no_op_moves() {
        const before = TaskStore.revision
        verify(!TaskStore.moveTask("task-build-landing", "unknown"))
        verify(!TaskStore.moveTask("task-build-landing", "inProgress"))
        compare(TaskStore.revision, before)
        compare(TaskStore.taskById("task-build-landing").columnId, "inProgress")
    }

    function test_adjacent_moves_honor_column_boundaries() {
        verify(TaskStore.selectTask("task-define-goals"))
        const backlogRevision = TaskStore.revision
        verify(!TaskStore.moveSelectedAdjacent(-1))
        compare(TaskStore.revision, backlogRevision)
        verify(TaskStore.moveSelectedAdjacent(1))
        compare(TaskStore.taskById("task-define-goals").columnId, "ready")
        compare(TaskStore.revision, backlogRevision + 1)

        verify(TaskStore.selectTask("task-demo-video"))
        const reviewRevision = TaskStore.revision
        verify(!TaskStore.moveSelectedAdjacent(1))
        compare(TaskStore.revision, reviewRevision)
    }

    function test_selection_mutations_increment_revision_once() {
        const before = TaskStore.revision
        verify(TaskStore.selectTask("task-define-goals"))
        compare(TaskStore.selectedTaskId, "task-define-goals")
        compare(TaskStore.revision, before + 1)

        verify(TaskStore.selectTask("task-define-goals"))
        compare(TaskStore.revision, before + 1)

        verify(TaskStore.clearSelection())
        compare(TaskStore.selectedTaskId, "")
        compare(TaskStore.revision, before + 2)
        verify(!TaskStore.clearSelection())
        compare(TaskStore.revision, before + 2)
    }

    function test_add_rejects_invalid_input_without_mutation() {
        const beforeCount = TaskStore.tasks.count
        const beforeRevision = TaskStore.revision
        compare(TaskStore.addTask("   ", "backlog", "medium"), "")
        compare(TaskStore.addTask("Valid title", "missing", "medium"), "")
        compare(TaskStore.tasks.count, beforeCount)
        compare(TaskStore.revision, beforeRevision)
    }

    function test_add_creates_trimmed_unique_tasks_and_selects_them() {
        const ready = TaskStore.countForColumn("ready")
        const before = TaskStore.revision
        const firstId = TaskStore.addTask("  Prepare launch brief  ", "ready", "high")
        compare(firstId, "task-created-1")
        compare(TaskStore.selectedTaskId, firstId)
        compare(TaskStore.revision, before + 1)
        compare(TaskStore.countForColumn("ready"), ready + 1)

        const firstTask = TaskStore.taskById(firstId)
        compare(firstTask.title, "Prepare launch brief")
        compare(firstTask.columnId, "ready")
        compare(firstTask.priority, "High")
        compare(firstTask.description, "")
        compare(firstTask.dueDate, "")
        compare(firstTask.comments, 0)
        compare(firstTask.checklistDone, 0)
        compare(firstTask.checklistTotal, 0)
        compare(firstTask.assignee, "")

        const secondId = TaskStore.addTask("Confirm speaker", "backlog", "Low")
        compare(secondId, "task-created-2")
        verify(secondId !== firstId)
        compare(TaskStore.revision, before + 2)
    }

    function test_reset_restores_isolated_deterministic_state() {
        TaskStore.query = "landing"
        TaskStore.priorityFilter = "high"
        verify(TaskStore.moveTask("task-build-landing", "review"))
        verify(TaskStore.addTask("Temporary task", "ready", "low"))
        verify(TaskStore.clearSelection())

        TaskStore.reset()

        compare(JSON.stringify(taskIds()), JSON.stringify(seedIds))
        compare(TaskStore.taskById("task-build-landing").columnId, "inProgress")
        compare(TaskStore.selectedTaskId, "task-build-landing")
        compare(TaskStore.query, "")
        compare(TaskStore.priorityFilter, "all")
        compare(TaskStore.revision, 0)
        compare(TaskStore.addTask("Fresh task", "backlog", "medium"), "task-created-1")
    }
}
