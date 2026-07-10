import QtQuick
import QtTest
import Northstar.Kanban

TestCase {
    id: testCase
    name: "Responsive"
    when: windowShown

    Component {
        id: viewComponent

        KanbanView {
            height: 700
        }
    }

    function createView(viewWidth) {
        const view = createTemporaryObject(viewComponent, testCase, {
            "width": viewWidth
        })
        verify(view)
        wait(0)
        return view
    }

    function test_breakpoints_data() {
        return [
            { "tag": "persistent-1600", "viewWidth": 1600,
              "expectedSidebarWidth": 224, "expectedPersistent": true,
              "expectedOverlay": false },
            { "tag": "full-overlay-1300", "viewWidth": 1300,
              "expectedSidebarWidth": 224, "expectedPersistent": false,
              "expectedOverlay": true },
            { "tag": "compact-overlay-1000", "viewWidth": 1000,
              "expectedSidebarWidth": 72, "expectedPersistent": false,
              "expectedOverlay": true },
            { "tag": "minimum-overlay-900", "viewWidth": 900,
              "expectedSidebarWidth": 72, "expectedPersistent": false,
              "expectedOverlay": true }
        ]
    }

    function test_breakpoints(data) {
        const view = createView(data.viewWidth)

        compare(view.sidebarWidth, data.expectedSidebarWidth)
        compare(view.drawerPersistent, data.expectedPersistent)
        compare(view.drawerOverlay, data.expectedOverlay)

        const sidebar = findChild(view, "sidebar")
        verify(sidebar)
        tryCompare(sidebar, "width", data.expectedSidebarWidth)
    }

    function test_shell_exposes_stable_control_names() {
        const view = createView(1600)

        verify(findChild(view, "kanbanHeader"))
        verify(findChild(view, "boardView"))
        verify(findChild(view, "searchField"))
        verify(findChild(view, "priorityFilter"))
        verify(findChild(view, "newTaskButton"))
    }

    function test_compact_board_preserves_column_minimum_and_overflows() {
        const view = createView(1000)
        const board = findChild(view, "boardView")
        verify(board)

        tryVerify(function() { return board.width > 0 })
        compare(board.columnWidth, Theme.columnMinimumWidth)
        compare(view.boardContentWidth,
                4 * Theme.columnMinimumWidth + 3 * Theme.boardGutter)
        verify(view.boardContentWidth > board.width)
        verify(board.contentWidth > board.width)
    }

    function test_minimum_width_keeps_horizontal_overflow() {
        const view = createView(900)
        const board = findChild(view, "boardView")
        verify(board)

        tryVerify(function() { return board.width > 0 })
        compare(board.columnWidth, Theme.columnMinimumWidth)
        verify(board.contentWidth > board.width)
    }

    function test_sidebar_unavailable_destinations_share_one_status_surface() {
        const view = createView(1300)
        const timeline = findChild(view, "timelineButton")
        const inbox = findChild(view, "inboxButton")
        const status = findChild(view, "statusToast")
        verify(timeline)
        verify(inbox)
        verify(status)

        timeline.clicked()
        compare(status.text, "Timeline is not available in this demo")

        inbox.clicked()
        compare(status.text, "Inbox is not available in this demo")
    }
}
