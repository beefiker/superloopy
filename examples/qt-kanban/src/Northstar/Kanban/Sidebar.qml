pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Control {
    id: root

    property bool compact: false
    signal unavailableDestinationRequested(string message)

    padding: Theme.space3

    background: Rectangle {
        color: Theme.sidebar
    }

    component SidebarAction: Button {
        id: action

        property bool selected: false

        implicitWidth: root.compact ? icon.width
                                    : implicitContentWidth + leftPadding + rightPadding
        implicitHeight: 42
        Layout.minimumWidth: root.compact ? 0 : implicitWidth
        display: root.compact ? AbstractButton.IconOnly : AbstractButton.TextBesideIcon
        spacing: root.compact ? 0 : Theme.space3
        horizontalPadding: root.compact ? 0 : Theme.space3
        checkable: selected
        autoExclusive: selected
        checked: selected
        font.pixelSize: Theme.bodyFontPixelSize
        font.weight: selected ? Theme.sectionFontWeight : Theme.bodyFontWeight
        icon.width: 20
        icon.height: 20
        icon.color: Theme.sidebarText
        palette.buttonText: Theme.sidebarText
        palette.brightText: Theme.sidebarText
        Accessible.name: text

        background: Rectangle {
            radius: Theme.controlRadius
            color: action.selected ? Theme.sidebarActive
                                   : action.down ? "#314355"
                                   : action.hovered ? "#1D2C3A" : "transparent"
            border.color: action.visualFocus ? Theme.sidebarFocus : "transparent"
            border.width: action.visualFocus ? 2 : 0
        }
    }

    contentItem: ColumnLayout {
        spacing: Theme.space2

        RowLayout {
            Layout.fillWidth: true
            Layout.bottomMargin: Theme.space4
            spacing: Theme.space3

            Rectangle {
                Layout.preferredWidth: 38
                Layout.preferredHeight: 38
                radius: Theme.controlRadius
                color: Theme.cobalt

                Label {
                    anchors.centerIn: parent
                    text: "N"
                    color: Theme.cobaltContent
                    font.pixelSize: Theme.sectionFontPixelSize
                    font.weight: Theme.sectionFontWeight
                }
            }

            ColumnLayout {
                visible: !root.compact
                Layout.fillWidth: true
                spacing: 0

                Label {
                    text: qsTr("Northstar")
                    color: Theme.sidebarText
                    font.pixelSize: Theme.sectionFontPixelSize
                    font.weight: Theme.sectionFontWeight
                }

                Label {
                    text: qsTr("Launch workspace")
                    color: "#AAB6C2"
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.metaFontWeight
                }
            }
        }

        SidebarAction {
            objectName: "boardButton"
            Layout.fillWidth: true
            text: qsTr("Board")
            icon.source: Qt.resolvedUrl("assets/icons/board.svg")
            selected: true
        }

        SidebarAction {
            objectName: "timelineButton"
            Layout.fillWidth: true
            text: qsTr("Timeline")
            icon.source: Qt.resolvedUrl("assets/icons/timeline.svg")
            onClicked: root.unavailableDestinationRequested(
                           qsTr("Timeline is not available in this demo"))
        }

        SidebarAction {
            objectName: "inboxButton"
            Layout.fillWidth: true
            text: qsTr("Inbox")
            icon.source: Qt.resolvedUrl("assets/icons/inbox.svg")
            onClicked: root.unavailableDestinationRequested(
                           qsTr("Inbox is not available in this demo"))
        }

        Item {
            Layout.fillHeight: true
        }

        Label {
            visible: !root.compact
            Layout.leftMargin: Theme.space3
            text: qsTr("TEAM")
            color: "#91A0AF"
            font.pixelSize: Theme.metaFontPixelSize
            font.weight: Theme.metaFontWeight
        }

        RowLayout {
            objectName: "teamCluster"
            Layout.alignment: Qt.AlignHCenter
            Layout.minimumWidth: 0
            spacing: -Theme.space1

            Repeater {
                model: root.compact ? ["MP", "+2"] : ["MP", "EB", "LC"]

                delegate: Rectangle {
                    id: teamAvatar

                    required property string modelData
                    required property int index

                    Layout.preferredWidth: root.compact ? 22 : 30
                    Layout.preferredHeight: root.compact ? 22 : 30
                    radius: width / 2
                    color: index === 0 ? "#DCE8FF"
                                       : index === 1 ? "#E7F5ED" : "#FDECE9"
                    border.color: Theme.sidebar
                    border.width: 2

                    Label {
                        anchors.centerIn: parent
                        text: teamAvatar.modelData
                        color: Theme.ink
                        font.pixelSize: Theme.metaFontPixelSize
                        font.weight: Theme.sectionFontWeight
                    }
                }
            }
        }

        SidebarAction {
            objectName: "settingsButton"
            Layout.fillWidth: true
            text: qsTr("Settings")
            icon.source: Qt.resolvedUrl("assets/icons/settings.svg")
            onClicked: root.unavailableDestinationRequested(
                           qsTr("Settings are not available in this demo"))
        }

        SidebarAction {
            objectName: "helpButton"
            Layout.fillWidth: true
            text: qsTr("Help")
            icon.source: Qt.resolvedUrl("assets/icons/help.svg")
            onClicked: root.unavailableDestinationRequested(
                           qsTr("Help is not available in this demo"))
        }
    }
}
