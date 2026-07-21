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
            findChild(view, "timelineDemoItem"),
            findChild(view, "inboxDemoItem"),
            findChild(view, "teamCluster")
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

    function test_compact_demo_items_render_distinct_titles_and_status() {
        const view = createTemporaryObject(
                       viewComponent,
                       testCase.Window.window.contentItem,
                       { "width": 1000 })
        verify(view)
        waitForRendering(view)

        const definitions = [
            ["timelineCompactTitle", "timelineCompactStatus", "Timeline"],
            ["inboxCompactTitle", "inboxCompactStatus", "Inbox"]
        ]

        for (const definition of definitions) {
            const title = findChild(view, definition[0])
            const status = findChild(view, definition[1])
            verify(title, definition[0] + " must be rendered")
            verify(status, definition[1] + " must be rendered")
            verify(title.visible, definition[0] + " must be visible")
            verify(status.visible, definition[1] + " must be visible")
            compare(title.text, definition[2])
            compare(status.text, "Demo only")
            verify(!title.truncated,
                   definition[0] + " must show its full distinct title")
            verify(title.fontInfo.pixelSize + 0.5
                   >= Theme.metaFontPixelSize,
                   definition[0] + " must not shrink below the requested size")
            verify(status.fontInfo.pixelSize + 0.5
                   >= Theme.metaFontPixelSize,
                   definition[1] + " must not shrink below the requested size")
        }
    }

    function test_default_scale_word_wrapping_reflows_before_three_lines() {
        const view = createView(1000)
        const sidebar = findChild(view, "sidebar")
        const timeline = findChild(view, "timelineDemoItem")
        verify(sidebar)
        verify(timeline)
        verify(sidebar.compact)

        timeline.title = "Wide Wide Wide"
        waitForRendering(view)

        verify(!sidebar.compact,
               "A three-line compact translation must reflow wide")
        compare(view.sidebarWidth, 224)
    }

    function test_board_navigation_exposes_current_checked_state() {
        const view = createView(1000)
        const boardButton = findChild(view, "boardButton")
        verify(boardButton)

        verify(boardButton.checkable)
        verify(boardButton.checked)
        compare(boardButton.palette.brightText.toString(),
                Theme.sidebarText.toString())

        boardButton.forceActiveFocus(Qt.TabFocusReason)
        tryVerify(function() { return boardButton.visualFocus })
        compare(boardButton.background.border.color, Theme.sidebarFocus)
    }

    function test_sidebar_demo_context_is_visible_and_passive() {
        const view = createView(1300)
        const demoItems = [
            [findChild(view, "timelineDemoItem"), "Timeline"],
            [findChild(view, "inboxDemoItem"), "Inbox"]
        ]

        for (const definition of demoItems) {
            const item = definition[0]
            verify(item)
            verify(item.width > 0 && item.height > 0,
                   item.objectName + " must retain visible layout space")
            verify(item.opacity > 0,
                   item.objectName + " must not hide its demo context")
            compare(item.title, definition[1])
            compare(item.demoOnlyLabel, "Demo only")
            verify(!item.activeFocusOnTab)
        }

        compare(findChild(view, "settingsButton"), null)
        compare(findChild(view, "helpButton"), null)
        compare(findChild(view, "statusToast"), null)
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

    function test_passive_demo_copy_scales_and_wraps_data() {
        return [
            { "tag": "default-long-reflows-wide", "viewWidth": 1000,
              "scale": 1.0, "labelSuffix": "Wide",
              "expectedCompact": false, "expectedSidebarWidth": 224 },
            { "tag": "wide-135", "viewWidth": 1300, "scale": 1.35,
              "labelSuffix": "Wide", "expectedCompact": false,
              "expectedSidebarWidth": 224 },
            { "tag": "wide-200", "viewWidth": 1300, "scale": 2.0,
              "labelSuffix": "Wide", "expectedCompact": false,
              "expectedSidebarWidth": 224 },
            { "tag": "minimum-135-reflows-wide", "viewWidth": 1000,
              "scale": 1.35, "labelSuffix": "Wide",
              "expectedCompact": false, "expectedSidebarWidth": 224 },
            { "tag": "minimum-200-reflows-wide", "viewWidth": 1000,
              "scale": 2.0,
              "labelSuffix": "Wide", "expectedCompact": false,
              "expectedSidebarWidth": 224 }
        ]
    }

    function test_passive_demo_copy_scales_and_wraps(data) {
        Theme.baseFontPixelSize = 13 * data.scale
        const view = createView(data.viewWidth)
        const sidebar = findChild(view, "sidebar")
        verify(sidebar)
        const definitions = [
            {
                "item": findChild(view, "timelineDemoItem"),
                "prefix": "timeline",
                "title": "Zeitachsenplanung für internationale Produkte",
                "status": "Nur für Demonstrationszwecke verfügbar"
            },
            {
                "item": findChild(view, "inboxDemoItem"),
                "prefix": "inbox",
                "title": "팀 전체의 읽지 않은 메시지와 검토 요청",
                "status": "현재 데모에서만 제공됩니다"
            }
        ]

        for (const definition of definitions) {
            verify(definition.item)
            definition.item.title = definition.title
            definition.item.demoOnlyLabel = definition.status
        }
        waitForRendering(view)
        compare(sidebar.compact, data.expectedCompact)
        compare(view.sidebarWidth, data.expectedSidebarWidth)

        for (const definition of definitions) {
            const title = findChild(
                            view,
                            definition.prefix + data.labelSuffix + "Title")
            const status = findChild(
                             view,
                             definition.prefix + data.labelSuffix + "Status")
            verify(title, "The localized title must have a stable test name")
            verify(status, "The localized status must have a stable test name")
            compare(title.text, definition.title)
            compare(status.text, definition.status)
            compare(definition.item.Accessible.name,
                    definition.title + " — " + definition.status)
            verify(!title.truncated,
                   title.objectName + " truncates localized copy")
            verify(!status.truncated,
                   status.objectName + " truncates localized copy")
            const requestedTitleSize = data.labelSuffix === "Wide"
                                       ? Theme.bodyFontPixelSize
                                       : Theme.metaFontPixelSize
            verify(title.fontInfo.pixelSize + 0.5 >= requestedTitleSize,
                   title.objectName + " shrinks below the requested text scale")
            verify(status.fontInfo.pixelSize + 0.5
                   >= Theme.metaFontPixelSize,
                   status.objectName + " shrinks below the requested text scale")
            verify(title.height + 0.5 >= title.contentHeight,
                   title.objectName + " clips scaled localized copy")
            verify(status.height + 0.5 >= status.contentHeight,
                   status.objectName + " clips scaled localized copy")
            verify(definition.item.height + 0.5
                   >= definition.item.implicitHeight,
                   definition.item.objectName + " clips its content")

            for (const label of [title, status]) {
                const origin = label.mapToItem(definition.item, 0, 0)
                verify(origin.x >= -0.5,
                       label.objectName + " begins outside its item")
                verify(origin.y >= -0.5,
                       label.objectName + " begins above its item")
                verify(origin.x + label.width
                       <= definition.item.width + 0.5,
                       label.objectName + " exceeds its item width")
                verify(origin.y + label.height
                       <= definition.item.height + 0.5,
                       label.objectName + " exceeds its item height")
            }
        }

        const team = findChild(view, "teamCluster")
        verify(team)
        for (const item of [definitions[0].item, definitions[1].item, team]) {
            const origin = item.mapToItem(sidebar, 0, 0)
            verify(origin.y >= sidebar.topPadding - 0.5,
                   item.objectName + " begins above the sidebar")
            verify(origin.y + item.height
                   <= sidebar.height - sidebar.bottomPadding + 0.5,
                   item.objectName + " exceeds the sidebar height")
        }
        const timelineOrigin = definitions[0].item.mapToItem(sidebar, 0, 0)
        const inboxOrigin = definitions[1].item.mapToItem(sidebar, 0, 0)
        verify(timelineOrigin.y + definitions[0].item.height
               <= inboxOrigin.y + 0.5,
               "Localized passive items overlap")
    }

    function test_two_hundred_percent_header_stacks_without_overlap() {
        Theme.baseFontPixelSize = 26
        const view = createView(900)
        const header = findChild(view, "kanbanHeader")
        const identity = findChild(view, "headerIdentity")
        const title = findChild(view, "headerTitle")
        const date = findChild(view, "headerDate")
        const search = findChild(view, "searchField")
        const filter = findChild(view, "priorityFilter")
        const collaborators = findChild(view, "collaboratorCluster")
        const newTask = findChild(view, "newTaskButton")

        for (const item of [header, identity, title, date, search, filter,
                           collaborators, newTask])
            verify(item)

        tryVerify(function() { return header.height >= header.implicitHeight })
        verify(header.stacked)

        const controls = [identity, search, filter, collaborators, newTask]
        for (const item of controls) {
            const origin = item.mapToItem(header, 0, 0)
            verify(origin.x >= header.leftPadding - 0.5,
                   item.objectName + " begins outside the header")
            verify(origin.y >= header.topPadding - 0.5,
                   item.objectName + " begins above the header")
            verify(origin.x + item.width
                   <= header.width - header.rightPadding + 0.5,
                   item.objectName + " exceeds the header width")
            verify(origin.y + item.height
                   <= header.height - header.bottomPadding + 0.5,
                   item.objectName + " exceeds the header height")
        }

        function intersects(first, second) {
            const a = first.mapToItem(header, 0, 0)
            const b = second.mapToItem(header, 0, 0)
            return a.x < b.x + second.width && a.x + first.width > b.x
                    && a.y < b.y + second.height
                    && a.y + first.height > b.y
        }

        verify(!intersects(identity, search))
        verify(!intersects(identity, newTask))
        verify(!intersects(search, filter))
        verify(!intersects(filter, collaborators))
        verify(!intersects(collaborators, newTask))

        for (const label of [title, date]) {
            const origin = label.mapToItem(header, 0, 0)
            verify(origin.y + label.height
                   <= header.height - header.bottomPadding + 0.5,
                   label.objectName + " is clipped")
        }
    }

    function test_normal_width_header_remains_one_row() {
        const view = createView(1300)
        const header = findChild(view, "kanbanHeader")
        const identity = findChild(view, "headerIdentity")
        const search = findChild(view, "searchField")
        const newTask = findChild(view, "newTaskButton")
        verify(header)
        verify(identity)
        verify(search)
        verify(newTask)
        verify(!header.stacked)
        const identityCenter = identity.mapToItem(header, 0, 0).y
                               + identity.height / 2
        const searchCenter = search.mapToItem(header, 0, 0).y
                             + search.height / 2
        const newTaskCenter = newTask.mapToItem(header, 0, 0).y
                              + newTask.height / 2
        verify(Math.abs(identityCenter - searchCenter) <= 0.5)
        verify(Math.abs(searchCenter - newTaskCenter) <= 0.5)
    }

    function test_nineteen_point_five_header_stacks_from_measured_width() {
        Theme.baseFontPixelSize = 19.5
        const view = createView(900)
        const header = findChild(view, "kanbanHeader")
        const identity = findChild(view, "headerIdentity")
        const search = findChild(view, "searchField")
        const filter = findChild(view, "priorityFilter")
        const collaborators = findChild(view, "collaboratorCluster")
        const newTask = findChild(view, "newTaskButton")
        for (const item of [header, identity, search, filter,
                           collaborators, newTask])
            verify(item)

        const requiredWidth = Math.max(176, identity.implicitWidth)
                              + Math.max(176, search.implicitWidth)
                              + Math.max(128, filter.implicitWidth)
                              + collaborators.implicitWidth
                              + newTask.implicitWidth
                              + Theme.space3 * 4
        verify(requiredWidth > header.availableWidth,
               "The 19.5 px fixture must cross the measured one-row boundary")
        verify(Math.abs(header.singleRowRequiredWidth - requiredWidth) <= 0.5)
        verify(header.stacked,
               "Header did not stack at its measured one-row boundary")

        const identityOrigin = identity.mapToItem(header, 0, 0)
        const searchOrigin = search.mapToItem(header, 0, 0)
        verify(searchOrigin.y >= identityOrigin.y + identity.height,
               "Measured stacked rows overlap")
        for (const item of [identity, search, filter, collaborators, newTask]) {
            const origin = item.mapToItem(header, 0, 0)
            verify(origin.x >= header.leftPadding - 0.5)
            verify(origin.x + item.width
                   <= header.width - header.rightPadding + 0.5,
                   item.objectName + " exceeds the 19.5 px header")
            verify(origin.y + item.height
                   <= header.height - header.bottomPadding + 0.5,
                   item.objectName + " exceeds the 19.5 px header height")
        }

        view.width = 1300
        waitForRendering(view)
        verify(header.singleRowRequiredWidth <= header.availableWidth + 0.5,
               "The wide 19.5 px fixture must fit one row")
        verify(!header.stacked,
               "Header stayed stacked after its measured content fit")
    }

    function test_measured_header_handles_long_content_in_rtl_data() {
        return [
            { "tag": "ltr", "rightToLeft": false },
            { "tag": "rtl", "rightToLeft": true }
        ]
    }

    function test_measured_header_handles_long_content_in_rtl(data) {
        const view = createTemporaryObject(viewComponent, testCase, {
            "width": 900,
            "rightToLeft": data.rightToLeft
        })
        verify(view)
        waitForRendering(view)
        const header = findChild(view, "kanbanHeader")
        const title = findChild(view, "headerTitle")
        const search = findChild(view, "searchField")
        const filter = findChild(view, "priorityFilter")
        const collaborators = findChild(view, "collaboratorCluster")
        const newTask = findChild(view, "newTaskButton")
        for (const item of [header, title, search, filter,
                           collaborators, newTask])
            verify(item)

        title.text = "출시 계획 및 작업 관리 보드"
        search.placeholderText = "작업 제목과 담당자 검색"
        filter.model = ["모든 우선순위", "높음", "보통", "낮음"]
        newTask.text = "새로운 작업 만들기"
        waitForRendering(view)

        verify(header.singleRowRequiredWidth > header.availableWidth + 0.5)
        verify(header.stacked)
        for (const item of [search, filter, collaborators, newTask]) {
            const origin = item.mapToItem(header, 0, 0)
            verify(origin.x >= header.leftPadding - 0.5,
                   item.objectName + " begins outside long-content header")
            verify(origin.x + item.width
                   <= header.width - header.rightPadding + 0.5,
                   item.objectName + " exceeds long-content header")
            verify(origin.y + item.height
                   <= header.height - header.bottomPadding + 0.5,
                   item.objectName + " exceeds long-content header height")
        }
    }

    function test_card_focus_ring_fits_first_clipping_ancestor() {
        const view = createView(1300)
        const card = findChild(view, "taskCard-task-define-goals")
        const interaction = findChild(card, "cardInteraction")
        const ring = findChild(card, "focusRing")
        verify(card)
        verify(interaction)
        verify(ring)

        interaction.forceActiveFocus(Qt.TabFocusReason)
        verify(interaction.activeFocus)

        let clippingAncestor = ring.parent
        while (clippingAncestor && !clippingAncestor.clip)
            clippingAncestor = clippingAncestor.parent
        verify(clippingAncestor, "Focus ring has no clipping ancestor")

        const origin = ring.mapToItem(clippingAncestor, 0, 0)
        verify(origin.x >= -0.5,
               "Focus ring is clipped on the leading edge: " + origin.x)
        verify(origin.y >= -0.5,
               "Focus ring is clipped on the top edge: " + origin.y)
        verify(origin.x + ring.width <= clippingAncestor.width + 0.5,
               "Focus ring is clipped on the trailing edge")
        verify(origin.y + ring.height <= clippingAncestor.height + 0.5,
               "Focus ring is clipped on the bottom edge")
    }
}
