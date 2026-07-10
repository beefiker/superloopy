import QtQuick
import QtQuick.Controls

ApplicationWindow {
    property int initialWidth: 1600
    property int initialHeight: 1000

    width: initialWidth
    height: initialHeight
    minimumWidth: 900
    minimumHeight: 640
    visible: true
    title: "Northstar"

    KanbanView {
        anchors.fill: parent
    }
}
