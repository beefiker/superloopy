pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Control {
    id: root

    signal newTaskRequested(Item invoker)

    property var focusNextControl: null
    property var focusPreviousControl: null

    readonly property real singleRowRequiredWidth:
        Math.max(176, headerIdentity.implicitWidth)
        + Math.max(176, searchField.implicitWidth)
        + Math.max(128, priorityFilter.implicitWidth)
        + collaboratorCluster.implicitWidth
        + newTaskButton.implicitWidth
        + Theme.space3 * 4
    readonly property bool stacked: singleRowRequiredWidth > availableWidth + 0.5
    implicitHeight: Math.max(104, headerLayout.implicitHeight
                             + topPadding + bottomPadding)
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

    function focusNewTask() {
        newTaskButton.forceActiveFocus(Qt.TabFocusReason)
        return newTaskButton.activeFocus
    }

    background: Rectangle {
        color: Theme.surface
        border.color: Theme.border
        border.width: Theme.borderWidth
    }

    contentItem: GridLayout {
        id: headerLayout

        columns: 5
        columnSpacing: Theme.space3
        rowSpacing: Theme.space3

        ColumnLayout {
            id: headerIdentity
            objectName: "headerIdentity"
            Layout.row: 0
            Layout.column: 0
            Layout.columnSpan: root.stacked ? 4 : 1
            Layout.fillWidth: true
            Layout.minimumWidth: root.stacked ? 0 : 176
            Layout.alignment: Qt.AlignVCenter
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
            Layout.row: root.stacked ? 1 : 0
            Layout.column: root.stacked ? 0 : 1
            Layout.columnSpan: root.stacked ? 2 : 1
            Layout.fillWidth: root.stacked
            Layout.minimumHeight: Math.max(40, implicitHeight)
            Layout.minimumWidth: 176
            Layout.preferredWidth: root.stacked ? 280
                                                : Math.max(176, Math.min(236,
                                                                         root.width * 0.22))
            Layout.alignment: Qt.AlignVCenter
            placeholderText: qsTr("Search tasks")
            text: TaskStore.query
            selectByMouse: true
            color: Theme.ink
            placeholderTextColor: Theme.muted
            font.pixelSize: Theme.bodyFontPixelSize
            Accessible.name: qsTr("Search tasks")
            onTextEdited: TaskStore.query = text
            KeyNavigation.tab: priorityFilter
            Keys.onBacktabPressed: event => {
                event.accepted = root.focusPreviousControl
                                 && root.focusPreviousControl()
            }

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
            Layout.row: root.stacked ? 1 : 0
            Layout.column: 2
            Layout.minimumHeight: Math.max(40, implicitHeight)
            Layout.minimumWidth: 128
            Layout.preferredWidth: Math.max(128, implicitWidth)
            Layout.alignment: Qt.AlignVCenter
            model: [qsTr("All"), qsTr("High"), qsTr("Medium"), qsTr("Low")]
            currentIndex: {
                const normalizedFilter = TaskStore.priorityFilter.toLowerCase()
                return normalizedFilter === "high" ? 1
                     : normalizedFilter === "medium" ? 2
                     : normalizedFilter === "low" ? 3 : 0
            }
            font.pixelSize: Theme.bodyFontPixelSize
            Accessible.name: qsTr("Priority filter")
            KeyNavigation.tab: newTaskButton
            KeyNavigation.backtab: searchField
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
            id: collaboratorCluster
            objectName: "collaboratorCluster"
            Layout.row: root.stacked ? 1 : 0
            Layout.column: 3
            Layout.alignment: Qt.AlignVCenter
            spacing: -Theme.space1

            Repeater {
                model: ["MP", "EB", "LC"]

                delegate: Rectangle {
                    id: collaboratorAvatar

                    required property string modelData
                    required property int index

                    objectName: "collaboratorAvatar-" + index
                    Layout.preferredWidth: 30
                    Layout.preferredHeight: 30
                    radius: 15
                    color: index === 0 ? Theme.avatarBlue
                                       : index === 1 ? Theme.avatarSlate
                                                     : Theme.avatarLavender
                    border.color: Theme.surface
                    border.width: 2
                    Accessible.ignored: true

                    Label {
                        objectName: "collaboratorAvatarLabel-"
                                    + collaboratorAvatar.index
                        anchors.centerIn: parent
                        text: collaboratorAvatar.modelData
                        color: Theme.ink
                        font.pixelSize: Theme.metaFontPixelSize
                        font.weight: Theme.sectionFontWeight
                        Accessible.ignored: true
                    }
                }
            }
        }

        Button {
            id: newTaskButton
            objectName: "newTaskButton"
            Layout.row: 0
            Layout.column: 4
            Layout.minimumHeight: Math.max(40, implicitHeight)
            Layout.alignment: Qt.AlignVCenter
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
            KeyNavigation.backtab: priorityFilter
            Keys.onTabPressed: event => {
                event.accepted = root.focusNextControl
                                 && root.focusNextControl()
            }

            background: Rectangle {
                color: newTaskButton.enabled
                       ? newTaskButton.down ? Theme.primaryPressed
                       : newTaskButton.hovered ? Theme.primaryHover : Theme.cobalt
                       : Theme.disabledSurface
                radius: Theme.controlRadius
                border.color: newTaskButton.visualFocus ? Theme.focus : Theme.clear
                border.width: newTaskButton.visualFocus ? 2 : 0
            }
        }
    }
}
