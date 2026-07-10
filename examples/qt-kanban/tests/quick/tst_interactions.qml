import QtQuick
import QtTest
import Northstar.Kanban

TestCase {
    id: testCase
    name: "BoardInteractions"
    when: windowShown
    width: 1300
    height: 700
    visible: true

    Component {
        id: viewComponent

        KanbanView {
            width: 1300
            height: 700
        }
    }

    function init() {
        TaskStore.reset()
    }

    function createView() {
        const view = createTemporaryObject(viewComponent, testCase)
        verify(view)
        waitForRendering(view)
        return view
    }

    function test_columns_bind_store_visible_arrays_and_counts() {
        const view = createView()
        const keys = ["backlog", "ready", "inProgress", "review"]

        for (const key of keys) {
            const column = findChild(view, "column-" + key)
            verify(column)
            compare(column.visibleCount, TaskStore.visibleInColumn(key).length)
            compare(findChild(column, "columnCount-" + key).text,
                    String(TaskStore.visibleInColumn(key).length))

            const accent = findChild(column, "stageAccent-" + key)
            verify(accent)
            compare(accent.width, column.width)
        }

        verify(findChild(view, "taskCard-task-build-landing"))
        verify(findChild(view, "taskCard-task-localize-launch"))
        verify(findChild(view, "taskCard-task-launch-readiness-review"))
    }

    function test_card_activation_selects_through_board() {
        const view = createView()
        const card = findChild(view, "taskCard-task-define-goals")
        const interaction = findChild(card, "cardInteraction")
        verify(card)
        verify(interaction)

        mouseClick(interaction)
        compare(TaskStore.selectedTaskId, "task-define-goals")
        verify(findChild(card, "selectionOutline").visible)
    }

    function test_search_is_case_insensitive_and_updates_visible_counts() {
        const view = createView()
        const search = findChild(view, "searchField")
        verify(search)

        search.forceActiveFocus(Qt.TabFocusReason)
        search.text = "LANDING"
        search.textEdited()
        tryCompare(TaskStore, "query", "LANDING")
        tryCompare(findChild(view, "columnCount-inProgress"), "text", "1")
        verify(findChild(view, "taskCard-task-build-landing"))
        verify(!findChild(view, "taskCard-task-integrate-analytics"))
    }

    function test_priority_filter_updates_columns_without_mutating_tasks() {
        const view = createView()
        const filter = findChild(view, "priorityFilter")
        verify(filter)

        filter.currentIndex = 1
        filter.activated(1)
        tryCompare(TaskStore, "priorityFilter", "high")
        tryCompare(findChild(view, "column-backlog"), "visibleCount", 0)
        compare(findChild(view, "column-ready").visibleCount, 1)
        compare(findChild(view, "column-inProgress").visibleCount, 1)
        compare(findChild(view, "column-review").visibleCount, 1)
        compare(TaskStore.taskById("task-build-landing").priority, "High")
    }

    function test_store_filter_state_drives_header_controls() {
        const view = createView()
        TaskStore.query = "analytics"
        TaskStore.priorityFilter = "medium"

        tryCompare(findChild(view, "searchField"), "text", "analytics")
        tryCompare(findChild(view, "priorityFilter"), "currentIndex", 2)
    }

    function test_empty_search_can_clear_and_restore_board() {
        const view = createView()
        TaskStore.query = "no result can match this phrase"
        TaskStore.priorityFilter = "high"

        const emptyState = findChild(view, "emptyBoardState")
        const resetButton = findChild(view, "clearBoardFiltersButton")
        verify(emptyState)
        verify(resetButton)
        tryVerify(function() { return emptyState.visible })
        verify(resetButton.visible)

        mouseClick(resetButton)
        compare(TaskStore.query, "")
        compare(TaskStore.priorityFilter, "all")
        tryVerify(function() { return !emptyState.visible })
        compare(findChild(view, "column-backlog").visibleCount, 3)
        compare(findChild(view, "column-ready").visibleCount, 3)
        compare(findChild(view, "column-inProgress").visibleCount, 3)
        compare(findChild(view, "column-review").visibleCount, 3)
    }
}
