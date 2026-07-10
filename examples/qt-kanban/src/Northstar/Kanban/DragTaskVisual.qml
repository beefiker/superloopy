import QtQuick
import QtQuick.Controls

Rectangle {
    id: root

    property string taskId: ""
    property string taskTitle: ""
    property bool active: false

    function drop() {
        return Drag.drop()
    }

    visible: active
    color: Theme.surface
    opacity: 0.92
    radius: Theme.cardRadius
    border.color: Theme.cobalt
    border.width: 2
    Accessible.ignored: true

    Drag.active: active
    Drag.source: root
    Drag.keys: ["northstar-task"]
    Drag.supportedActions: Qt.MoveAction
    Drag.proposedAction: Qt.MoveAction
    Drag.hotSpot.x: width / 2
    Drag.hotSpot.y: height / 2

    Label {
        anchors.fill: parent
        anchors.margins: Theme.cardPadding
        text: root.taskTitle
        color: Theme.ink
        font.pixelSize: Theme.cardTitleFontPixelSize
        font.weight: Theme.cardTitleFontWeight
        wrapMode: Text.Wrap
        elide: Text.ElideRight
        verticalAlignment: Text.AlignVCenter
    }
}
