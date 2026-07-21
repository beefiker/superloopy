pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

FocusScope {
    id: root

    required property string taskId
    property var dragCoordinator: null
    property var focusAdjacentControl: null
    property bool dragging: false
    readonly property int storeRevision: TaskStore.revision
    readonly property var task: {
        const ignoredRevision = storeRevision
        return TaskStore.taskById(taskId)
    }
    readonly property bool selected: TaskStore.selectedTaskId === taskId
    readonly property string visualState: !enabled ? "disabled"
                                                   : dragging ? "dragging"
                                                   : interaction.visualFocus ? "keyboardFocus"
                                                   : selected ? "selected"
                                                   : interaction.down ? "pressed"
                                                   : interaction.hovered ? "hovered"
                                                   : "normal"

    signal activated(string taskId, Item invoker)

    objectName: "taskCard-" + taskId
    implicitWidth: Theme.columnMinimumWidth
    implicitHeight: interaction.implicitHeight
    scale: dragging ? 0.98 : 1
    opacity: dragging ? 0.55 : 1
    transformOrigin: Item.Center

    Behavior on scale {
        NumberAnimation {
            duration: Theme.transitionDuration
            easing.type: Easing.OutCubic
        }
    }

    Behavior on opacity {
        NumberAnimation {
            duration: Theme.transitionDuration
            easing.type: Easing.OutCubic
        }
    }

    function initials(name) {
        const parts = name.trim().split(/\s+/)
        if (parts.length === 0 || parts[0].length === 0)
            return ""
        if (parts.length === 1)
            return parts[0].slice(0, 2).toUpperCase()
        const combined = String(parts[0].charAt(0)
                                + parts[parts.length - 1].charAt(0))
        return combined.toUpperCase()
    }

    function accessibleDescription(taskData) {
        if (!taskData)
            return ""
        const description = taskData.description.trim()
        if (taskData.assignee.length === 0)
            return description
        if (description.length === 0)
            return qsTr("Assignee: %1").arg(taskData.assignee)
        return qsTr("%1 Assignee: %2").arg(description).arg(taskData.assignee)
    }

    function activate() {
        activated(taskId, interaction)
    }

    function focusInteraction() {
        interaction.forceActiveFocus(Qt.TabFocusReason)
        return interaction.activeFocus
    }

    DragHandler {
        id: dragHandler
        objectName: "cardDragHandler"
        target: null
        acceptedButtons: Qt.LeftButton

        onActiveChanged: {
            if (!root.dragCoordinator)
                return
            if (active) {
                root.dragging = true
                root.dragCoordinator.beginDrag(root.taskId, root,
                                               centroid.scenePosition)
            }
        }

        onGrabChanged: (transition, point) => {
            if (!root.dragCoordinator || !root.dragging
                    || transition !== PointerDevice.UngrabExclusive)
                return
            root.dragCoordinator.updateDrag(point.scenePosition)
            root.dragging = false
            root.dragCoordinator.finishDrag()
        }

        onCentroidChanged: {
            if (active && root.dragCoordinator)
                root.dragCoordinator.updateDrag(centroid.scenePosition)
        }

        onCanceled: {
            if (!root.dragCoordinator || !root.dragging)
                return
            root.dragging = false
            root.dragCoordinator.cancelDrag()
        }
    }

    Rectangle {
        id: focusRing
        objectName: "focusRing"
        anchors.fill: parent
        anchors.margins: -Theme.focusGutter
        z: -2
        visible: interaction.visualFocus || opacity > 0
        opacity: interaction.visualFocus ? 1 : 0
        color: Theme.clear
        radius: Theme.cardRadius + Theme.focusGutter
        border.color: Theme.focus
        border.width: 2
        Accessible.ignored: true

        Behavior on opacity {
            NumberAnimation {
                duration: Theme.feedbackDuration
                easing.type: Easing.OutCubic
            }
        }
    }

    Button {
        id: interaction
        objectName: "cardInteraction"
        anchors.fill: parent
        enabled: root.enabled
        hoverEnabled: true
        padding: Theme.cardPadding
        focusPolicy: Qt.StrongFocus
        Accessible.name: root.task ? root.task.title : ""
        Accessible.description: root.accessibleDescription(root.task)
        Accessible.role: Accessible.Button
        Accessible.selectable: true
        Accessible.selected: root.selected
        Accessible.onPressAction: root.activate()
        onClicked: root.activate()
        Keys.onReturnPressed: event => {
            if (!event.isAutoRepeat)
                root.activate()
            event.accepted = true
        }
        Keys.onEnterPressed: event => {
            if (!event.isAutoRepeat)
                root.activate()
            event.accepted = true
        }
        Keys.onTabPressed: event => {
            event.accepted = root.focusAdjacentControl
                             && root.focusAdjacentControl(root.taskId, 1)
        }
        Keys.onBacktabPressed: event => {
            event.accepted = root.focusAdjacentControl
                             && root.focusAdjacentControl(root.taskId, -1)
        }

        background: Rectangle {
            color: root.visualState === "disabled" ? Theme.disabledSurface
                   : root.visualState === "dragging" ? Theme.pressed
                   : root.visualState === "pressed" ? Theme.pressed
                   : root.visualState === "hovered" ? Theme.hover
                   : Theme.surface
            radius: Theme.cardRadius
            border.color: Theme.border
            border.width: Theme.borderWidth

            Behavior on color {
                ColorAnimation {
                    duration: Theme.feedbackDuration
                    easing.type: Easing.OutCubic
                }
            }
        }

        contentItem: ColumnLayout {
            id: cardContent
            objectName: "cardContent"
            spacing: Theme.space2

            Label {
                id: titleLabel
                objectName: "cardTitle"
                Layout.fillWidth: true
                Layout.minimumHeight: contentHeight
                text: root.task ? root.task.title : ""
                color: root.enabled ? Theme.ink : Theme.disabledInk
                font.pixelSize: Theme.cardTitleFontPixelSize
                font.weight: Theme.cardTitleFontWeight
                lineHeight: Theme.cardTitleLineHeight
                wrapMode: Text.Wrap
            }

            Label {
                objectName: "cardDescription"
                Layout.fillWidth: true
                Layout.minimumHeight: contentHeight
                visible: text.length > 0
                text: root.task ? root.task.description : ""
                color: root.enabled ? Theme.muted : Theme.disabledInk
                font.pixelSize: Theme.bodyFontPixelSize
                font.weight: Theme.bodyFontWeight
                lineHeight: Theme.bodyLineHeight
                wrapMode: Text.Wrap
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: Theme.space2

                Label {
                    id: priorityLabel
                    objectName: "priorityLabel"
                    text: root.task ? root.task.priority : ""
                    color: !root.enabled ? Theme.disabledInk
                           : text === "High" ? Theme.coralInk
                           : text === "Medium" ? Theme.cobalt
                           : Theme.neutralInk
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.labelFontWeight
                    leftPadding: Theme.space2
                    rightPadding: Theme.space2
                    topPadding: Theme.space1
                    bottomPadding: Theme.space1

                    background: Rectangle {
                        id: priorityBadge
                        objectName: "priorityBadge"
                        color: !root.enabled ? Theme.disabledSurface
                               : priorityLabel.text === "High" ? Theme.coralSoft
                               : priorityLabel.text === "Medium" ? Theme.cobaltSoft
                               : Theme.neutralSoft
                        radius: Theme.controlRadius
                        Accessible.ignored: true
                    }
                }

                Item {
                    Layout.fillWidth: true
                }

                Label {
                    objectName: "dueDate"
                    visible: text.length > 0
                    text: root.task ? root.task.dueDate : ""
                    color: root.enabled ? Theme.muted : Theme.disabledInk
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.metaFontWeight
                }
            }

            Flow {
                id: metadataFlow
                Layout.fillWidth: true
                Layout.preferredHeight: childrenRect.height
                spacing: Theme.space2

                Label {
                    objectName: "comments"
                    visible: root.task ? root.task.comments > 0 : false
                    text: root.task ? qsTr("%1 comments").arg(root.task.comments) : ""
                    color: root.enabled ? Theme.muted : Theme.disabledInk
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.metaFontWeight
                }

                Label {
                    objectName: "checklist"
                    visible: root.task ? root.task.checklistTotal > 0 : false
                    text: root.task ? qsTr("%1 of %2").arg(root.task.checklistDone)
                                                   .arg(root.task.checklistTotal) : ""
                    color: root.enabled ? Theme.muted : Theme.disabledInk
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.metaFontWeight
                }

                Rectangle {
                    id: assigneeAvatar
                    objectName: "assigneeAvatar"
                    visible: root.task ? root.task.assignee.length > 0 : false
                    width: 28
                    height: 28
                    radius: 14
                    color: Theme.neutralSoft
                    border.color: Theme.border
                    border.width: Theme.borderWidth
                    Accessible.name: root.task ? root.task.assignee : ""
                    Accessible.ignored: true

                    Label {
                        objectName: "assigneeInitials"
                        anchors.centerIn: parent
                        text: root.task ? root.initials(root.task.assignee) : ""
                        color: root.enabled ? Theme.neutralInk : Theme.disabledInk
                        font.pixelSize: Theme.metaFontPixelSize
                        font.weight: Theme.sectionFontWeight
                        Accessible.ignored: true
                    }
                }
            }
        }
    }

    Rectangle {
        id: selectionOutline
        objectName: "selectionOutline"
        anchors.fill: parent
        z: 2
        visible: root.selected && root.enabled && !root.dragging
        color: Theme.clear
        radius: Theme.cardRadius
        border.color: Theme.cobalt
        border.width: 2
        Accessible.ignored: true
    }

    Rectangle {
        id: highPriorityEdge
        objectName: "highPriorityEdge"
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        z: 3
        visible: root.task ? root.task.priority === "High" : false
        width: 3
        color: Theme.coral
        radius: Theme.cardRadius
        Accessible.ignored: true
    }
}
