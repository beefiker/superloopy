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

    // Injected by QtKanbanSetup::qmlEngineAvailable for real QAccessible checks.
    // qmllint disable unqualified
    readonly property var accessibilityProbe: AccessibilityProbe
    // qmllint enable unqualified

    Component {
        id: viewComponent

        KanbanView {
            width: 1300
            height: 700
        }
    }

    function init() {
        TaskStore.reset()
        Theme.motionEnabled = true
    }

    function cleanup() {
        Theme.motionEnabled = true
    }

    function createView(viewWidth) {
        const view = createTemporaryObject(viewComponent, testCase, {
            "width": viewWidth || 1300
        })
        verify(view)
        waitForRendering(view)
        return view
    }

    function namedFocusOwner(item) {
        let candidate = item
        while (candidate) {
            if (candidate.objectName && candidate.objectName.length > 0)
                return candidate.objectName
            candidate = candidate.parent
        }
        return ""
    }

    function namedFocusPath(item) {
        let candidate = item
        let owner = ""
        while (candidate) {
            if (candidate.objectName && candidate.objectName.length > 0) {
                if (candidate.objectName.indexOf("taskCard-") === 0)
                    return candidate.objectName
                if (owner.length === 0)
                    owner = candidate.objectName
            }
            candidate = candidate.parent
        }
        return owner
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

    function test_initial_details_and_persistent_empty_state() {
        const view = createView(1600)
        const persistentSlot = findChild(view, "persistentDrawerSlot")
        const details = findChild(persistentSlot, "persistentDetailDrawer")
        const title = findChild(details, "detailTitle")
        const status = findChild(details, "detailStatus")
        const emptyState = findChild(details, "detailEmptyState")

        verify(persistentSlot)
        verify(details)
        verify(title)
        verify(status)
        verify(emptyState)
        verify(persistentSlot.visible)
        compare(title.text, "Build landing page")
        compare(status.text, "In progress")
        verify(!emptyState.visible)

        verify(TaskStore.clearSelection())
        tryVerify(function() { return emptyState.visible })
        compare(title.text, "")
    }

    function test_card_activation_opens_only_the_overlay_drawer() {
        const view = createView(1300)
        const overlayDrawer = findChild(view, "overlayDetailDrawer")
        const persistentSlot = findChild(view, "persistentDrawerSlot")
        const card = findChild(view, "taskCard-task-define-goals")
        const interaction = findChild(card, "cardInteraction")

        verify(overlayDrawer)
        verify(persistentSlot)
        verify(interaction)
        verify(!persistentSlot.visible)
        verify(!overlayDrawer.opened)

        interaction.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Return)
        tryVerify(function() { return overlayDrawer.opened })
        compare(TaskStore.selectedTaskId, "task-define-goals")
        compare(findChild(overlayDrawer, "detailTitle").text,
                "Define launch goals")
    }

    function test_move_to_control_and_adjacent_shortcuts() {
        const view = createView(1600)
        const details = findChild(view, "persistentDetailDrawer")
        const moveLabel = findChild(details, "moveToLabel")
        const moveControl = findChild(details, "moveToColumn")

        verify(details)
        verify(moveLabel)
        verify(moveControl)
        compare(moveLabel.text, "Move to")
        compare(moveControl.accessibleName, "Move to column")
        compare(moveControl.currentIndex, 2)

        moveControl.activated(3)
        tryCompare(TaskStore.taskById("task-build-landing"), "columnId",
                   "review")

        moveControl.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Left, Qt.ControlModifier | Qt.ShiftModifier)
        tryCompare(TaskStore.taskById("task-build-landing"), "columnId",
                   "inProgress")
        keyClick(Qt.Key_Right, Qt.ControlModifier | Qt.ShiftModifier)
        tryCompare(TaskStore.taskById("task-build-landing"), "columnId",
                   "review")
    }

    function test_new_task_validates_blank_title_and_enter_creates() {
        failOnWarning(/Binding loop detected/)
        const view = createView(1300)
        const dialog = findChild(view, "newTaskDialog")
        const invoker = findChild(view, "newTaskButton")
        const titleField = findChild(dialog, "newTaskTitleField")
        const column = findChild(dialog, "newTaskColumn")
        const priority = findChild(dialog, "newTaskPriority")
        const createButton = findChild(dialog, "newTaskCreateButton")
        const validation = findChild(dialog, "newTaskValidation")

        verify(dialog)
        verify(invoker)
        dialog.openFrom(invoker)
        tryVerify(function() { return dialog.opened })
        verify(titleField.activeFocus)
        verify(!createButton.enabled)

        dialog.submit()
        verify(validation.visible)
        compare(validation.text, "Enter a task title")

        const beforeCount = TaskStore.tasks.count
        titleField.text = "  Prepare partner briefing  "
        column.currentIndex = 1
        priority.currentIndex = 2
        titleField.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Return)

        tryVerify(function() { return !dialog.opened })
        compare(TaskStore.tasks.count, beforeCount + 1)
        verify(TaskStore.selectedTaskId.indexOf("task-created-") === 0)
        const created = TaskStore.taskById(TaskStore.selectedTaskId)
        compare(created.title, "Prepare partner briefing")
        compare(created.columnId, "ready")
        compare(created.priority, "High")
    }

    function test_new_task_uses_canonical_priority_keys_data() {
        return [
            { "tag": "low", "priorityIndex": 0, "expectedPriority": "Low" },
            { "tag": "medium", "priorityIndex": 1,
              "expectedPriority": "Medium" },
            { "tag": "high", "priorityIndex": 2,
              "expectedPriority": "High" }
        ]
    }

    function test_new_task_uses_canonical_priority_keys(data) {
        const view = createView(1300)
        const dialog = findChild(view, "newTaskDialog")
        const invoker = findChild(view, "newTaskButton")
        const titleField = findChild(dialog, "newTaskTitleField")
        const priority = findChild(dialog, "newTaskPriority")

        dialog.openFrom(invoker)
        tryVerify(function() { return dialog.opened })
        priority.model = ["낮음", "보통", "높음"]
        priority.currentIndex = data.priorityIndex
        titleField.text = "Localized priority " + data.expectedPriority
        dialog.submit()

        tryVerify(function() { return !dialog.opened })
        const created = TaskStore.taskById(TaskStore.selectedTaskId)
        compare(created.priority, data.expectedPriority)
    }

    function test_dialog_cancel_does_not_create_and_restores_focus() {
        const view = createView(1300)
        const dialog = findChild(view, "newTaskDialog")
        const invoker = findChild(view, "newTaskButton")
        const titleField = findChild(dialog, "newTaskTitleField")
        const cancelButton = findChild(dialog, "newTaskCancelButton")
        const beforeCount = TaskStore.tasks.count

        invoker.forceActiveFocus(Qt.TabFocusReason)
        dialog.openFrom(invoker)
        tryVerify(function() { return dialog.opened })
        titleField.text = "Do not create this"
        mouseClick(cancelButton)

        tryVerify(function() { return !dialog.opened })
        tryVerify(function() { return invoker.activeFocus })
        compare(TaskStore.tasks.count, beforeCount)
    }

    function test_escape_closes_dialog_before_drawer_and_restores_card_focus() {
        const view = createView(1300)
        const card = findChild(view, "taskCard-task-define-goals")
        const cardInteraction = findChild(card, "cardInteraction")
        const drawer = findChild(view, "overlayDetailDrawer")
        const dialog = findChild(view, "newTaskDialog")

        cardInteraction.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Return)
        tryVerify(function() { return drawer.opened })

        const drawerInvoker = findChild(drawer, "detailCloseButton")
        dialog.openFrom(drawerInvoker)
        tryVerify(function() { return dialog.opened })
        findChild(dialog, "newTaskTitleField").forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Escape)
        tryVerify(function() { return !dialog.opened })
        verify(drawer.opened)
        tryVerify(function() { return drawerInvoker.activeFocus })

        drawerInvoker.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Escape)
        tryVerify(function() { return !drawer.opened })
        tryVerify(function() { return cardInteraction.activeFocus })
    }

    function test_modal_dialog_keeps_tab_focus_inside() {
        const view = createView(1300)
        const dialog = findChild(view, "newTaskDialog")
        const invoker = findChild(view, "newTaskButton")
        const allowedOwners = [
            "newTaskTitleField",
            "newTaskColumn",
            "newTaskPriority",
            "newTaskCancelButton",
            "newTaskCreateButton"
        ]

        dialog.openFrom(invoker)
        tryVerify(function() { return dialog.opened })
        for (let index = 0; index < 8; ++index) {
            keyClick(Qt.Key_Tab)
            const owner = namedFocusOwner(testCase.Window.window.activeFocusItem)
            verify(allowedOwners.indexOf(owner) >= 0,
                   "Unexpected focus owner: " + owner)
        }
    }

    function test_overlay_drawer_keeps_tab_focus_inside() {
        const view = createView(1300)
        const card = findChild(view, "taskCard-task-define-goals")
        const cardInteraction = findChild(card, "cardInteraction")
        const drawer = findChild(view, "overlayDetailDrawer")
        const allowedOwners = [
            "detailCloseButton",
            "moveToColumn",
            "movePreviousButton",
            "moveNextButton"
        ]

        cardInteraction.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Return)
        tryVerify(function() { return drawer.opened })
        for (let index = 0; index < 6; ++index) {
            keyClick(Qt.Key_Tab)
            const owner = namedFocusOwner(testCase.Window.window.activeFocusItem)
            verify(allowedOwners.indexOf(owner) >= 0,
                   "Unexpected focus owner: " + owner)
        }
    }

    function test_overlay_drawer_cycles_at_backlog_boundary() {
        const view = createView(1300)
        const interaction = findChild(
                    findChild(view, "taskCard-task-define-goals"),
                    "cardInteraction")
        const drawer = findChild(view, "overlayDetailDrawer")

        interaction.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Return)
        tryVerify(function() { return drawer.opened })
        compare(namedFocusOwner(testCase.Window.window.activeFocusItem),
                "detailCloseButton")

        const moveControl = findChild(drawer, "moveToColumn")
        const previousButton = findChild(drawer, "movePreviousButton")
        const nextButton = findChild(drawer, "moveNextButton")
        verify(!previousButton.enabled)
        verify(nextButton.enabled)
        compare(moveControl.KeyNavigation.tab, nextButton)
        compare(nextButton.KeyNavigation.backtab, moveControl)

        const forwardOwners = ["moveToColumn", "moveNextButton",
                               "detailCloseButton"]
        for (const owner of forwardOwners) {
            keyClick(Qt.Key_Tab)
            compare(namedFocusOwner(testCase.Window.window.activeFocusItem), owner)
        }

        const reverseOwners = ["moveNextButton", "moveToColumn",
                               "detailCloseButton"]
        for (const owner of reverseOwners) {
            keyClick(Qt.Key_Backtab)
            compare(namedFocusOwner(testCase.Window.window.activeFocusItem), owner)
        }
    }

    function test_overlay_drawer_cycles_at_review_boundary() {
        const view = createView(1300)
        const interaction = findChild(
                    findChild(view, "taskCard-task-demo-video"),
                    "cardInteraction")
        const drawer = findChild(view, "overlayDetailDrawer")

        interaction.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Return)
        tryVerify(function() { return drawer.opened })
        compare(namedFocusOwner(testCase.Window.window.activeFocusItem),
                "detailCloseButton")

        const closeButton = findChild(drawer, "detailCloseButton")
        const moveControl = findChild(drawer, "moveToColumn")
        const previousButton = findChild(drawer, "movePreviousButton")
        const nextButton = findChild(drawer, "moveNextButton")
        verify(previousButton.enabled)
        verify(!nextButton.enabled)
        compare(closeButton.KeyNavigation.backtab, previousButton)
        compare(previousButton.KeyNavigation.tab, closeButton)
        compare(previousButton.KeyNavigation.backtab, moveControl)

        const forwardOwners = ["moveToColumn", "movePreviousButton",
                               "detailCloseButton"]
        for (const owner of forwardOwners) {
            keyClick(Qt.Key_Tab)
            compare(namedFocusOwner(testCase.Window.window.activeFocusItem), owner)
        }

        const reverseOwners = ["movePreviousButton", "moveToColumn",
                               "detailCloseButton"]
        for (const owner of reverseOwners) {
            keyClick(Qt.Key_Backtab)
            compare(namedFocusOwner(testCase.Window.window.activeFocusItem), owner)
        }
    }

    function test_persistent_drawer_does_not_trap_focus() {
        const view = createView(1600)
        const controls = [
            findChild(view, "detailCloseButton"),
            findChild(view, "moveToColumn"),
            findChild(view, "movePreviousButton"),
            findChild(view, "moveNextButton")
        ]

        for (const control of controls)
            verify(control)

        controls[3].forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Tab)
        for (const control of controls)
            verify(!control.activeFocus)
    }

    function test_primary_tab_order_is_stable_in_both_directions() {
        const view = createView(1600)
        const start = findChild(view, "boardButton")
        verify(start)
        start.forceActiveFocus(Qt.TabFocusReason)
        tryVerify(function() { return start.activeFocus })

        const forwardOwners = [
            "timelineButton", "inboxButton", "settingsButton", "helpButton",
            "searchField", "priorityFilter", "newTaskButton",
            "taskCard-task-define-goals",
            "taskCard-task-audience-research",
            "taskCard-task-localize-launch",
            "taskCard-task-finalize-messaging",
            "taskCard-task-design-system",
            "taskCard-task-email-campaign",
            "taskCard-task-build-landing",
            "taskCard-task-integrate-analytics",
            "taskCard-task-mobile-qa",
            "taskCard-task-demo-video",
            "taskCard-task-go-to-market",
            "taskCard-task-launch-readiness-review",
            "detailCloseButton", "moveToColumn",
            "movePreviousButton", "moveNextButton"
        ]
        let forwardIndex = 0
        while (forwardIndex < forwardOwners.length) {
            keyClick(Qt.Key_Tab)
            const owner = namedFocusPath(
                            testCase.Window.window.activeFocusItem)
            if (owner.indexOf("addTask-") === 0)
                continue
            compare(owner, forwardOwners[forwardIndex])
            ++forwardIndex
        }

        const backwardOwners = forwardOwners.slice(0, -1).reverse()
        backwardOwners.push("boardButton")
        for (const owner of backwardOwners) {
            keyClick(Qt.Key_Backtab)
            let actualOwner = namedFocusPath(
                                testCase.Window.window.activeFocusItem)
            while (actualOwner.indexOf("addTask-") === 0) {
                keyClick(Qt.Key_Backtab)
                actualOwner = namedFocusPath(
                            testCase.Window.window.activeFocusItem)
            }
            compare(actualOwner, owner)
        }
    }

    function test_compact_rtl_shortcuts_follow_physical_direction() {
        const view = createTemporaryObject(viewComponent, testCase, {
            "width": 1000,
            "rightToLeft": true
        })
        verify(view)
        waitForRendering(view)
        verify(TaskStore.selectTask("task-define-goals"))

        const focusTarget = findChild(view, "boardButton")
        verify(focusTarget)
        focusTarget.forceActiveFocus(Qt.TabFocusReason)

        keyClick(Qt.Key_Left, Qt.ControlModifier | Qt.ShiftModifier)
        tryCompare(TaskStore.taskById("task-define-goals"), "columnId",
                   "ready")

        keyClick(Qt.Key_Right, Qt.ControlModifier | Qt.ShiftModifier)
        tryCompare(TaskStore.taskById("task-define-goals"), "columnId",
                   "backlog")
    }

    function test_motion_off_reaches_drawer_states_and_restores_focus() {
        Theme.motionEnabled = false
        const view = createView(1300)
        const card = findChild(view, "taskCard-task-define-goals")
        const interaction = findChild(card, "cardInteraction")
        const drawer = findChild(view, "overlayDetailDrawer")
        verify(interaction)
        verify(drawer)
        compare(Theme.feedbackDuration, 0)
        compare(Theme.transitionDuration, 0)

        interaction.forceActiveFocus(Qt.TabFocusReason)
        verify(accessibilityProbe.press(interaction))
        wait(0)
        verify(drawer.opened)
        compare(drawer.position, 1)

        drawer.close()
        wait(0)
        verify(!drawer.opened)
        compare(drawer.position, 0)
        wait(0)
        verify(interaction.activeFocus)
    }
}
