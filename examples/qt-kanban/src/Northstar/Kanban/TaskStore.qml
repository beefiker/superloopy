pragma Singleton
import QtQuick

QtObject {
    readonly property ListModel tasks: ListModel {}
    property string selectedTaskId: "task-build-landing"
    property string query: ""
    property string priorityFilter: "all"
    property int revision: 0
    readonly property var columnOrder: ["backlog", "ready", "inProgress", "review"]

    property int _nextCreatedId: 1

    function reset() {
        tasks.clear()
        tasks.append({
            "id": "task-define-goals",
            "title": "Define launch goals",
            "description": "Align on launch outcomes and success criteria.",
            "columnId": "backlog",
            "priority": "Low",
            "dueDate": "May 19",
            "comments": 2,
            "checklistDone": 0,
            "checklistTotal": 0,
            "assignee": "Maya Patel"
        })
        tasks.append({
            "id": "task-audience-research",
            "title": "Audience research",
            "description": "Synthesize customer interviews and survey themes.",
            "columnId": "backlog",
            "priority": "Low",
            "dueDate": "May 16",
            "comments": 0,
            "checklistDone": 0,
            "checklistTotal": 0,
            "assignee": "Evan Brooks"
        })
        tasks.append({
            "id": "task-localize-launch",
            "title": "출시 체크리스트 현지화",
            "description": "Review Korean launch copy and regional details.",
            "columnId": "backlog",
            "priority": "Medium",
            "dueDate": "May 21",
            "comments": 1,
            "checklistDone": 1,
            "checklistTotal": 3,
            "assignee": "Lena Chen"
        })
        tasks.append({
            "id": "task-finalize-messaging",
            "title": "Finalize messaging",
            "description": "Refine the value proposition and key benefits.",
            "columnId": "ready",
            "priority": "High",
            "dueDate": "May 14",
            "comments": 1,
            "checklistDone": 0,
            "checklistTotal": 0,
            "assignee": "Maya Patel"
        })
        tasks.append({
            "id": "task-design-system",
            "title": "Design system updates",
            "description": "Add launch colors and refine the typography scale.",
            "columnId": "ready",
            "priority": "Medium",
            "dueDate": "May 18",
            "comments": 0,
            "checklistDone": 0,
            "checklistTotal": 0,
            "assignee": "Evan Brooks"
        })
        tasks.append({
            "id": "task-email-campaign",
            "title": "Email campaign plan",
            "description": "Outline the launch cadence and core messages.",
            "columnId": "ready",
            "priority": "Low",
            "dueDate": "May 22",
            "comments": 2,
            "checklistDone": 0,
            "checklistTotal": 0,
            "assignee": "Lena Chen"
        })
        tasks.append({
            "id": "task-build-landing",
            "title": "Build landing page",
            "description": "Implement the responsive launch page and finish interaction details.",
            "columnId": "inProgress",
            "priority": "High",
            "dueDate": "May 28",
            "comments": 3,
            "checklistDone": 2,
            "checklistTotal": 4,
            "assignee": "Noah Kim"
        })
        tasks.append({
            "id": "task-integrate-analytics",
            "title": "Integrate analytics",
            "description": "Connect event tracking and verify launch conversions.",
            "columnId": "inProgress",
            "priority": "Medium",
            "dueDate": "May 30",
            "comments": 1,
            "checklistDone": 0,
            "checklistTotal": 0,
            "assignee": "Maya Patel"
        })
        tasks.append({
            "id": "task-mobile-qa",
            "title": "QA on mobile",
            "description": "Check responsive behavior across supported device sizes.",
            "columnId": "inProgress",
            "priority": "Medium",
            "dueDate": "",
            "comments": 0,
            "checklistDone": 0,
            "checklistTotal": 0,
            "assignee": ""
        })
        tasks.append({
            "id": "task-demo-video",
            "title": "Product demo video",
            "description": "Review the storyboard, narration, and first cut.",
            "columnId": "review",
            "priority": "Medium",
            "dueDate": "Jun 5",
            "comments": 2,
            "checklistDone": 3,
            "checklistTotal": 4,
            "assignee": "Noah Kim"
        })
        tasks.append({
            "id": "task-go-to-market",
            "title": "Go-to-market checklist",
            "description": "Complete the final launch readiness checks.",
            "columnId": "review",
            "priority": "Low",
            "dueDate": "Jun 6",
            "comments": 0,
            "checklistDone": 8,
            "checklistTotal": 8,
            "assignee": "Lena Chen"
        })
        tasks.append({
            "id": "task-launch-readiness-review",
            "title": "Coordinate the final cross-functional launch readiness review",
            "description": "Confirm owners, release timing, support coverage, and escalation paths.",
            "columnId": "review",
            "priority": "High",
            "dueDate": "Jun 7",
            "comments": 4,
            "checklistDone": 5,
            "checklistTotal": 6,
            "assignee": "Maya Patel"
        })

        selectedTaskId = "task-build-landing"
        query = ""
        priorityFilter = "all"
        _nextCreatedId = 1
        revision = 0
    }

    function taskIndex(taskId) {
        const count = revision >= 0 ? tasks.count : 0
        for (let index = 0; index < count; ++index) {
            if (tasks.get(index).id === taskId)
                return index
        }
        return -1
    }

    function taskById(taskId) {
        const index = taskIndex(taskId)
        return index >= 0 ? tasks.get(index) : null
    }

    function matches(task) {
        if (!task)
            return false

        const filter = priorityFilter.toLowerCase()
        if (filter !== "all" && task.priority.toLowerCase() !== filter)
            return false

        const normalizedQuery = query.trim().toLowerCase()
        if (normalizedQuery.length === 0)
            return true

        return task.title.toLowerCase().indexOf(normalizedQuery) !== -1
                || task.description.toLowerCase().indexOf(normalizedQuery) !== -1
    }

    function visibleInColumn(columnId) {
        const visibleTasks = []
        const count = revision >= 0 ? tasks.count : 0
        for (let index = 0; index < count; ++index) {
            const task = tasks.get(index)
            if (task.columnId === columnId && matches(task))
                visibleTasks.push(task)
        }
        return visibleTasks
    }

    function countForColumn(columnId) {
        return visibleInColumn(columnId).length
    }

    function selectTask(taskId) {
        if (taskIndex(taskId) < 0)
            return false
        if (selectedTaskId === taskId)
            return true

        selectedTaskId = taskId
        revision += 1
        return true
    }

    function clearSelection() {
        if (selectedTaskId.length === 0)
            return false

        selectedTaskId = ""
        revision += 1
        return true
    }

    function moveTask(taskId, columnId) {
        const index = taskIndex(taskId)
        if (index < 0 || columnOrder.indexOf(columnId) < 0)
            return false
        if (tasks.get(index).columnId === columnId)
            return false

        tasks.setProperty(index, "columnId", columnId)
        revision += 1
        return true
    }

    function moveSelectedAdjacent(direction) {
        const task = taskById(selectedTaskId)
        if (!task)
            return false

        const step = direction < 0 ? -1 : direction > 0 ? 1 : 0
        if (step === 0)
            return false

        const destinationIndex = columnOrder.indexOf(task.columnId) + step
        if (destinationIndex < 0 || destinationIndex >= columnOrder.length)
            return false

        return moveTask(task.id, columnOrder[destinationIndex])
    }

    function addTask(title, columnId, priority) {
        const normalizedTitle = title ? title.toString().trim() : ""
        if (normalizedTitle.length === 0 || columnOrder.indexOf(columnId) < 0)
            return ""

        let taskId = ""
        do {
            taskId = "task-created-" + _nextCreatedId
            _nextCreatedId += 1
        } while (taskIndex(taskId) >= 0)

        tasks.append({
            "id": taskId,
            "title": normalizedTitle,
            "description": "",
            "columnId": columnId,
            "priority": normalizedPriority(priority),
            "dueDate": "",
            "comments": 0,
            "checklistDone": 0,
            "checklistTotal": 0,
            "assignee": ""
        })
        selectedTaskId = taskId
        revision += 1
        return taskId
    }

    function normalizedPriority(priority) {
        const value = priority ? priority.toString().trim().toLowerCase() : "medium"
        if (value === "high")
            return "High"
        if (value === "low")
            return "Low"
        return "Medium"
    }

    Component.onCompleted: reset()
}
