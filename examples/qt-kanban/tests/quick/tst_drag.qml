import QtQuick
import QtTest
import Northstar.Kanban

TestCase {
    id: testCase
    name: "BoardDrag"
    when: windowShown
    width: 1300
    height: 700
    visible: true

    Component {
        id: viewComponent

        KanbanView {
            width: 1300
            height: 700
        }
    }

    Component {
        id: spyComponent

        SignalSpy {}
    }

    function init() {
        TaskStore.reset()
    }

    function test_pointer_drag_moves_task_between_columns() {
        const view = createTemporaryObject(viewComponent, testCase)
        verify(view)
        waitForRendering(view)

        const board = findChild(view, "boardView")
        const card = findChild(view, "taskCard-task-define-goals")
        const interaction = findChild(card, "cardInteraction")
        const readySurface = findChild(view, "dropArea-ready")
        verify(board)
        verify(card)
        verify(interaction)
        verify(readySurface)
        const dropSpy = createTemporaryObject(spyComponent, testCase, {
            "target": readySurface,
            "signalName": "dropped"
        })
        verify(dropSpy)

        const selectedBefore = TaskStore.selectedTaskId
        const backlogBefore = TaskStore.countForColumn("backlog")
        const readyBefore = TaskStore.countForColumn("ready")
        const start = interaction.mapToItem(testCase,
                                            interaction.width / 2,
                                            interaction.height / 2)
        const destination = readySurface.mapToItem(testCase,
                                                   readySurface.width / 2,
                                                   readySurface.height - 48)

        mousePress(testCase, start.x, start.y, Qt.LeftButton)
        mouseMove(testCase, start.x + 24, start.y, 50, Qt.LeftButton)
        tryCompare(board, "dragActive", true)
        compare(board.interactive, false)
        mouseMove(testCase, destination.x, destination.y, 100,
                  Qt.LeftButton)
        tryCompare(readySurface, "containsDrag", true)
        mouseRelease(testCase, destination.x, destination.y, Qt.LeftButton)

        tryCompare(dropSpy, "count", 1)
        tryCompare(TaskStore.taskById("task-define-goals"), "columnId",
                   "ready")
        compare(TaskStore.countForColumn("backlog"), backlogBefore - 1)
        compare(TaskStore.countForColumn("ready"), readyBefore + 1)
        compare(TaskStore.selectedTaskId, selectedBefore)
        tryCompare(board, "dragActive", false)
        compare(board.interactive, true)
    }
}
