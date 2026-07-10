pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls

Flickable {
    id: root

    readonly property int columnCount: 4
    readonly property real columnWidth: Math.max(
                                            Theme.columnMinimumWidth,
                                            Math.min(Theme.columnMaximumWidth,
                                                     (width - (columnCount - 1)
                                                      * Theme.boardGutter) / columnCount))
    readonly property real boardContentWidth: columnCount * columnWidth
                                              + (columnCount - 1) * Theme.boardGutter
    readonly property var columnDefinitions: [
        { "key": "backlog", "title": qsTr("Backlog"), "accent": Theme.borderStrong },
        { "key": "ready", "title": qsTr("Ready"), "accent": Theme.cobalt },
        { "key": "inProgress", "title": qsTr("In progress"), "accent": Theme.coral },
        { "key": "review", "title": qsTr("Review"), "accent": Theme.green }
    ]

    clip: true
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

            delegate: Rectangle {
                id: columnPlaceholder

                required property var modelData

                width: root.columnWidth
                height: root.height
                color: Theme.canvas

                Rectangle {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    height: Theme.space1
                    color: columnPlaceholder.modelData.accent
                }

                Row {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    anchors.topMargin: Theme.space5
                    spacing: Theme.space2

                    Label {
                        text: columnPlaceholder.modelData.title
                        color: Theme.ink
                        font.pixelSize: Theme.sectionFontPixelSize
                        font.weight: Theme.sectionFontWeight
                    }

                    Label {
                        readonly property int storeRevision: TaskStore.revision

                        text: TaskStore.countForColumn(columnPlaceholder.modelData.key)
                        color: Theme.muted
                        font.pixelSize: Theme.labelFontPixelSize
                        font.weight: Theme.labelFontWeight
                    }
                }

                Rectangle {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    anchors.topMargin: 60
                    height: 88
                    color: Theme.surface
                    radius: Theme.cardRadius
                    border.color: Theme.border
                    border.width: Theme.borderWidth

                    Label {
                        anchors.centerIn: parent
                        width: parent.width - Theme.space6 * 2
                        text: qsTr("Task cards load in the next step")
                        color: Theme.muted
                        font.pixelSize: Theme.bodyFontPixelSize
                        wrapMode: Text.Wrap
                        horizontalAlignment: Text.AlignHCenter
                    }
                }
            }
        }
    }

    ScrollBar.horizontal: ScrollBar {
        policy: root.boardContentWidth > root.width
                ? ScrollBar.AlwaysOn : ScrollBar.AsNeeded
    }
}
