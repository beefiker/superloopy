pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Control {
    id: root

    property bool compact: false
    readonly property real compactLabelLineWidth:
        Theme.sidebarCompact - 2 * padding
    readonly property bool requiresWideLayout:
        timelineCompactTitleProbe.lineCount > 2
        || timelineCompactStatusProbe.lineCount > 2
        || inboxCompactTitleProbe.lineCount > 2
        || inboxCompactStatusProbe.lineCount > 2

    signal boardRequested(Item invoker)

    function focusBoard() {
        boardButton.forceActiveFocus(Qt.TabFocusReason)
        return boardButton.activeFocus
    }

    padding: Theme.space3

    background: Rectangle {
        color: Theme.sidebar
    }

    Text {
        id: timelineCompactTitleProbe
        visible: false
        width: root.compactLabelLineWidth
        font.pixelSize: Theme.metaFontPixelSize
        font.weight: Theme.sectionFontWeight
        wrapMode: Text.Wrap
        text: timelineDemoItem.title
        Accessible.ignored: true
    }

    Text {
        id: timelineCompactStatusProbe
        visible: false
        width: root.compactLabelLineWidth
        font.pixelSize: Theme.metaFontPixelSize
        font.weight: Theme.metaFontWeight
        wrapMode: Text.Wrap
        text: timelineDemoItem.demoOnlyLabel
        Accessible.ignored: true
    }

    Text {
        id: inboxCompactTitleProbe
        visible: false
        width: root.compactLabelLineWidth
        font.pixelSize: Theme.metaFontPixelSize
        font.weight: Theme.sectionFontWeight
        wrapMode: Text.Wrap
        text: inboxDemoItem.title
        Accessible.ignored: true
    }

    Text {
        id: inboxCompactStatusProbe
        visible: false
        width: root.compactLabelLineWidth
        font.pixelSize: Theme.metaFontPixelSize
        font.weight: Theme.metaFontWeight
        wrapMode: Text.Wrap
        text: inboxDemoItem.demoOnlyLabel
        Accessible.ignored: true
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
                                   : action.down ? Theme.sidebarPressed
                                   : action.hovered ? Theme.sidebarHover
                                   : Theme.clear
            border.color: action.visualFocus ? Theme.sidebarFocus : Theme.clear
            border.width: action.visualFocus ? 2 : 0
        }
    }

    component PassiveDemoItem: Item {
        id: demoItem

        required property string title
        required property url iconSource
        required property string compactObjectPrefix
        property string demoOnlyLabel: qsTr("Demo only")
        readonly property string accessibleLabel: qsTr("%1 — %2")
                                                  .arg(title)
                                                  .arg(demoOnlyLabel)

        implicitWidth: root.compact ? 48 : wideContent.implicitWidth + 2 * Theme.space3
        implicitHeight: root.compact
                        ? Math.max(48, compactContent.implicitHeight
                                       + 2 * Theme.space1)
                        : Math.max(42, wideContent.implicitHeight
                                       + 2 * Theme.space1)
        Layout.minimumWidth: 0
        activeFocusOnTab: false
        Accessible.role: Accessible.StaticText
        Accessible.name: accessibleLabel

        RowLayout {
            id: wideContent

            anchors.fill: parent
            anchors.leftMargin: Theme.space3
            anchors.rightMargin: Theme.space3
            anchors.topMargin: Theme.space1
            anchors.bottomMargin: Theme.space1
            visible: !root.compact
            spacing: Theme.space3

            Image {
                Layout.preferredWidth: 20
                Layout.preferredHeight: 20
                source: demoItem.iconSource
                sourceSize.width: 20
                sourceSize.height: 20
                opacity: 0.72
                Accessible.ignored: true
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 0

                Label {
                    objectName: demoItem.compactObjectPrefix + "WideTitle"
                    Layout.fillWidth: true
                    text: demoItem.title
                    color: Theme.sidebarText
                    font.pixelSize: Theme.bodyFontPixelSize
                    font.weight: Theme.bodyFontWeight
                    wrapMode: Text.Wrap
                    Accessible.ignored: true
                }

                Label {
                    objectName: demoItem.compactObjectPrefix + "WideStatus"
                    Layout.fillWidth: true
                    text: demoItem.demoOnlyLabel
                    color: Theme.sidebarMutedText
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.metaFontWeight
                    wrapMode: Text.Wrap
                    Accessible.ignored: true
                }
            }
        }

        ColumnLayout {
            id: compactContent
            anchors.fill: parent
            anchors.topMargin: Theme.space1
            anchors.bottomMargin: Theme.space1
            visible: root.compact
            spacing: 0

            Image {
                Layout.alignment: Qt.AlignHCenter
                Layout.preferredWidth: 16
                Layout.preferredHeight: 16
                source: demoItem.iconSource
                sourceSize.width: 16
                sourceSize.height: 16
                opacity: 0.72
                Accessible.ignored: true
            }

            Text {
                objectName: demoItem.compactObjectPrefix + "CompactTitle"
                Layout.fillWidth: true
                text: demoItem.title
                color: Theme.sidebarText
                font.pixelSize: Theme.metaFontPixelSize
                font.weight: Theme.sectionFontWeight
                wrapMode: Text.Wrap
                horizontalAlignment: Text.AlignHCenter
                Accessible.ignored: true
            }

            Text {
                objectName: demoItem.compactObjectPrefix + "CompactStatus"
                Layout.fillWidth: true
                text: demoItem.demoOnlyLabel
                color: Theme.sidebarMutedText
                font.pixelSize: Theme.metaFontPixelSize
                font.weight: Theme.metaFontWeight
                wrapMode: Text.Wrap
                horizontalAlignment: Text.AlignHCenter
                Accessible.ignored: true
            }
        }
    }

    contentItem: ColumnLayout {
        spacing: Theme.space2

        RowLayout {
            Layout.fillWidth: true
            Layout.bottomMargin: Theme.space4
            spacing: Theme.space3

            Rectangle {
                objectName: "workspaceMark"
                Layout.preferredWidth: 38
                Layout.preferredHeight: 38
                radius: Theme.controlRadius
                color: Theme.cobalt
                Accessible.ignored: true

                Label {
                    objectName: "workspaceInitial"
                    anchors.centerIn: parent
                    text: "N"
                    color: Theme.cobaltContent
                    font.pixelSize: Theme.sectionFontPixelSize
                    font.weight: Theme.sectionFontWeight
                    Accessible.ignored: true
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
                    color: Theme.sidebarMutedText
                    font.pixelSize: Theme.metaFontPixelSize
                    font.weight: Theme.metaFontWeight
                }
            }
        }

        SidebarAction {
            id: boardButton
            objectName: "boardButton"
            Layout.fillWidth: true
            text: qsTr("Board")
            icon.source: Qt.resolvedUrl("assets/icons/board.svg")
            selected: true
            onClicked: root.boardRequested(boardButton)
        }

        PassiveDemoItem {
            id: timelineDemoItem
            objectName: "timelineDemoItem"
            Layout.fillWidth: true
            title: qsTr("Timeline")
            iconSource: Qt.resolvedUrl("assets/icons/timeline.svg")
            compactObjectPrefix: "timeline"
        }

        PassiveDemoItem {
            id: inboxDemoItem
            objectName: "inboxDemoItem"
            Layout.fillWidth: true
            title: qsTr("Inbox")
            iconSource: Qt.resolvedUrl("assets/icons/inbox.svg")
            compactObjectPrefix: "inbox"
        }

        Item {
            Layout.fillHeight: true
        }

        Label {
            visible: !root.compact
            Layout.leftMargin: Theme.space3
            text: qsTr("TEAM")
            color: Theme.sidebarSectionText
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

                    objectName: "teamAvatar-" + index
                    Layout.preferredWidth: root.compact ? 22 : 30
                    Layout.preferredHeight: root.compact ? 22 : 30
                    radius: width / 2
                    color: index === 0 ? Theme.avatarBlue
                                       : index === 1 ? Theme.avatarSlate
                                                     : Theme.avatarLavender
                    border.color: Theme.sidebar
                    border.width: 2
                    Accessible.ignored: true

                    Label {
                        objectName: "teamAvatarLabel-" + teamAvatar.index
                        anchors.centerIn: parent
                        text: teamAvatar.modelData
                        color: Theme.ink
                        font.pixelSize: Theme.metaFontPixelSize
                        font.weight: Theme.sectionFontWeight
                        Accessible.ignored: true
                    }
                }
            }
        }

    }
}
