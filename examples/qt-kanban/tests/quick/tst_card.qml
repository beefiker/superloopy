import QtQuick
import QtTest
import Northstar.Kanban

TestCase {
    id: testCase
    name: "TaskCard"
    when: windowShown
    width: 640
    height: 640
    visible: true

    Component {
        id: cardComponent

        TaskCard {
            width: 244
        }
    }

    Component {
        id: spyComponent

        SignalSpy {}
    }

    function init() {
        TaskStore.reset()
    }

    function createCard(taskId, width) {
        const card = createTemporaryObject(cardComponent, testCase, {
            "taskId": taskId,
            "width": width || 244
        })
        verify(card)
        waitForRendering(card)
        return card
    }

    function test_priority_visuals_data() {
        return [
            { "tag": "high", "taskId": "task-build-landing",
              "surface": Theme.coralSoft, "ink": Theme.coralInk,
              "highEdge": true },
            { "tag": "medium", "taskId": "task-design-system",
              "surface": Theme.cobaltSoft, "ink": Theme.cobalt,
              "highEdge": false },
            { "tag": "low", "taskId": "task-define-goals",
              "surface": Theme.neutralSoft, "ink": Theme.neutralInk,
              "highEdge": false }
        ]
    }

    function test_priority_visuals(data) {
        const card = createCard(data.taskId)
        const priorityBadge = findChild(card, "priorityBadge")
        const priorityLabel = findChild(card, "priorityLabel")
        const highEdge = findChild(card, "highPriorityEdge")

        verify(priorityBadge)
        verify(priorityLabel)
        verify(highEdge)
        compare(priorityBadge.color, data.surface)
        compare(priorityLabel.color, data.ink)
        compare(priorityLabel.text, TaskStore.taskById(data.taskId).priority)
        compare(highEdge.visible, data.highEdge)
        compare(highEdge.width, 3)
    }

    function test_variable_content_uses_real_task_metadata() {
        const card = createCard("task-build-landing")
        compare(card.objectName, "taskCard-task-build-landing")
        compare(findChild(card, "cardTitle").text, "Build landing page")
        compare(findChild(card, "cardDescription").text,
                "Implement the responsive launch page and finish interaction details.")
        compare(findChild(card, "dueDate").text, "May 28")
        compare(findChild(card, "comments").text, "3 comments")
        compare(findChild(card, "checklist").text, "2 of 4")

        const avatar = findChild(card, "assigneeAvatar")
        verify(avatar.visible)
        compare(findChild(card, "assigneeInitials").text, "NK")
        compare(avatar.Accessible.name, "Noah Kim")
        compare(findChild(card, "cardInteraction").Accessible.name,
                "Build landing page")
        compare(findChild(card, "cardInteraction").Accessible.role,
                Accessible.Button)
    }

    function test_sparse_metadata_falls_back_without_empty_chrome() {
        const card = createCard("task-mobile-qa")
        verify(!findChild(card, "dueDate").visible)
        verify(!findChild(card, "comments").visible)
        verify(!findChild(card, "checklist").visible)
        verify(!findChild(card, "assigneeAvatar").visible)
        verify(card.implicitHeight > 0)
        compare(card.height, card.implicitHeight)
    }

    function test_long_and_cjk_titles_wrap_without_clipping_data() {
        return [
            { "tag": "long", "taskId": "task-launch-readiness-review",
              "cardWidth": 156 },
            { "tag": "cjk", "taskId": "task-localize-launch",
              "cardWidth": 112 }
        ]
    }

    function test_long_and_cjk_titles_wrap_without_clipping(data) {
        const card = createCard(data.taskId, data.cardWidth)
        const title = findChild(card, "cardTitle")
        const content = findChild(card, "cardContent")

        verify(title.lineCount > 1)
        verify(card.implicitHeight > 0)
        verify(content.y + content.height + Theme.cardPadding <= card.height + 0.5)
    }

    function test_selection_and_keyboard_focus_use_distinct_rings() {
        const selectedCard = createCard("task-build-landing")
        const selection = findChild(selectedCard, "selectionOutline")
        const focus = findChild(selectedCard, "focusRing")
        const interaction = findChild(selectedCard, "cardInteraction")

        verify(selection.visible)
        verify(!focus.visible)
        compare(selection.border.width, 2)
        compare(selection.border.color, Theme.cobalt)

        interaction.forceActiveFocus(Qt.TabFocusReason)
        tryVerify(function() { return interaction.activeFocus })
        verify(selection.visible)
        verify(focus.visible)
        compare(focus.border.width, 2)
        compare(focus.border.color, Theme.focus)
        verify(focus.border.color !== selection.border.color)

        const focusedOnlyCard = createCard("task-define-goals")
        const focusedOnlyInteraction = findChild(focusedOnlyCard, "cardInteraction")
        focusedOnlyInteraction.forceActiveFocus(Qt.TabFocusReason)
        tryVerify(function() { return focusedOnlyInteraction.activeFocus })
        verify(!findChild(focusedOnlyCard, "selectionOutline").visible)
        verify(findChild(focusedOnlyCard, "focusRing").visible)
    }

    function test_focus_ring_only_tracks_keyboard_visual_focus() {
        const card = createCard("task-define-goals")
        const interaction = findChild(card, "cardInteraction")
        const focusRing = findChild(card, "focusRing")
        verify(interaction)
        verify(focusRing)

        interaction.forceActiveFocus(Qt.MouseFocusReason)
        tryVerify(function() { return interaction.activeFocus })
        verify(!interaction.visualFocus)
        compare(card.visualState, "normal")
        verify(!focusRing.visible)

        const keyboardCard = createCard("task-audience-research")
        const keyboardInteraction = findChild(keyboardCard, "cardInteraction")
        const keyboardFocusRing = findChild(keyboardCard, "focusRing")
        keyboardInteraction.forceActiveFocus(Qt.TabFocusReason)
        tryVerify(function() { return keyboardInteraction.visualFocus })
        compare(keyboardCard.visualState, "keyboardFocus")
        verify(keyboardFocusRing.visible)
    }

    function test_selected_outline_yields_to_drag_and_disabled_states() {
        const card = createCard("task-build-landing")
        const selection = findChild(card, "selectionOutline")
        const interaction = findChild(card, "cardInteraction")

        verify(selection.visible)
        interaction.forceActiveFocus(Qt.TabFocusReason)
        tryVerify(function() { return interaction.activeFocus })
        verify(selection.visible)

        card.dragging = true
        tryVerify(function() { return !selection.visible })
        card.dragging = false
        tryVerify(function() { return selection.visible })

        card.enabled = false
        tryVerify(function() { return !selection.visible })
        card.enabled = true
        tryVerify(function() { return selection.visible })
    }

    function test_accessible_press_action_activates_exactly_once() {
        const card = createCard("task-define-goals")
        const interaction = findChild(card, "cardInteraction")
        const spy = createTemporaryObject(spyComponent, testCase, {
            "target": card,
            "signalName": "activated"
        })
        verify(interaction)
        verify(spy)

        interaction.Accessible.pressAction()
        compare(spy.count, 1)
        compare(spy.signalArguments[0][0], "task-define-goals")
    }

    function test_pointer_enter_and_space_share_activation_signal() {
        const card = createCard("task-define-goals")
        const interaction = findChild(card, "cardInteraction")
        const spy = createTemporaryObject(spyComponent, testCase, {
            "target": card,
            "signalName": "activated"
        })
        verify(interaction)
        verify(spy)

        mouseClick(interaction)
        compare(spy.count, 1)
        compare(spy.signalArguments[0][0], "task-define-goals")

        interaction.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Return)
        compare(spy.count, 2)
        compare(spy.signalArguments[1][0], "task-define-goals")

        keyClick(Qt.Key_Space)
        compare(spy.count, 3)
        compare(spy.signalArguments[2][0], "task-define-goals")
    }
}
