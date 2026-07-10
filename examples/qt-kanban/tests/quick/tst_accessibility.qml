import QtQuick
import QtTest
import Northstar.Kanban

TestCase {
    id: testCase
    name: "Accessibility"
    when: windowShown
    width: 1600
    height: 800
    visible: true

    readonly property real defaultBaseFontPixelSize: 13
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
        Theme.baseFontPixelSize = defaultBaseFontPixelSize
        Theme.motionEnabled = true
    }

    function cleanup() {
        Theme.baseFontPixelSize = defaultBaseFontPixelSize
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

    function interaction(view, taskId) {
        const card = findChild(view, "taskCard-" + taskId)
        verify(card)
        const control = findChild(card, "cardInteraction")
        verify(control)
        return control
    }

    function test_card_exposes_real_button_contract() {
        const view = createView()
        const control = interaction(view, "task-define-goals")

        compare(accessibilityProbe.name(control), "Define launch goals")
        compare(accessibilityProbe.role(control),
                accessibilityProbe.buttonRole)
        verify(accessibilityProbe.description(control).indexOf("Maya Patel") >= 0,
               "Ignored avatar's full assignee name is missing from the card")
        verify(accessibilityProbe.hasPressAction(control))

        control.forceActiveFocus(Qt.TabFocusReason)
        tryVerify(function() { return accessibilityProbe.focused(control) })

        verify(accessibilityProbe.press(control))
        compare(TaskStore.selectedTaskId, "task-define-goals")
    }

    function test_icon_only_controls_are_named_and_decoration_is_ignored() {
        const view = createView(1000)
        const namedControls = [
            ["boardButton", "Board"],
            ["timelineButton", "Timeline"],
            ["inboxButton", "Inbox"],
            ["settingsButton", "Settings"],
            ["helpButton", "Help"]
        ]

        for (const definition of namedControls) {
            const control = findChild(view, definition[0])
            verify(control)
            compare(accessibilityProbe.name(control), definition[1])
        }

        const card = findChild(view, "taskCard-task-build-landing")
        const decorations = [
            findChild(card, "focusRing"),
            findChild(card, "selectionOutline"),
            findChild(card, "highPriorityEdge"),
            findChild(card, "priorityBadge"),
            findChild(card, "assigneeAvatar")
        ]
        for (const decoration of decorations) {
            verify(decoration)
            verify(decoration.Accessible.ignored,
                   decoration.objectName + " is not explicitly ignored")
        }
    }

    function test_mouse_keyboard_and_accessibility_share_selection_path() {
        const view = createView()
        const pointerControl = interaction(view, "task-define-goals")
        const keyboardControl = interaction(view, "task-finalize-messaging")
        const accessibleControl = interaction(view, "task-build-landing")

        mouseClick(pointerControl)
        compare(TaskStore.selectedTaskId, "task-define-goals")

        keyboardControl.forceActiveFocus(Qt.TabFocusReason)
        keyClick(Qt.Key_Return)
        compare(TaskStore.selectedTaskId, "task-finalize-messaging")

        verify(accessibilityProbe.press(accessibleControl))
        compare(TaskStore.selectedTaskId, "task-build-landing")
    }
}
