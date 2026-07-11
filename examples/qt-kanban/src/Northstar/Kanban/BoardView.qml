pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls

Flickable {
    id: root

    signal taskActivated(string taskId, Item invoker)
    signal addTaskRequested(string columnId, Item invoker)

    property bool rightToLeft: false
    property bool _viewportInitialized: false
    property bool _viewportUpdateScheduled: false
    property bool _trackingLogicalStart: true
    property bool _settingContentX: false
    property bool dragActive: false
    property string dragTaskId: ""
    property Item dragSource: null
    readonly property int columnCount: 4
    readonly property real columnWidth: Math.max(
                                            Theme.columnMinimumWidth,
                                            Math.min(Theme.columnMaximumWidth,
                                                     (width - (columnCount - 1)
                                                      * Theme.boardGutter) / columnCount))
    readonly property real boardContentWidth: columnCount * columnWidth
                                              + (columnCount - 1) * Theme.boardGutter
    readonly property int storeRevision: TaskStore.revision
    readonly property string filterSignature: TaskStore.query + "\u001f"
                                              + TaskStore.priorityFilter + "\u001f"
                                              + storeRevision
    readonly property int visibleTaskCount: {
        const ignoredSignature = filterSignature
        let count = 0
        for (const definition of columnDefinitions)
            count += TaskStore.visibleInColumn(definition.key).length
        return count
    }
    readonly property var columnDefinitions: [
        { "key": "backlog", "title": qsTr("Backlog"), "accent": Theme.borderStrong },
        { "key": "ready", "title": qsTr("Ready"), "accent": Theme.cobalt },
        { "key": "inProgress", "title": qsTr("In progress"), "accent": Theme.coral },
        { "key": "review", "title": qsTr("Review"), "accent": Theme.green }
    ]

    LayoutMirroring.enabled: rightToLeft
    LayoutMirroring.childrenInherit: true

    function scheduleViewportUpdate() {
        if (_viewportUpdateScheduled)
            return
        _viewportUpdateScheduled = true
        Qt.callLater(function() {
            root._viewportUpdateScheduled = false
            root.updateViewportForGeometry()
        })
    }

    function logicalStartForGeometry() {
        return rightToLeft ? Math.max(0, contentWidth - width) : 0
    }

    function updateViewportForGeometry() {
        if (width <= 0 || contentWidth <= 0)
            return

        const shouldFollow = !_viewportInitialized || _trackingLogicalStart
        const nextLogicalStart = logicalStartForGeometry()
        _viewportInitialized = true
        if (!shouldFollow)
            return

        _settingContentX = true
        contentX = nextLogicalStart
        _settingContentX = false
        _trackingLogicalStart = true
    }

    onRightToLeftChanged: {
        _trackingLogicalStart = true
        scheduleViewportUpdate()
    }
    onWidthChanged: scheduleViewportUpdate()
    onContentWidthChanged: scheduleViewportUpdate()
    onContentXChanged: {
        if (!_viewportInitialized || _settingContentX) {
            return
        }
        _trackingLogicalStart = Math.abs(contentX
                                         - logicalStartForGeometry()) < 0.5
    }
    Component.onCompleted: scheduleViewportUpdate()

    function positionDragVisual(scenePosition) {
        const localPosition = dragOverlay.mapFromItem(null, scenePosition.x,
                                                      scenePosition.y)
        dragVisual.x = localPosition.x - dragVisual.width / 2
        dragVisual.y = localPosition.y - dragVisual.height / 2
    }

    function beginDrag(taskId, sourceItem, scenePosition) {
        if (!taskId || !sourceItem)
            return

        dragTaskId = taskId
        dragSource = sourceItem
        dragVisual.taskId = taskId
        dragVisual.taskTitle = TaskStore.taskById(taskId).title
        dragVisual.width = sourceItem.width
        dragVisual.height = sourceItem.height
        positionDragVisual(scenePosition)
        dragActive = true
    }

    function updateDrag(scenePosition) {
        if (dragActive)
            positionDragVisual(scenePosition)
    }

    function settleDrag(finishedTaskId) {
        dragActive = false
        Qt.callLater(function() {
            if (!root.dragActive && root.dragTaskId === finishedTaskId) {
                root.dragTaskId = ""
                root.dragSource = null
                dragVisual.taskId = ""
                dragVisual.taskTitle = ""
            }
        })
    }

    function finishDrag() {
        if (!dragActive)
            return

        const finishedTaskId = dragTaskId
        dragVisual.drop()
        settleDrag(finishedTaskId)
    }

    function cancelDrag() {
        if (!dragActive)
            return

        const canceledTaskId = dragTaskId
        dragVisual.cancel()
        settleDrag(canceledTaskId)
    }

    clip: true
    interactive: !dragActive
    contentWidth: Math.max(width, boardContentWidth)
    contentHeight: height
    flickableDirection: Flickable.HorizontalFlick
    boundsBehavior: Flickable.StopAtBounds
    pixelAligned: true

    Rectangle {
        width: root.contentWidth
        height: root.height
        color: Theme.canvas
    }

    Row {
        width: root.boardContentWidth
        height: root.height
        spacing: Theme.boardGutter

        Repeater {
            model: root.columnDefinitions

            delegate: KanbanColumn {
                id: kanbanColumn

                required property var modelData

                width: root.columnWidth
                height: root.height
                columnId: modelData.key
                title: modelData.title
                accent: modelData.accent
                dragCoordinator: root
                onTaskActivated: (taskId, invoker) =>
                                 root.taskActivated(taskId, invoker)
                onAddTaskRequested: (columnId, invoker) =>
                                    root.addTaskRequested(columnId, invoker)
            }
        }
    }

    Rectangle {
        id: emptyBoardState
        objectName: "emptyBoardState"
        anchors.centerIn: parent
        z: 4
        visible: root.visibleTaskCount === 0
        width: Math.min(360, root.width - Theme.space8 * 2)
        implicitHeight: emptyContent.implicitHeight + Theme.space6 * 2
        color: Theme.surface
        radius: Theme.panelRadius
        border.color: Theme.borderStrong
        border.width: Theme.borderWidth

        Column {
            id: emptyContent
            anchors.centerIn: parent
            width: parent.width - Theme.space6 * 2
            spacing: Theme.space3

            Label {
                width: parent.width
                text: qsTr("No tasks match these filters")
                color: Theme.ink
                font.pixelSize: Theme.sectionFontPixelSize
                font.weight: Theme.sectionFontWeight
                horizontalAlignment: Text.AlignHCenter
                wrapMode: Text.Wrap
            }

            Label {
                width: parent.width
                text: qsTr("Clear search and priority to restore the board.")
                color: Theme.muted
                font.pixelSize: Theme.bodyFontPixelSize
                horizontalAlignment: Text.AlignHCenter
                wrapMode: Text.Wrap
            }

            Button {
                id: clearFiltersButton
                objectName: "clearBoardFiltersButton"
                anchors.horizontalCenter: parent.horizontalCenter
                text: qsTr("Clear filters")
                Accessible.name: text
                onClicked: {
                    TaskStore.query = ""
                    TaskStore.priorityFilter = "all"
                }

                background: Rectangle {
                    color: clearFiltersButton.down ? Theme.pressed
                           : clearFiltersButton.hovered ? Theme.hover : Theme.cobaltSoft
                    radius: Theme.controlRadius
                    border.color: clearFiltersButton.visualFocus ? Theme.focus : Theme.cobalt
                    border.width: clearFiltersButton.visualFocus ? 2 : Theme.borderWidth
                }
            }
        }
    }

    Item {
        id: dragOverlay
        objectName: "dragOverlay"
        parent: root
        x: 0
        y: 0
        width: root.width
        height: root.height
        z: 20

        DragTaskVisual {
            id: dragVisual
            objectName: "dragTaskVisual"
            active: root.dragActive
        }
    }

    ScrollBar.horizontal: ScrollBar {
        policy: root.boardContentWidth > root.width
                ? ScrollBar.AlwaysOn : ScrollBar.AsNeeded
    }
}
