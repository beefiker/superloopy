pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    objectName: "kanbanView"

    property bool rightToLeft: Qt.locale().textDirection === Qt.RightToLeft
    readonly property int sidebarWidth: width < Theme.compactSidebarBreakpoint
                                        ? Theme.sidebarCompact : Theme.sidebarWide
    readonly property bool drawerPersistent: width >= Theme.persistentDrawerBreakpoint
    readonly property bool drawerOverlay: !drawerPersistent
    readonly property real boardContentWidth: boardView.boardContentWidth

    LayoutMirroring.enabled: rightToLeft
    LayoutMirroring.childrenInherit: true

    function showStatus(message) {
        statusToast.text = message
        statusTimer.restart()
    }

    function restoreFocus(item) {
        if (!item)
            return
        Qt.callLater(function() {
            item.forceActiveFocus(Qt.TabFocusReason)
        })
    }

    function openDetailsFrom(invoker) {
        if (drawerPersistent || TaskStore.selectedTaskId.length === 0)
            return
        overlayDetailDrawer.openFrom(invoker)
    }

    function openNewTask(columnId, invoker) {
        newTaskDialog.initialColumnId = columnId
        newTaskDialog.openFrom(invoker)
    }

    onDrawerPersistentChanged: {
        if (drawerPersistent && overlayDetailDrawer.opened)
            overlayDetailDrawer.close()
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
                onNewTaskRequested: invoker =>
                                    root.openNewTask("backlog", invoker)
            }

            BoardView {
                id: boardView
                objectName: "boardView"
                rightToLeft: root.rightToLeft
                Layout.fillWidth: true
                Layout.fillHeight: true
                onTaskActivated: (taskId, invoker) => {
                    if (TaskStore.selectedTaskId === taskId)
                        root.openDetailsFrom(invoker)
                }
                onAddTaskRequested: (columnId, invoker) =>
                                    root.openNewTask(columnId, invoker)
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

            DetailDrawer {
                id: persistentDetailDrawer
                objectName: "persistentDetailDrawer"
                anchors.fill: parent
                closeVisible: true
                onCloseRequested: TaskStore.clearSelection()
            }
        }
    }

    Drawer {
        id: overlayDetailDrawer
        objectName: "overlayDetailDrawer"
        property Item invokingItem: null

        parent: Overlay.overlay
        edge: Qt.RightEdge
        width: Theme.drawerWidth
        height: parent ? parent.height : root.height
        padding: 0
        modal: true
        dim: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

        enter: Transition {
            NumberAnimation {
                property: "position"
                from: 0
                to: 1
                duration: Theme.transitionDuration
                easing.type: Easing.OutCubic
            }
        }

        exit: Transition {
            NumberAnimation {
                property: "position"
                from: 1
                to: 0
                duration: Theme.transitionDuration
                easing.type: Easing.OutCubic
            }
        }

        function openFrom(invoker) {
            invokingItem = invoker
            open()
        }

        onOpened: overlayDetailContent.focusFirst()
        onClosed: {
            const item = invokingItem
            invokingItem = null
            root.restoreFocus(item)
        }

        Overlay.modal: Rectangle {
            color: Theme.scrim
        }

        background: Rectangle {
            color: Theme.surface
            border.color: Theme.border
            border.width: Theme.borderWidth
        }

        contentItem: DetailDrawer {
            id: overlayDetailContent
            objectName: "overlayDetailContent"
            closeVisible: true
            trapFocus: true
            onCloseRequested: overlayDetailDrawer.close()
        }
    }

    NewTaskDialog {
        id: newTaskDialog
    }

    Shortcut {
        sequence: "Ctrl+Shift+Left"
        enabled: TaskStore.selectedTaskId.length > 0 && !newTaskDialog.opened
        onActivated: TaskStore.moveSelectedAdjacent(-1)
    }

    Shortcut {
        sequence: "Ctrl+Shift+Right"
        enabled: TaskStore.selectedTaskId.length > 0 && !newTaskDialog.opened
        onActivated: TaskStore.moveSelectedAdjacent(1)
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
