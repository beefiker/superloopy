pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root

    required property string columnId
    required property string title
    required property color accent
    readonly property int storeRevision: TaskStore.revision
    readonly property string filterSignature: TaskStore.query + "\u001f"
                                              + TaskStore.priorityFilter + "\u001f"
                                              + storeRevision
    readonly property var visibleTasks: {
        const ignoredSignature = filterSignature
        return TaskStore.visibleInColumn(columnId)
    }
    readonly property int visibleCount: visibleTasks.length

    objectName: "column-" + columnId

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
                    model: root.visibleTasks

                    delegate: TaskCard {
                        required property var modelData

                        width: cardScroll.availableWidth
                        taskId: modelData.id
                        onActivated: activatedTaskId => TaskStore.selectTask(activatedTaskId)
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

                    contentItem: Label {
                        text: addTaskButton.text
                        color: addTaskButton.enabled ? Theme.cobalt : Theme.disabledInk
                        font: addTaskButton.font
                        horizontalAlignment: Text.AlignLeft
                        verticalAlignment: Text.AlignVCenter
                    }

                    background: Rectangle {
                        color: addTaskButton.down ? Theme.pressed
                               : addTaskButton.hovered ? Theme.hover : "transparent"
                        radius: Theme.controlRadius
                        border.color: addTaskButton.visualFocus ? Theme.focus : Theme.border
                        border.width: addTaskButton.visualFocus ? 2 : Theme.borderWidth
                    }
                }
            }
        }
    }
}
