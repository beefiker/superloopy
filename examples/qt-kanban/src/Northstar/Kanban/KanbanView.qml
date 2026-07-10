import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "kanbanView"

    readonly property int sidebarWidth: width < Theme.compactSidebarBreakpoint
                                        ? Theme.sidebarCompact : Theme.sidebarWide
    readonly property bool drawerPersistent: width >= Theme.persistentDrawerBreakpoint
    readonly property bool drawerOverlay: !drawerPersistent
    readonly property real boardContentWidth: boardView.boardContentWidth

    function showStatus(message) {
        statusToast.text = message
        statusTimer.restart()
    }

    Rectangle {
        anchors.fill: parent
        color: Theme.canvas
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        Sidebar {
            objectName: "sidebar"
            compact: root.sidebarWidth === Theme.sidebarCompact
            Layout.preferredWidth: root.sidebarWidth
            Layout.minimumWidth: root.sidebarWidth
            Layout.maximumWidth: root.sidebarWidth
            Layout.fillHeight: true
            onUnavailableDestinationRequested: message => root.showStatus(message)
        }

        ColumnLayout {
            spacing: 0
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumWidth: 0

            KanbanHeader {
                objectName: "kanbanHeader"
                Layout.fillWidth: true
            }

            BoardView {
                id: boardView
                objectName: "boardView"
                Layout.fillWidth: true
                Layout.fillHeight: true
            }
        }

        Item {
            id: persistentDrawerSlot
            objectName: "persistentDrawerSlot"
            visible: root.drawerPersistent
            Layout.preferredWidth: root.drawerPersistent ? Theme.drawerWidth : 0
            Layout.minimumWidth: root.drawerPersistent ? Theme.drawerWidth : 0
            Layout.maximumWidth: root.drawerPersistent ? Theme.drawerWidth : 0
            Layout.fillHeight: true

            Rectangle {
                anchors.fill: parent
                color: Theme.surface
                border.color: Theme.border
                border.width: Theme.borderWidth

                Column {
                    anchors.centerIn: parent
                    width: parent.width - Theme.space8 * 2
                    spacing: Theme.space2

                    Label {
                        width: parent.width
                        text: qsTr("Task details")
                        color: Theme.ink
                        font.pixelSize: Theme.sectionFontPixelSize
                        font.weight: Theme.sectionFontWeight
                        horizontalAlignment: Text.AlignHCenter
                    }

                    Label {
                        width: parent.width
                        text: qsTr("Select a card to inspect its details")
                        color: Theme.muted
                        font.pixelSize: Theme.bodyFontPixelSize
                        wrapMode: Text.Wrap
                        horizontalAlignment: Text.AlignHCenter
                    }
                }
            }
        }
    }

    Popup {
        id: overlayDrawerHost
        objectName: "overlayDrawerHost"
        parent: Overlay.overlay
        x: parent ? parent.width - width : 0
        y: 0
        width: Theme.drawerWidth
        height: parent ? parent.height : root.height
        padding: 0
        modal: true
        dim: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

        Overlay.modal: Rectangle {
            color: Theme.scrim
        }

        background: Rectangle {
            color: Theme.surface
            border.color: Theme.border
            border.width: Theme.borderWidth
        }

        contentItem: Item {
            Label {
                anchors.centerIn: parent
                width: parent.width - Theme.space8 * 2
                text: qsTr("Task details")
                color: Theme.ink
                font.pixelSize: Theme.sectionFontPixelSize
                font.weight: Theme.sectionFontWeight
                horizontalAlignment: Text.AlignHCenter
            }
        }
    }

    Label {
        id: statusToast
        objectName: "statusToast"
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: Theme.space5
        z: 10
        visible: text.length > 0
        padding: Theme.space3
        color: Theme.sidebarText
        font.pixelSize: Theme.labelFontPixelSize
        font.weight: Theme.labelFontWeight

        background: Rectangle {
            color: Theme.sidebarActive
            radius: Theme.controlRadius
            border.color: Theme.borderStrong
            border.width: Theme.borderWidth
        }
    }

    Timer {
        id: statusTimer
        interval: 2400
        onTriggered: statusToast.text = ""
    }
}
