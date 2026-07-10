pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Dialog {
    id: root

    objectName: "newTaskDialog"
    property Item invokingItem: null
    property string initialColumnId: "backlog"
    property bool validationAttempted: false
    readonly property bool titleValid: titleField.text.trim().length > 0

    signal taskCreated(string taskId)

    parent: Overlay.overlay
    x: parent ? Math.round((parent.width - width) / 2) : 0
    y: parent ? Math.round((parent.height - height) / 2) : 0
    width: Math.min(440, parent ? parent.width - Theme.space6 * 2 : 440)
    modal: true
    dim: true
    focus: true
    padding: Theme.space6
    title: qsTr("New task")
    closePolicy: Popup.CloseOnEscape

    function openFrom(invoker) {
        invokingItem = invoker
        validationAttempted = false
        titleField.text = ""
        const requestedIndex = TaskStore.columnOrder.indexOf(initialColumnId)
        columnCombo.currentIndex = requestedIndex >= 0 ? requestedIndex : 0
        priorityCombo.currentIndex = 1
        open()
    }

    function submit() {
        validationAttempted = true
        if (!titleValid) {
            titleField.forceActiveFocus(Qt.TabFocusReason)
            return
        }

        const taskId = TaskStore.addTask(titleField.text,
                                         TaskStore.columnOrder[columnCombo.currentIndex],
                                         priorityCombo.currentText)
        if (taskId.length === 0)
            return

        taskCreated(taskId)
        accept()
    }

    onOpened: titleField.forceActiveFocus(Qt.TabFocusReason)
    onClosed: {
        const item = invokingItem
        invokingItem = null
        if (item) {
            Qt.callLater(function() {
                item.forceActiveFocus(Qt.TabFocusReason)
            })
        }
    }

    Overlay.modal: Rectangle {
        color: Theme.scrim
    }

    background: Rectangle {
        color: Theme.surface
        radius: Theme.panelRadius
        border.color: Theme.borderStrong
        border.width: Theme.borderWidth
    }

    header: Label {
        text: root.title
        color: Theme.ink
        font.pixelSize: Theme.sectionFontPixelSize
        font.weight: Theme.sectionFontWeight
        leftPadding: Theme.space6
        rightPadding: Theme.space6
        topPadding: Theme.space6
        bottomPadding: Theme.space2
    }

    contentItem: ColumnLayout {
        spacing: Theme.space4

        Label {
            text: qsTr("Title")
            color: Theme.muted
            font.pixelSize: Theme.metaFontPixelSize
            font.weight: Theme.labelFontWeight
        }

        TextField {
            id: titleField
            objectName: "newTaskTitleField"
            Layout.fillWidth: true
            placeholderText: qsTr("Task title")
            selectByMouse: true
            color: Theme.ink
            placeholderTextColor: Theme.muted
            font.pixelSize: Theme.bodyFontPixelSize
            Accessible.name: qsTr("Task title")
            focusPolicy: Qt.StrongFocus
            KeyNavigation.tab: columnCombo
            KeyNavigation.backtab: createButton
            Keys.onReturnPressed: event => {
                root.submit()
                event.accepted = true
            }
            Keys.onEnterPressed: event => {
                root.submit()
                event.accepted = true
            }

            background: Rectangle {
                color: Theme.surface
                radius: Theme.controlRadius
                border.color: titleField.activeFocus ? Theme.focus
                              : root.validationAttempted && !root.titleValid
                                ? Theme.coral : Theme.controlBorder
                border.width: titleField.activeFocus ? 2 : Theme.borderWidth
            }
        }

        Label {
            id: validationLabel
            objectName: "newTaskValidation"
            Layout.fillWidth: true
            visible: root.validationAttempted && !root.titleValid
            text: qsTr("Enter a task title")
            color: Theme.coralInk
            font.pixelSize: Theme.metaFontPixelSize
            font.weight: Theme.labelFontWeight
        }

        Label {
            text: qsTr("Column")
            color: Theme.muted
            font.pixelSize: Theme.metaFontPixelSize
            font.weight: Theme.labelFontWeight
        }

        ComboBox {
            id: columnCombo
            objectName: "newTaskColumn"
            Layout.fillWidth: true
            model: [qsTr("Backlog"), qsTr("Ready"),
                    qsTr("In progress"), qsTr("Review")]
            Accessible.name: qsTr("Task column")
            focusPolicy: Qt.StrongFocus
            KeyNavigation.tab: priorityCombo
            KeyNavigation.backtab: titleField

            background: Rectangle {
                color: Theme.surface
                radius: Theme.controlRadius
                border.color: columnCombo.visualFocus ? Theme.focus
                              : Theme.controlBorder
                border.width: columnCombo.visualFocus ? 2 : Theme.borderWidth
            }
        }

        Label {
            text: qsTr("Priority")
            color: Theme.muted
            font.pixelSize: Theme.metaFontPixelSize
            font.weight: Theme.labelFontWeight
        }

        ComboBox {
            id: priorityCombo
            objectName: "newTaskPriority"
            Layout.fillWidth: true
            model: [qsTr("Low"), qsTr("Medium"), qsTr("High")]
            currentIndex: 1
            Accessible.name: qsTr("Task priority")
            focusPolicy: Qt.StrongFocus
            KeyNavigation.tab: cancelButton
            KeyNavigation.backtab: columnCombo

            background: Rectangle {
                color: Theme.surface
                radius: Theme.controlRadius
                border.color: priorityCombo.visualFocus ? Theme.focus
                              : Theme.controlBorder
                border.width: priorityCombo.visualFocus ? 2 : Theme.borderWidth
            }
        }
    }

    footer: DialogButtonBox {
        leftPadding: Theme.space6
        rightPadding: Theme.space6
        topPadding: Theme.space3
        bottomPadding: Theme.space6
        spacing: Theme.space2

        background: Rectangle {
            color: Theme.surface
        }

        Button {
            id: cancelButton
            objectName: "newTaskCancelButton"
            text: qsTr("Cancel")
            Accessible.name: text
            focusPolicy: Qt.StrongFocus
            DialogButtonBox.buttonRole: DialogButtonBox.RejectRole
            onClicked: root.reject()
            KeyNavigation.tab: createButton
            KeyNavigation.backtab: priorityCombo

            background: Rectangle {
                color: cancelButton.down ? Theme.pressed
                       : cancelButton.hovered ? Theme.hover : Theme.surface
                radius: Theme.controlRadius
                border.color: cancelButton.visualFocus ? Theme.focus
                              : Theme.controlBorder
                border.width: cancelButton.visualFocus ? 2 : Theme.borderWidth
            }
        }

        Button {
            id: createButton
            objectName: "newTaskCreateButton"
            text: qsTr("Create")
            enabled: root.titleValid
            highlighted: true
            Accessible.name: text
            focusPolicy: Qt.StrongFocus
            DialogButtonBox.buttonRole: DialogButtonBox.AcceptRole
            onClicked: root.submit()
            KeyNavigation.tab: titleField
            KeyNavigation.backtab: cancelButton

            background: Rectangle {
                color: !createButton.enabled ? Theme.disabledSurface
                       : createButton.down ? Theme.focus
                       : createButton.hovered ? "#2F6FF0" : Theme.cobalt
                radius: Theme.controlRadius
                border.color: createButton.visualFocus ? Theme.focus : "transparent"
                border.width: createButton.visualFocus ? 2 : 0
            }

            contentItem: Label {
                text: createButton.text
                color: createButton.enabled ? Theme.cobaltContent : Theme.disabledInk
                font: createButton.font
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }
    }
}
