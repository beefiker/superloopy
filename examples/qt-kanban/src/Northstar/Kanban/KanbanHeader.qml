pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Control {
    id: root

    signal newTaskRequested(Item invoker)

    implicitHeight: 104
    leftPadding: Theme.space6
    rightPadding: Theme.space6
    topPadding: Theme.space4
    bottomPadding: Theme.space4
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

    background: Rectangle {
        color: Theme.surface
        border.color: Theme.border
        border.width: Theme.borderWidth
    }

    contentItem: RowLayout {
        spacing: Theme.space3

        ColumnLayout {
            Layout.fillWidth: true
            Layout.minimumWidth: 176
            spacing: Theme.space1

            Label {
                objectName: "headerTitle"
                text: qsTr("Launch board")
                color: Theme.ink
                font.pixelSize: Theme.titleFontPixelSize
                font.weight: Theme.titleFontWeight
                lineHeight: Theme.titleLineHeight
            }

            Label {
                objectName: "headerDate"
                text: qsTr("May 13 to June 7")
                color: Theme.muted
                font.pixelSize: Theme.metaFontPixelSize
                font.weight: Theme.metaFontWeight
            }
        }

        TextField {
            id: searchField
            objectName: "searchField"
            Layout.minimumHeight: 40
            Layout.preferredWidth: Math.max(176, Math.min(236, root.width * 0.22))
            placeholderText: qsTr("Search tasks")
            text: TaskStore.query
            selectByMouse: true
            color: Theme.ink
            placeholderTextColor: Theme.muted
            font.pixelSize: Theme.bodyFontPixelSize
            Accessible.name: qsTr("Search tasks")
            onTextEdited: TaskStore.query = text

            background: Rectangle {
                color: Theme.surface
                radius: Theme.controlRadius
                border.color: searchField.activeFocus ? Theme.focus : Theme.controlBorder
                border.width: searchField.activeFocus ? 2 : Theme.borderWidth
            }
        }

        ComboBox {
            id: priorityFilter
            objectName: "priorityFilter"
            Layout.minimumHeight: 40
            Layout.preferredWidth: 128
            model: [qsTr("All"), qsTr("High"), qsTr("Medium"), qsTr("Low")]
            currentIndex: {
                const normalizedFilter = TaskStore.priorityFilter.toLowerCase()
                return normalizedFilter === "high" ? 1
                     : normalizedFilter === "medium" ? 2
                     : normalizedFilter === "low" ? 3 : 0
            }
            font.pixelSize: Theme.bodyFontPixelSize
            Accessible.name: qsTr("Priority filter")
            onActivated: index => {
                TaskStore.priorityFilter = index === 1 ? "high"
                                           : index === 2 ? "medium"
                                           : index === 3 ? "low" : "all"
            }

            background: Rectangle {
                color: Theme.surface
                radius: Theme.controlRadius
                border.color: priorityFilter.visualFocus ? Theme.focus : Theme.controlBorder
                border.width: priorityFilter.visualFocus ? 2 : Theme.borderWidth
            }
        }

        RowLayout {
            spacing: -Theme.space1

            Repeater {
                model: ["MP", "EB", "LC"]

                delegate: Rectangle {
                    id: collaboratorAvatar

                    required property string modelData
                    required property int index

                    Layout.preferredWidth: 30
                    Layout.preferredHeight: 30
                    radius: 15
                    color: index === 0 ? "#DCE8FF"
                                       : index === 1 ? "#E7F5ED" : "#FDECE9"
                    border.color: Theme.surface
                    border.width: 2

                    Label {
                        anchors.centerIn: parent
                        text: collaboratorAvatar.modelData
                        color: Theme.ink
                        font.pixelSize: Theme.metaFontPixelSize
                        font.weight: Theme.sectionFontWeight
                    }
                }
            }
        }

        Button {
            id: newTaskButton
            objectName: "newTaskButton"
            Layout.minimumHeight: 40
            text: qsTr("New task")
            icon.source: Qt.resolvedUrl("assets/icons/add.svg")
            icon.color: Theme.cobaltContent
            icon.width: 18
            icon.height: 18
            font.pixelSize: Theme.bodyFontPixelSize
            font.weight: Theme.sectionFontWeight
            palette.buttonText: Theme.cobaltContent
            Accessible.name: text
            onClicked: root.newTaskRequested(newTaskButton)

            background: Rectangle {
                color: newTaskButton.enabled
                       ? newTaskButton.down ? "#1D4ED8"
                       : newTaskButton.hovered ? "#2F6FF0" : Theme.cobalt
                       : Theme.disabledSurface
                radius: Theme.controlRadius
                border.color: newTaskButton.visualFocus ? Theme.focus : "transparent"
                border.width: newTaskButton.visualFocus ? 2 : 0
            }
        }
    }
}
