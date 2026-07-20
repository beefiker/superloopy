pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root

    signal taskActivated(string taskId, Item invoker)
    signal addTaskRequested(string columnId, Item invoker)

    required property string columnId
    required property string title
    required property color accent
    property var dragCoordinator: null
    property var focusAdjacentControl: null
    property var visibleTasks: []
    readonly property int visibleCount: visibleTasks.length

    objectName: "column-" + columnId

    component CardDelegate: Item {
        id: cardDelegate

        required property var modelData
        property var dragCoordinator: null
        property var focusAdjacentControl: null
        readonly property string delegateTaskId: modelData.id

        signal activated(string taskId, Item invoker)

        implicitHeight: taskCard.implicitHeight + Theme.focusGutter * 2
        height: implicitHeight

        function focusTask() {
            return taskCard.focusInteraction()
        }

        TaskCard {
            id: taskCard

            x: Theme.focusGutter
            y: Theme.focusGutter
            width: cardDelegate.width - Theme.focusGutter * 2
            taskId: cardDelegate.modelData.id
            dragCoordinator: cardDelegate.dragCoordinator
            focusAdjacentControl: cardDelegate.focusAdjacentControl
            onActivated: (taskId, invoker) =>
                         cardDelegate.activated(taskId, invoker)
        }
    }

    function refreshVisibleTasks() {
        visibleTasks = TaskStore.visibleInColumn(columnId)
    }

    function droppedTaskId(source) {
        return source ? source.taskId : ""
    }

    function revealDelegate(delegate) {
        const viewport = cardScroll.contentItem as Flickable
        if (!viewport)
            return

        const origin = delegate.mapToItem(viewport.contentItem, 0, 0)
        const delegateTop = origin.y
        const delegateBottom = delegateTop + delegate.height
        const viewportTop = viewport.contentY
        const viewportBottom = viewportTop + viewport.height
        let nextContentY = viewportTop

        if (delegateTop < viewportTop)
            nextContentY = delegateTop
        else if (delegateBottom > viewportBottom)
            nextContentY = delegateBottom - viewport.height

        const maximumContentY = Math.max(0, viewport.contentHeight
                                            - viewport.height)
        viewport.contentY = Math.max(0, Math.min(maximumContentY,
                                                 nextContentY))
    }

    function focusTask(taskId) {
        for (let index = 0; index < taskRepeater.count; ++index) {
            const delegate = taskRepeater.itemAt(index) as CardDelegate
            if (delegate && delegate.delegateTaskId === taskId) {
                revealDelegate(delegate)
                return delegate.focusTask()
            }
        }
        return false
    }

    function focusAddTask() {
        revealDelegate(addTaskButton)
        addTaskButton.forceActiveFocus(Qt.TabFocusReason)
        return addTaskButton.activeFocus
    }

    onColumnIdChanged: refreshVisibleTasks()
    Component.onCompleted: refreshVisibleTasks()

    Connections {
        target: TaskStore

        function onPriorityFilterChanged() {
            root.refreshVisibleTasks()
        }

        function onQueryChanged() {
            root.refreshVisibleTasks()
        }

        function onRevisionChanged() {
            root.refreshVisibleTasks()
        }
    }

    Connections {
        target: TaskStore.tasks

        function onCountChanged() {
            root.refreshVisibleTasks()
        }
    }

    DropArea {
        id: taskDropArea
        objectName: "dropArea-" + root.columnId
        anchors.fill: parent
        keys: ["northstar-task"]

        onDropped: drop => {
            const taskId = root.droppedTaskId(drop.source)
            if (!taskId)
                return
            if (TaskStore.moveTask(taskId, root.columnId))
                drop.acceptProposedAction()
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: Theme.space3

        Rectangle {
            objectName: "stageAccent-" + root.columnId
            Layout.fillWidth: true
            Layout.preferredHeight: Theme.space1
            color: root.accent
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: Theme.space2

            Label {
                Layout.fillWidth: true
                text: root.title
                color: Theme.ink
                font.pixelSize: Theme.sectionFontPixelSize
                font.weight: Theme.sectionFontWeight
                lineHeight: Theme.sectionLineHeight
            }

            Label {
                objectName: "columnCount-" + root.columnId
                text: String(root.visibleCount)
                color: Theme.muted
                font.pixelSize: Theme.labelFontPixelSize
                font.weight: Theme.labelFontWeight
                leftPadding: Theme.space2
                rightPadding: Theme.space2
                topPadding: Theme.space1
                bottomPadding: Theme.space1

                background: Rectangle {
                    color: Theme.neutralSoft
                    radius: Theme.controlRadius
                }
            }
        }

        ScrollView {
            id: cardScroll
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
            ScrollBar.vertical.policy: ScrollBar.AsNeeded

            Column {
                width: cardScroll.availableWidth
                spacing: Theme.space3

                Repeater {
                    id: taskRepeater
                    model: root.visibleTasks

                    delegate: CardDelegate {
                        width: cardScroll.availableWidth
                        dragCoordinator: root.dragCoordinator
                        focusAdjacentControl: root.focusAdjacentControl
                        onActivated: (activatedTaskId, invoker) => {
                            TaskStore.selectTask(activatedTaskId)
                            root.taskActivated(activatedTaskId, invoker)
                        }
                    }
                }

                Button {
                    id: addTaskButton
                    objectName: "addTask-" + root.columnId
                    width: parent.width
                    text: qsTr("Add task")
                    flat: true
                    Accessible.name: qsTr("Add task to %1").arg(root.title)
                    font.pixelSize: Theme.bodyFontPixelSize
                    font.weight: Theme.labelFontWeight
                    onClicked: root.addTaskRequested(root.columnId, addTaskButton)
                    Keys.onTabPressed: event => {
                        event.accepted = root.focusAdjacentControl
                                         && root.focusAdjacentControl(
                                             addTaskButton.objectName, 1)
                    }
                    Keys.onBacktabPressed: event => {
                        event.accepted = root.focusAdjacentControl
                                         && root.focusAdjacentControl(
                                             addTaskButton.objectName, -1)
                    }

                    contentItem: Label {
                        text: addTaskButton.text
                        color: addTaskButton.enabled ? Theme.cobalt : Theme.disabledInk
                        font: addTaskButton.font
                        horizontalAlignment: Text.AlignLeft
                        verticalAlignment: Text.AlignVCenter
                    }

                    background: Rectangle {
                        color: addTaskButton.down ? Theme.pressed
                               : addTaskButton.hovered ? Theme.hover : Theme.clear
                        radius: Theme.controlRadius
                        border.color: addTaskButton.visualFocus ? Theme.focus : Theme.border
                        border.width: addTaskButton.visualFocus ? 2 : Theme.borderWidth
                    }
                }
            }
        }
    }
}
