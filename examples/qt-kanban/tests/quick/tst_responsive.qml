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

    function init() {
        Theme.baseFontPixelSize = 13
        Theme.motionEnabled = true
    }

    function cleanup() {
        Theme.baseFontPixelSize = 13
        Theme.motionEnabled = true
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

    function test_compact_sidebar_content_stays_within_bounds_data() {
        return [
            { "tag": "compact-1000", "viewWidth": 1000 },
            { "tag": "minimum-900", "viewWidth": 900 }
        ]
    }

    function test_compact_sidebar_content_stays_within_bounds(data) {
        const view = createView(data.viewWidth)
        const sidebar = findChild(view, "sidebar")
        verify(sidebar)

        const content = [
            findChild(view, "boardButton"),
            findChild(view, "timelineButton"),
            findChild(view, "inboxButton"),
            findChild(view, "teamCluster"),
            findChild(view, "settingsButton"),
            findChild(view, "helpButton")
        ]

        for (const item of content) {
            verify(item)
            tryVerify(function() { return item.width > 0 })
            const origin = item.mapToItem(sidebar, 0, 0)
            verify(origin.x >= sidebar.leftPadding)
            verify(origin.x + item.width <= sidebar.width - sidebar.rightPadding)
            verify(item.width <= sidebar.availableWidth)
        }
    }

    function test_board_navigation_exposes_current_checked_state() {
        const view = createView(1000)
        const boardButton = findChild(view, "boardButton")
        const timelineButton = findChild(view, "timelineButton")
        verify(boardButton)
        verify(timelineButton)

        verify(boardButton.checkable)
        verify(boardButton.checked)
        verify(!timelineButton.checkable)
        verify(!timelineButton.checked)
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

    function test_rtl_mirrors_shell_columns_and_directional_controls() {
        const view = createTemporaryObject(viewComponent, testCase, {
            "width": 1600,
            "rightToLeft": true
        })
        verify(view)
        waitForRendering(view)

        verify(view.LayoutMirroring.enabled)
        const sidebar = findChild(view, "sidebar")
        const board = findChild(view, "boardView")
        const backlog = findChild(view, "column-backlog")
        const review = findChild(view, "column-review")
        const drawer = findChild(view, "persistentDetailDrawer")
        const previousButton = findChild(drawer, "movePreviousButton")
        const nextButton = findChild(drawer, "moveNextButton")
        verify(sidebar)
        verify(board)
        verify(backlog)
        verify(review)
        verify(previousButton)
        verify(nextButton)

        verify(sidebar.x > board.x)
        const backlogPosition = backlog.mapToItem(board, 0, 0).x
        const reviewPosition = review.mapToItem(board, 0, 0).x
        verify(backlogPosition > reviewPosition,
               "RTL column positions: backlog=" + backlogPosition
               + ", review=" + reviewPosition)
        verify(previousButton.mapToItem(drawer, 0, 0).x
               > nextButton.mapToItem(drawer, 0, 0).x)
        compare(previousButton.Accessible.name,
                "Move task to previous column")
        compare(nextButton.Accessible.name, "Move task to next column")
    }

    function test_compact_rtl_starts_at_backlog_and_remains_scrollable() {
        const view = createTemporaryObject(viewComponent, testCase, {
            "width": 1000,
            "rightToLeft": true
        })
        verify(view)
        waitForRendering(view)

        const board = findChild(view, "boardView")
        const backlog = findChild(view, "column-backlog")
        verify(board)
        verify(backlog)
        const rtlStart = Math.max(0, board.contentWidth - board.width)
        verify(rtlStart > 0)
        tryCompare(board, "contentX", rtlStart)

        const backlogPosition = backlog.mapToItem(board, 0, 0).x
        verify(backlogPosition < board.width)
        verify(backlogPosition + backlog.width > 0)

        board.contentX = 0
        wait(0)
        compare(board.contentX, 0)
    }

    function test_rtl_resize_tracks_start_without_pinning_user_scroll() {
        const view = createTemporaryObject(viewComponent, testCase, {
            "width": 1600,
            "rightToLeft": true
        })
        verify(view)
        waitForRendering(view)

        const board = findChild(view, "boardView")
        const backlog = findChild(view, "column-backlog")
        verify(board)
        verify(backlog)
        const wideStart = Math.max(0, board.contentWidth - board.width)
        tryCompare(board, "contentX", wideStart)

        view.width = 1000
        waitForRendering(view)
        const compactStart = Math.max(0, board.contentWidth - board.width)
        verify(compactStart > wideStart)
        tryCompare(board, "contentX", compactStart)

        const backlogPosition = backlog.mapToItem(board, 0, 0).x
        verify(backlogPosition < board.width)
        verify(backlogPosition + backlog.width > 0)

        board.contentX = 0
        wait(0)
        compare(board.contentX, 0)

        view.width = 1001
        waitForRendering(view)
        compare(board.contentX, 0)
        wait(0)
        compare(board.contentX, 0)
    }

    function test_compact_rtl_overlay_drawer_opens_from_left_edge() {
        const view = createTemporaryObject(viewComponent, testCase, {
            "width": 1000,
            "rightToLeft": true
        })
        verify(view)
        waitForRendering(view)

        const drawer = findChild(view, "overlayDetailDrawer")
        verify(drawer)
        compare(drawer.edge, Qt.LeftEdge)
    }

    function test_enlarged_font_keeps_labels_and_targets_unclipped() {
        Theme.baseFontPixelSize = 13 * 1.35
        const view = createView(1000)
        const controls = [
            findChild(view, "boardButton"),
            findChild(view, "searchField"),
            findChild(view, "priorityFilter"),
            findChild(view, "newTaskButton"),
            findChild(view, "cardInteraction")
        ]

        for (const control of controls) {
            verify(control)
            verify(control.height + 0.5 >= control.implicitHeight,
                   control.objectName + " is shorter than its implicit height")
            verify(control.height >= 40,
                   control.objectName + " has an undersized target")
        }

        const labels = [
            findChild(view, "headerTitle"),
            findChild(view, "headerDate"),
            findChild(view, "cardTitle")
        ]
        for (const label of labels) {
            verify(label)
            verify(label.height + 0.5 >= label.contentHeight,
                   label.objectName + " clips enlarged text")
        }

        const card = findChild(view, "taskCard-task-launch-readiness-review")
        const content = findChild(card, "cardContent")
        verify(card)
        verify(content)
        verify(content.y + content.height + Theme.cardPadding
               <= card.height + 0.5)
    }
}
