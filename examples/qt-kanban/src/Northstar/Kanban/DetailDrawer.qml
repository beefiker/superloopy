pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Control {
    id: root

    property bool closeVisible: true
    property bool trapFocus: false
    readonly property int storeRevision: TaskStore.revision
    readonly property var task: {
        const ignoredRevision = storeRevision
        return TaskStore.taskById(TaskStore.selectedTaskId)
    }
    readonly property bool hasTask: task !== null
    readonly property int selectedColumnIndex: hasTask
                                                ? TaskStore.columnOrder.indexOf(task.columnId)
                                                : -1

    signal closeRequested()

    implicitWidth: Theme.drawerWidth
    padding: Theme.space5
    Accessible.name: qsTr("Task details")
    palette.window: Theme.surface
    palette.windowText: Theme.ink
    palette.base: Theme.surface
    palette.text: Theme.ink
    palette.button: Theme.surface
    palette.buttonText: Theme.ink
    palette.highlight: Theme.cobalt
    palette.highlightedText: Theme.cobaltContent
    palette.mid: Theme.borderStrong
    palette.dark: Theme.ink

    function columnName(columnId) {
        if (columnId === "backlog")
            return qsTr("Backlog")
        if (columnId === "ready")
            return qsTr("Ready")
        if (columnId === "inProgress")
            return qsTr("In progress")
        if (columnId === "review")
            return qsTr("Review")
        return ""
    }

    function focusFirst() {
        if (closeButton.visible)
            closeButton.forceActiveFocus(Qt.TabFocusReason)
        else if (moveToColumn.enabled)
            moveToColumn.forceActiveFocus(Qt.TabFocusReason)
    }

    function firstEnabledMoveButton() {
        if (previousButton.enabled)
            return previousButton
        if (nextButton.enabled)
            return nextButton
        return closeButton
    }

    function lastEnabledMoveControl() {
        if (nextButton.enabled)
            return nextButton
        if (previousButton.enabled)
            return previousButton
        if (moveToColumn.enabled)
            return moveToColumn
        return closeButton
    }

    background: Rectangle {
        color: Theme.surface
        border.color: Theme.border
        border.width: Theme.borderWidth
    }

    contentItem: ColumnLayout {
        spacing: Theme.space4

        RowLayout {
            Layout.fillWidth: true
            spacing: Theme.space2

            Label {
                Layout.fillWidth: true
                text: qsTr("Task details")
                color: Theme.ink
                font.pixelSize: Theme.sectionFontPixelSize
                font.weight: Theme.sectionFontWeight
            }

            Button {
                id: closeButton
                objectName: "detailCloseButton"
                visible: root.closeVisible
                text: qsTr("Close")
                icon.source: Qt.resolvedUrl("assets/icons/close.svg")
                icon.color: Theme.ink
                icon.width: 16
                icon.height: 16
                display: AbstractButton.IconOnly
                Accessible.name: text
                focusPolicy: Qt.StrongFocus
                onClicked: root.closeRequested()
                KeyNavigation.tab: root.trapFocus && moveToColumn.enabled
                                   ? moveToColumn : null
                KeyNavigation.backtab: root.trapFocus
                                       ? root.lastEnabledMoveControl() : null

                background: Rectangle {
                    color: closeButton.down ? Theme.pressed
                           : closeButton.hovered ? Theme.hover : Theme.clear
                    radius: Theme.controlRadius
                    border.color: closeButton.visualFocus ? Theme.focus : Theme.clear
                    border.width: closeButton.visualFocus ? 2 : 0
                }
            }
        }

        Item {
            id: emptyState
            objectName: "detailEmptyState"
            visible: !root.hasTask
            Layout.fillWidth: true
            Layout.fillHeight: true

            Column {
                anchors.centerIn: parent
                width: parent.width
                spacing: Theme.space2

                Label {
                    width: parent.width
                    text: qsTr("No task selected")
                    color: Theme.ink
                    font.pixelSize: Theme.bodyFontPixelSize
                    font.weight: Theme.sectionFontWeight
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.Wrap
                }

                Label {
                    width: parent.width
                    text: qsTr("Select a card to inspect its details")
                    color: Theme.muted
                    font.pixelSize: Theme.bodyFontPixelSize
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.Wrap
                }
            }
        }

        ScrollView {
            id: detailsScroll
            visible: root.hasTask
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            ScrollBar.horizontal.policy: ScrollBar.AlwaysOff
            ScrollBar.vertical.policy: ScrollBar.AsNeeded

            ColumnLayout {
                width: detailsScroll.availableWidth
                spacing: Theme.space4

                Label {
                    id: titleLabel
                    objectName: "detailTitle"
                    Layout.fillWidth: true
                    text: root.hasTask ? root.task.title : ""
                    color: Theme.ink
                    font.pixelSize: Theme.cardTitleFontPixelSize
                    font.weight: Theme.cardTitleFontWeight
                    lineHeight: Theme.cardTitleLineHeight
                    wrapMode: Text.Wrap
                }

                Label {
                    objectName: "detailDescription"
                    Layout.fillWidth: true
                    visible: text.length > 0
                    text: root.hasTask ? root.task.description : ""
                    color: Theme.muted
                    font.pixelSize: Theme.bodyFontPixelSize
                    lineHeight: Theme.bodyLineHeight
                    wrapMode: Text.Wrap
                }

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: Theme.borderWidth
                    color: Theme.border
                }

                Label {
                    text: qsTr("Status")
                    color: Theme.muted
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.labelFontWeight
                }

                Label {
                    id: statusLabel
                    objectName: "detailStatus"
                    Layout.fillWidth: true
                    text: root.hasTask ? root.columnName(root.task.columnId) : ""
                    color: Theme.ink
                    font.pixelSize: Theme.bodyFontPixelSize
                }

                Label {
                    text: qsTr("Assignee")
                    color: Theme.muted
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.labelFontWeight
                }

                Label {
                    objectName: "detailAssignee"
                    Layout.fillWidth: true
                    text: root.hasTask && root.task.assignee.length > 0
                          ? root.task.assignee : qsTr("Unassigned")
                    color: Theme.ink
                    font.pixelSize: Theme.bodyFontPixelSize
                    wrapMode: Text.Wrap
                }

                Label {
                    text: qsTr("Due date")
                    color: Theme.muted
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.labelFontWeight
                }

                Label {
                    objectName: "detailDueDate"
                    Layout.fillWidth: true
                    text: root.hasTask && root.task.dueDate.length > 0
                          ? root.task.dueDate : qsTr("No due date")
                    color: Theme.ink
                    font.pixelSize: Theme.bodyFontPixelSize
                }

                Label {
                    text: qsTr("Checklist")
                    color: Theme.muted
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.labelFontWeight
                }

                Label {
                    objectName: "detailChecklist"
                    Layout.fillWidth: true
                    text: root.hasTask && root.task.checklistTotal > 0
                          ? qsTr("%1 of %2 complete").arg(root.task.checklistDone)
                                                        .arg(root.task.checklistTotal)
                          : qsTr("No checklist")
                    color: Theme.ink
                    font.pixelSize: Theme.bodyFontPixelSize
                }

                Label {
                    text: qsTr("Activity")
                    color: Theme.muted
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.labelFontWeight
                }

                Label {
                    objectName: "detailActivity"
                    Layout.fillWidth: true
                    text: root.hasTask ? qsTr("%1 comments").arg(root.task.comments) : ""
                    color: Theme.ink
                    font.pixelSize: Theme.bodyFontPixelSize
                }

                Label {
                    id: moveToLabel
                    objectName: "moveToLabel"
                    Layout.fillWidth: true
                    text: qsTr("Move to")
                    color: Theme.muted
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.labelFontWeight
                }

                ComboBox {
                    id: moveToColumn
                    objectName: "moveToColumn"
                    readonly property string accessibleName: qsTr("Move to column")
                    Layout.fillWidth: true
                    model: [qsTr("Backlog"), qsTr("Ready"),
                            qsTr("In progress"), qsTr("Review")]
                    currentIndex: root.selectedColumnIndex
                    enabled: root.hasTask
                    palette.buttonText: enabled ? Theme.ink : Theme.disabledInk
                    palette.dark: enabled ? Theme.ink : Theme.disabledInk
                    Accessible.name: accessibleName
                    focusPolicy: Qt.StrongFocus
                    onActivated: index => {
                        if (index >= 0 && index < TaskStore.columnOrder.length)
                            TaskStore.moveTask(TaskStore.selectedTaskId,
                                               TaskStore.columnOrder[index])
                    }
                    KeyNavigation.tab: root.firstEnabledMoveButton()
                    KeyNavigation.backtab: closeButton

                    background: Rectangle {
                        color: moveToColumn.enabled ? Theme.surface : Theme.disabledSurface
                        radius: Theme.controlRadius
                        border.color: moveToColumn.visualFocus
                                      ? Theme.focus : Theme.controlBorder
                        border.width: moveToColumn.visualFocus ? 2 : Theme.borderWidth
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: Theme.space2

                    Button {
                        id: previousButton
                        objectName: "movePreviousButton"
                        Layout.fillWidth: true
                        text: qsTr("Previous")
                        enabled: root.selectedColumnIndex > 0
                        palette.buttonText: enabled ? Theme.ink : Theme.disabledInk
                        Accessible.name: qsTr("Move task to previous column")
                        focusPolicy: Qt.StrongFocus
                        onClicked: TaskStore.moveSelectedAdjacent(-1)
                        KeyNavigation.tab: nextButton.enabled ? nextButton
                                             : root.trapFocus ? closeButton : null
                        KeyNavigation.backtab: moveToColumn

                        background: Rectangle {
                            color: !previousButton.enabled ? Theme.disabledSurface
                                   : previousButton.down ? Theme.pressed
                                   : previousButton.hovered ? Theme.hover : Theme.surface
                            radius: Theme.controlRadius
                            border.color: previousButton.visualFocus
                                          ? Theme.focus : Theme.controlBorder
                            border.width: previousButton.visualFocus
                                          ? 2 : Theme.borderWidth
                        }
                    }

                    Button {
                        id: nextButton
                        objectName: "moveNextButton"
                        Layout.fillWidth: true
                        text: qsTr("Next")
                        enabled: root.selectedColumnIndex >= 0
                                 && root.selectedColumnIndex
                                    < TaskStore.columnOrder.length - 1
                        palette.buttonText: enabled ? Theme.ink : Theme.disabledInk
                        Accessible.name: qsTr("Move task to next column")
                        focusPolicy: Qt.StrongFocus
                        onClicked: TaskStore.moveSelectedAdjacent(1)
                        KeyNavigation.tab: root.trapFocus ? closeButton : null
                        KeyNavigation.backtab: previousButton.enabled
                                                 ? previousButton : moveToColumn

                        background: Rectangle {
                            color: !nextButton.enabled ? Theme.disabledSurface
                                   : nextButton.down ? Theme.pressed
                                   : nextButton.hovered ? Theme.hover : Theme.surface
                            radius: Theme.controlRadius
                            border.color: nextButton.visualFocus
                                          ? Theme.focus : Theme.controlBorder
                            border.width: nextButton.visualFocus
                                          ? 2 : Theme.borderWidth
                        }
                    }
                }
            }
        }
    }
}
